import "dotenv/config";
import { randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import { once } from "node:events";
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PostgresInvestigationQueue, IdempotencyConflictError, LeaseLostError, type ExecutionLease } from "../../src/server/queue";
import { createQueueTestDatabase } from "../support/database";
import { emptyCompletion } from "../fixtures/empty-completion";
import { createDatabaseClient } from "../../src/server/storage/client";
import { classifyFailure } from "../../src/server/queue/errors";

let database: Awaited<ReturnType<typeof createQueueTestDatabase>>;
let queue: PostgresInvestigationQueue;
let otherQueue: PostgresInvestigationQueue;
const retryError = { code: "PROVIDER_FAILED" as const, message: "Test-only transient provider failure", retryable: true };
beforeAll(async () => { database = await createQueueTestDatabase(); });
afterAll(async () => { await database?.close(); });
beforeEach(async () => {
  // Per-test isolated rows; TRUNCATE does not mutate immutable snapshot rows and is test-only.
  await database.pool.query('TRUNCATE "Job", "ExecutionAttempt", "Investigation", "EvidenceSnapshot", "Answer", "Advice" CASCADE');
  const options = { leaseMs: 2000, attemptTimeoutMs: 10000, retryBaseMs: 500, retryMaxMs: 1000, maxAttempts: 2 };
  queue = new PostgresInvestigationQueue(database.db, options);
  otherQueue = new PostgresInvestigationQueue(database.competitor, options);
});

async function enqueue(question = "Queue test only") { return queue.enqueue({ question, idempotencyKey: randomUUID() }); }
async function lease(workerId = "test-worker") {
  const value = await queue.claim(workerId);
  expect(value).not.toBeNull();
  return value!;
}
async function expire(id: string) {
  await database.pool.query('UPDATE "Job" SET "leaseExpiresAt" = clock_timestamp() - interval \'1 second\' WHERE "id" = $1', [id]);
}
async function ready(id: string) {
  await database.pool.query('UPDATE "Job" SET "availableAt" = clock_timestamp() - interval \'1 second\' WHERE "id" = $1', [id]);
}

describe("PostgreSQL reliable queue", () => {
  it("allows only one of two workers to claim the same job", async () => {
    const created = await enqueue();
    const results = await Promise.all([queue.claim("worker-a"), otherQueue.claim("worker-b")]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.find(Boolean)?.jobId).toBe(created.jobId);
    expect(await database.db.executionAttempt.count()).toBe(1);
  });

  it("skips a row locked by a competitor and claims the next job", async () => {
    const first = await enqueue("First test job");
    const second = await enqueue("Second test job");
    const client = await database.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query('SELECT "id" FROM "Job" WHERE "id" = $1 FOR UPDATE', [first.jobId]);
      expect((await otherQueue.claim("worker-b"))?.jobId).toBe(second.jobId);
    } finally { await client.query("ROLLBACK"); client.release(); }
  });

  it("atomically deduplicates concurrent submissions without orphan investigations", async () => {
    const request = { question: "Same test request", idempotencyKey: randomUUID() };
    const results = await Promise.all(Array.from({ length: 6 }, (_, index) => (index % 2 ? queue : otherQueue).enqueue(request)));
    expect(new Set(results.map((item) => item.jobId)).size).toBe(1);
    expect(results.filter((item) => !item.reused)).toHaveLength(1);
    expect(await database.db.job.count()).toBe(1);
    expect(await database.db.investigation.count()).toBe(1);
    expect((await queue.enqueue({ ...request, question: ` ${request.question} ` })).reused).toBe(true);
  });

  it("rejects a reused idempotency key with different parameters", async () => {
    const key = randomUUID();
    await queue.enqueue({ question: "First request", idempotencyKey: key });
    await expect(otherQueue.enqueue({ question: "Different request", idempotencyKey: key })).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(await database.db.investigation.count()).toBe(1);
  });

  it("renews leases using database time and records actual stages", async () => {
    await enqueue();
    const current = await lease();
    const clock = vi.spyOn(Date, "now").mockReturnValue(0);
    try {
      const renewed = await queue.heartbeat({ ...current, expiresAt: new Date(0) });
      const row = (await database.pool.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!;
      expect(renewed.expiresAt.getTime()).toBeGreaterThan(row.now.getTime());
      await queue.advanceStage(current, "RETRIEVAL");
    } finally { clock.mockRestore(); }
    expect((await database.db.executionAttempt.findUniqueOrThrow({ where: { id: current.attemptId } })).stage).toBe("RETRIEVAL");
    expect((await database.db.investigation.findUniqueOrThrow({ where: { id: current.investigationId } })).stage).toBe("RETRIEVAL");
  });

  it("rejects an expired lease before recovery and allows recovery under a new token", async () => {
    await enqueue();
    const old = await lease();
    await expire(old.jobId);
    await expect(queue.heartbeat(old)).rejects.toBeInstanceOf(LeaseLostError);
    await expect(queue.complete(old, emptyCompletion(old.investigationId))).rejects.toBeInstanceOf(LeaseLostError);
    expect(await queue.recoverExpired()).toBe(1);
    await ready(old.jobId);
    const replacement = await otherQueue.claim("replacement");
    expect(replacement?.executionToken).not.toBe(old.executionToken);
    expect(replacement?.jobId).toBe(old.jobId);
    await expect(queue.advanceStage(old, "ANSWER")).rejects.toBeInstanceOf(LeaseLostError);
    await expect(queue.fail(old, retryError)).rejects.toBeInstanceOf(LeaseLostError);
    await expect(queue.complete(old, emptyCompletion(old.investigationId))).rejects.toBeInstanceOf(LeaseLostError);
    expect((await database.db.executionAttempt.findUniqueOrThrow({ where: { id: old.attemptId } })).status).toBe("LEASE_EXPIRED");
  });

  it("recovers a job after an actual child worker process is killed", async () => {
    const created = await enqueue();
    const child = fork("tests/support/crashing-worker.ts", [], { execArgv: ["--import", "tsx"], env: { ...process.env, TEST_DATABASE_URL: database.connectionString }, stdio: ["ignore", "ignore", "pipe", "ipc"] });
    let old: ExecutionLease;
    try {
      const message = await Promise.race([
        once(child, "message").then(([payload]) => payload as { lease: ExecutionLease }),
        once(child, "exit").then(([code]) => { throw new Error(`Crash fixture exited before claiming: ${String(code)}`); })
      ]);
      old = message.lease;
      expect(old.jobId).toBe(created.jobId);
      const exited = once(child, "exit");
      child.kill("SIGKILL");
      await exited;
    } finally { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); }
    await database.pool.query("SELECT pg_sleep(0.2)");
    expect(await queue.recoverExpired()).toBe(1);
    await ready(created.jobId);
    const recovered = await lease("surviving-worker");
    expect(recovered.executionToken).not.toBe(old!.executionToken);
    expect((await database.db.job.findUniqueOrThrow({ where: { id: created.jobId } })).attemptCount).toBe(2);
  });

  it("backs off retryable failures and stops at the configured failure budget", async () => {
    await enqueue();
    const first = await lease();
    expect(await queue.fail(first, retryError)).toEqual({ status: "PENDING", failureCount: 1 });
    expect(await queue.claim("too-early")).toBeNull();
    await ready(first.jobId);
    const second = await lease();
    expect(await queue.fail(second, retryError)).toEqual({ status: "FAILED", failureCount: 2 });
    expect(await queue.claim("past-limit")).toBeNull();
    const job = await database.db.job.findUniqueOrThrow({ where: { id: first.jobId } });
    expect(job.lastError).toEqual(retryError);
    expect(job.completedAt).not.toBeNull();
    expect(await database.db.executionAttempt.count({ where: { status: "FAILED" } })).toBe(2);
  });

  it("makes nonretryable configuration errors terminal immediately", async () => {
    await enqueue();
    const current = await lease();
    await queue.fail(current, { code: "PROVIDER_NOT_CONFIGURED", message: "Real provider is not configured", retryable: false });
    expect(await queue.claim("next-worker")).toBeNull();
    expect((await database.db.job.findUniqueOrThrow({ where: { id: current.jobId } })).status).toBe("FAILED");
  });

  it("parks confirmation tasks and resumes only after explicit validated confirmation", async () => {
    await enqueue();
    const current = await lease();
    const identity = { name: "TEST IDENTITY", officialWebsite: null, version: null, plan: null, confirmationStatus: "NEEDS_CONFIRMATION" as const, confirmationBasis: [] };
    await queue.awaitConfirmation(current, { identity, reason: "Test requires an explicit identity selection" });
    expect(await queue.recoverExpired()).toBe(0);
    expect(await queue.claim("ordinary-worker")).toBeNull();
    expect((await database.db.executionAttempt.findUniqueOrThrow({ where: { id: current.attemptId } })).status).toBe("AWAITING_CONFIRMATION");
    await expect(queue.confirmIdentity(current.investigationId, identity)).rejects.toThrow();
    const confirmed = { ...identity, officialWebsite: "https://example.com", confirmationStatus: "CONFIRMED", confirmationBasis: [{ url: "https://example.com", excerpt: "Test identity fixture only", retrievedAt: new Date().toISOString(), reason: "Test confirmation only" }] };
    expect((await queue.confirmIdentity(current.investigationId, confirmed)).reused).toBe(false);
    expect((await queue.confirmIdentity(current.investigationId, confirmed)).reused).toBe(true);
    const resumed = await lease("explicitly-resumed");
    expect((await queue.loadTask(resumed)).confirmedIdentity).toEqual(confirmed);
    expect((await database.db.job.findUniqueOrThrow({ where: { id: current.jobId } })).failureCount).toBe(0);
  });

  it("publishes snapshot, answer and terminal state once under concurrent duplicate completion", async () => {
    await enqueue();
    const current = await lease();
    const result = emptyCompletion(current.investigationId);
    const completed = await Promise.all([queue.complete(current, result), otherQueue.complete(current, result)]);
    expect(completed.filter((item) => !item.reused)).toHaveLength(1);
    expect(await database.db.evidenceSnapshot.count()).toBe(1);
    expect(await database.db.answer.count()).toBe(1);
    expect((await database.db.investigation.findUniqueOrThrow({ where: { id: current.investigationId } })).resultSnapshotId).toBe(result.snapshot.id);
    await expect(queue.complete(current, emptyCompletion(current.investigationId))).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(await database.db.evidenceSnapshot.count()).toBe(1);
  });

  it("rolls back snapshot insertion when answer validation fails", async () => {
    await enqueue();
    const current = await lease();
    const result = emptyCompletion(current.investigationId);
    result.answer.citations = [{ marker: "[1]", claimIds: [randomUUID()], evidenceIds: [randomUUID()] }];
    result.answer.body += " [1]";
    await expect(queue.complete(current, result)).rejects.toThrow("citation");
    expect(await database.db.evidenceSnapshot.count()).toBe(0);
    expect((await database.db.job.findUniqueOrThrow({ where: { id: current.jobId } })).status).toBe("RUNNING");
  });

  it("rolls back publication if the lease expires during snapshot/answer writes", async () => {
    await enqueue();
    const shortQueue = new PostgresInvestigationQueue(database.db, { leaseMs: 100, attemptTimeoutMs: 5000 });
    const current = (await shortQueue.claim("short-lease"))!;
    await database.pool.query(`CREATE FUNCTION slow_test_answer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.2); RETURN NEW; END; $$;
      CREATE TRIGGER slow_test_answer BEFORE INSERT ON "Answer" FOR EACH ROW EXECUTE FUNCTION slow_test_answer()`);
    try {
      await expect(shortQueue.complete(current, emptyCompletion(current.investigationId))).rejects.toBeInstanceOf(LeaseLostError);
      expect(await database.db.evidenceSnapshot.count()).toBe(0);
      expect(await database.db.answer.count()).toBe(0);
      expect((await database.db.investigation.findUniqueOrThrow({ where: { id: current.investigationId } })).status).toBe("RUNNING");
    } finally { await database.pool.query('DROP TRIGGER slow_test_answer ON "Answer"; DROP FUNCTION slow_test_answer()'); }
  });

  it("caps heartbeats at the database execution deadline", async () => {
    await enqueue();
    const current = await lease();
    await database.pool.query('UPDATE "Job" SET "runDeadlineAt" = clock_timestamp() + interval \'500 milliseconds\' WHERE "id" = $1', [current.jobId]);
    const renewed = await queue.heartbeat(current);
    const job = await database.db.job.findUniqueOrThrow({ where: { id: current.jobId } });
    expect(renewed.expiresAt.getTime()).toBe(job.runDeadlineAt!.getTime());
    await database.pool.query('UPDATE "Job" SET "runDeadlineAt" = clock_timestamp() - interval \'1 second\' WHERE "id" = $1', [current.jobId]);
    expect(await queue.recoverExpired()).toBe(1);
    expect((await database.db.job.findUniqueOrThrow({ where: { id: current.jobId } })).lastError).toMatchObject({ code: "TASK_TIMEOUT" });
  });

  it("rechecks database lease validity after waiting on a row lock", async () => {
    await enqueue();
    const shortQueue = new PostgresInvestigationQueue(database.db, { leaseMs: 150, attemptTimeoutMs: 5000 });
    const current = (await shortQueue.claim("waiting-heartbeat"))!;
    const client = await database.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query('SELECT "id" FROM "Job" WHERE "id" = $1 FOR UPDATE', [current.jobId]);
      const rejected = expect(shortQueue.heartbeat(current)).rejects.toBeInstanceOf(LeaseLostError);
      await client.query("SELECT pg_sleep(0.25)");
      await client.query("ROLLBACK");
      await rejected;
    } finally { await client.query("ROLLBACK"); client.release(); }
  });

  it("lets competing reapers count each expired execution only once", async () => {
    await enqueue();
    const current = await lease();
    await expire(current.jobId);
    const counts = await Promise.all([queue.recoverExpired(), otherQueue.recoverExpired()]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
    expect((await database.db.job.findUniqueOrThrow({ where: { id: current.jobId } })).failureCount).toBe(1);
    await ready(current.jobId);
    await lease("crashes-again");
    await expire(current.jobId);
    expect(await queue.recoverExpired()).toBe(1);
    expect((await database.db.job.findUniqueOrThrow({ where: { id: current.jobId } })).status).toBe("FAILED");
    expect(await queue.claim("past-crash-limit")).toBeNull();
  });

  it("recovers after the database terminates a Worker's active connection", async () => {
    await enqueue();
    const connectionUrl = new URL(database.connectionString);
    const applicationName = `disconnect_test_${randomUUID()}`;
    connectionUrl.searchParams.set("application_name", applicationName);
    const disconnectedDb = createDatabaseClient(connectionUrl.toString());
    const disconnectedQueue = new PostgresInvestigationQueue(disconnectedDb, { leaseMs: 2000, attemptTimeoutMs: 10000 });
    const current = (await disconnectedQueue.claim("disconnected-worker"))!;
    const locker = await database.pool.connect();
    try {
      await locker.query("BEGIN");
      await locker.query('SELECT "id" FROM "Job" WHERE "id" = $1 FOR UPDATE', [current.jobId]);
      const renewal = disconnectedQueue.heartbeat(current).then(() => null, (error: unknown) => error);
      let pid: number | undefined;
      for (let index = 0; index < 50 && pid === undefined; index++) {
        const result = await database.pool.query<{ pid: number }>("SELECT pid FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock'", [applicationName]);
        pid = result.rows[0]?.pid;
        if (pid === undefined) await database.pool.query("SELECT pg_sleep(0.01)");
      }
      expect(pid).toBeDefined();
      await database.pool.query("SELECT pg_terminate_backend($1)", [pid]);
      const error = await renewal;
      expect(error).not.toBeNull();
      expect(classifyFailure(error)).toMatchObject({ code: "STORAGE_FAILED", retryable: true });
      await locker.query("ROLLBACK");
      await expire(current.jobId);
      expect(await otherQueue.recoverExpired()).toBe(1);
      await ready(current.jobId);
      const replacement = (await otherQueue.claim("connected-replacement"))!;
      expect(replacement.jobId).toBe(current.jobId);
      expect(replacement.executionToken).not.toBe(current.executionToken);
      await expect(disconnectedQueue.complete(current, emptyCompletion(current.investigationId))).rejects.toBeInstanceOf(LeaseLostError);
    } finally {
      await locker.query("ROLLBACK");
      locker.release();
      await disconnectedDb.$disconnect();
    }
  });
});
