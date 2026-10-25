import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdviceRequestDetailSchema, type Advice } from "../../src/contracts";
import { AdviceRepository, InvestigationRepository, createDatabaseClient } from "../../src/server/storage";
import { AdviceExecutionLeaseSchema, type AdviceExecutionLease, type AdviceHandlerResult } from "../../src/server/queue/advice-contracts";
import { PostgresAdviceQueue } from "../../src/server/queue/advice-postgres";
import { IdempotencyConflictError, LeaseLostError, TaskFailure, classifyFailure } from "../../src/server/queue/errors";
import { AdviceWorkerRunner } from "../../src/worker/advice-runner";
import { adviceHandler, createAdviceHandler, type AdviceHandler } from "../../src/worker/advice-handler";
import { createRecommendationProvider } from "../../src/server/recommendation";
import type { ModelProvider, ModelRequest } from "../../src/server/models";
import { InvestigationHttpApi } from "../../src/server/http/api";
import { createQueueTestDatabase } from "../support/database";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";

let database: Awaited<ReturnType<typeof createQueueTestDatabase>>;
let queue: PostgresAdviceQueue;
let other: PostgresAdviceQueue;
const conditions = { useCase: "Synthetic advice lifecycle test", experience: null, budget: null, requirements: [] };
const retryError = { code: "PROVIDER_FAILED" as const, message: "Synthetic transient failure", retryable: true };
const silent = () => undefined;
beforeAll(async () => { database = await createQueueTestDatabase(); });
afterAll(async () => { await database?.close(); });
beforeEach(async () => {
  await database.pool.query('TRUNCATE "AdviceExecutionAttempt", "AdviceRequest", "Job", "ExecutionAttempt", "Investigation", "EvidenceSnapshot", "Answer", "Advice" CASCADE');
  queue = new PostgresAdviceQueue(database.db, { leaseMs: 2000, attemptTimeoutMs: 10000, retryBaseMs: 500, retryMaxMs: 1000 });
  other = new PostgresAdviceQueue(database.competitor, queue.options);
});
async function submit(maxAttempts = 2, supportedEvidence = false) {
  const repository = new InvestigationRepository(database.db);
  const investigation = await repository.createInvestigation({ question: "Synthetic objective answer must survive advice execution" });
  const input = makeSnapshot(investigation.id);
  if (supportedEvidence) { input.claims[0]!.verificationStatus = "SUPPORTED"; input.relations[0]!.relation = "SUPPORTS"; }
  const snapshot = await repository.createSnapshot(input);
  const answer = makeAnswer(snapshot);
  await repository.createAnswer(answer);
  const key = randomUUID();
  const body = { snapshotId: snapshot.id, userConditions: conditions };
  const { request } = await new AdviceRepository(database.db).createRequest(investigation.id, body, key, maxAttempts);
  return { request, snapshot, answer, key, body };
}
async function claim(worker = "advice-test") {
  const lease = await queue.claim(worker);
  expect(lease).not.toBeNull();
  return lease!;
}
function completion(lease: AdviceExecutionLease): AdviceHandlerResult {
  const advice: Advice = { id: randomUUID(), snapshotId: lease.snapshotId, userConditions: conditions, content: "Synthetic advice result, test only", generationConfig: { provider: "test", model: "test", promptVersion: "test", temperature: null, generatedAt: new Date().toISOString() } };
  return { kind: "COMPLETE", advice };
}
async function expire(requestId: string) { await database.pool.query('UPDATE "AdviceRequest" SET "leaseExpiresAt" = clock_timestamp() - interval \'1 second\' WHERE "id" = $1', [requestId]); }
async function ready(requestId: string) { await database.pool.query('UPDATE "AdviceRequest" SET "availableAt" = clock_timestamp() - interval \'1 second\' WHERE "id" = $1', [requestId]); }
async function read(id: string) { return database.db.adviceRequest.findUniqueOrThrow({ where: { id } }); }
async function httpState(investigationId: string, requestId: string) {
  const response = await new InvestigationHttpApi(database.db).adviceRequest(new Request("http://127.0.0.1:3000"), investigationId, requestId);
  expect(response.status).toBe(200);
  return AdviceRequestDetailSchema.parse(await response.json());
}

describe("advice queue execution ownership and atomic publication", () => {
  it("claims once under competition and skips a locked candidate", async () => {
    const a = await submit();
    const claimed = await Promise.all([queue.claim("one"), other.claim("two")]);
    expect(claimed.filter(Boolean)).toHaveLength(1);
    expect(await database.db.adviceExecutionAttempt.count()).toBe(1);
    expect((await httpState(a.request.investigationId, a.request.id)).request.status).toBe("RUNNING");
    const b = await submit();
    const c = await submit();
    const lock = await database.pool.connect();
    try {
      await lock.query("BEGIN");
      await lock.query('SELECT "id" FROM "AdviceRequest" WHERE "id" = $1 FOR UPDATE', [b.request.id]);
      expect((await other.claim("skip-locked"))?.requestId).toBe(c.request.id);
    } finally { await lock.query("ROLLBACK"); lock.release(); }
  });

  it("uses database time, caps renewals at the deadline and rejects forged ownership", async () => {
    const source = await submit();
    const lease = await claim();
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    try { expect((await queue.heartbeat({ ...lease, expiresAt: new Date(0) })).expiresAt.getTime()).toBeGreaterThan(0); }
    finally { now.mockRestore(); }
    for (const patch of [{ workerId: "other" }, { attemptId: randomUUID() }, { snapshotId: randomUUID() }, { investigationId: randomUUID() }, { executionToken: randomUUID() }]) await expect(queue.loadTask({ ...lease, ...patch })).rejects.toBeInstanceOf(LeaseLostError);
    await database.pool.query('UPDATE "AdviceRequest" SET "runDeadlineAt" = clock_timestamp() + interval \'500 milliseconds\' WHERE "id" = $1', [source.request.id]);
    expect((await queue.heartbeat(lease)).expiresAt.getTime()).toBe((await read(source.request.id)).runDeadlineAt!.getTime());
    await database.pool.query('UPDATE "AdviceRequest" SET "runDeadlineAt" = clock_timestamp() - interval \'1 second\' WHERE "id" = $1', [source.request.id]);
    await expect(queue.heartbeat(lease)).rejects.toBeInstanceOf(LeaseLostError);
    expect(await queue.recoverExpired()).toBe(1);
    expect((await read(source.request.id)).lastError).toMatchObject({ code: "TASK_TIMEOUT" });
  });

  it("rejects expired/stale executors before and after replacement; competing reapers count once", async () => {
    await submit();
    const old = await claim();
    await expire(old.requestId);
    for (const action of [() => queue.heartbeat(old), () => queue.loadTask(old), () => queue.fail(old, retryError), () => queue.complete(old, completion(old))]) await expect(action()).rejects.toBeInstanceOf(LeaseLostError);
    expect((await Promise.all([queue.recoverExpired(), other.recoverExpired()])).reduce((a, b) => a + b, 0)).toBe(1);
    expect((await read(old.requestId)).failureCount).toBe(1);
    await ready(old.requestId);
    const next = await claim("replacement");
    expect(next.executionToken).not.toBe(old.executionToken);
    await expect(queue.complete(old, completion(old))).rejects.toBeInstanceOf(LeaseLostError);
    expect(await database.db.advice.count()).toBe(0);
    await queue.complete(next, completion(next));
    expect(await database.db.adviceExecutionAttempt.findUniqueOrThrow({ where: { id: old.attemptId } })).toMatchObject({ status: "LEASE_EXPIRED" });
  });

  it("publishes once under duplicate completion and leaves objective data intact", async () => {
    const source = await submit();
    const lease = await claim();
    const result = completion(lease);
    const completed = await Promise.all([queue.complete(lease, result), other.complete(lease, result)]);
    expect(completed.filter((r) => !r.reused)).toHaveLength(1);
    expect(await database.db.advice.count()).toBe(1);
    expect((await httpState(source.request.investigationId, source.request.id)).advice).toEqual(result.kind === "COMPLETE" ? result.advice : null);
    await expect(queue.complete(lease, completion(lease))).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(await new InvestigationRepository(database.db).findAnswer(source.answer.id)).toEqual(source.answer);
    expect(await new InvestigationRepository(database.db).findSnapshot(source.snapshot.id)).toEqual(source.snapshot);
    expect(await database.db.job.count()).toBe(0);
    expect((await read(source.request.id)).failureCount).toBe(0);
  });

  it("publishes condition insufficiency as a terminal non-error without Advice or retries", async () => {
    const source = await submit();
    const lease = await claim();
    const result = { kind: "INSUFFICIENT_CONDITIONS", issue: { message: "Synthetic missing context", missingConditions: ["Deployment details"] } };
    expect((await queue.complete(lease, result)).reused).toBe(false);
    expect((await queue.complete(lease, result)).reused).toBe(true);
    const state = await httpState(source.request.investigationId, source.request.id);
    expect(state.request.status).toBe("INSUFFICIENT_CONDITIONS");
    expect(state.request.error).toBeNull();
    expect(state.request.conditionsIssue).toEqual(result.issue);
    expect(state.advice).toBeNull();
    expect(await queue.claim("no-retry")).toBeNull();
    expect((await read(source.request.id)).failureCount).toBe(0);
    await database.db.adviceRequest.update({ where: { id: source.request.id }, data: { conditionsIssue: { ...result.issue, message: "Structurally valid changed issue" } } });
    await expect(queue.complete(lease, result)).rejects.toThrow();
  });

  it("does not reuse one Advice across different requests or acknowledge a damaged duplicate", async () => {
    const source = await submit();
    const first = await claim();
    const result = completion(first);
    await queue.complete(first, result);
    await new AdviceRepository(database.db).createRequest(source.request.investigationId, source.body, randomUUID());
    const second = await claim("other-request");
    await expect(queue.complete(second, result)).rejects.toThrow();
    expect(await database.db.advice.count()).toBe(1);
    expect((await read(second.requestId)).status).toBe("RUNNING");
    if (result.kind !== "COMPLETE") throw new Error("Test fixture");
    await database.db.advice.update({ where: { id: result.advice.id }, data: { body: { ...result.advice, content: "Structurally valid but altered after publication" } } });
    await expect(queue.complete(first, result)).rejects.toThrow();
    const response = await new InvestigationHttpApi(database.db).adviceRequest(new Request("http://127.0.0.1:3000"), first.investigationId, first.requestId);
    expect(response.status).toBe(500);
  });

  it("rejects bad output and mismatching snapshot/conditions without inserting Advice", async () => {
    await submit();
    const lease = await claim();
    const result = completion(lease);
    if (result.kind !== "COMPLETE") throw new Error("Test fixture");
    for (const invalid of [{ kind: "COMPLETE", advice: {} }, { ...result, advice: { ...result.advice, snapshotId: randomUUID() } }, { ...result, advice: { ...result.advice, userConditions: { ...conditions, budget: "Wrong conditions" } } }]) await expect(queue.complete(lease, invalid)).rejects.toThrow();
    expect(await database.db.advice.count()).toBe(0);
    expect((await read(lease.requestId)).status).toBe("RUNNING");
  });

  it("rolls back Advice and attempt writes if a terminal database write fails", async () => {
    await submit();
    const lease = await claim();
    await database.pool.query(`CREATE FUNCTION reject_test_advice_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."status" = 'SUCCEEDED' THEN RAISE EXCEPTION 'test-only terminal write rejected'; END IF; RETURN NEW; END; $$;
      CREATE TRIGGER reject_test_advice_publication BEFORE UPDATE ON "AdviceRequest" FOR EACH ROW EXECUTE FUNCTION reject_test_advice_publication()`);
    try {
      await expect(queue.complete(lease, completion(lease))).rejects.toThrow();
      expect(await database.db.advice.count()).toBe(0);
      expect((await read(lease.requestId)).status).toBe("RUNNING");
      expect((await database.db.adviceExecutionAttempt.findUniqueOrThrow({ where: { id: lease.attemptId } })).status).toBe("RUNNING");
    } finally { await database.pool.query('DROP TRIGGER reject_test_advice_publication ON "AdviceRequest"; DROP FUNCTION reject_test_advice_publication()'); }
  });

  it("rolls back a result that expires during insertion and rejects renewals delayed behind a row lock", async () => {
    await submit();
    const short = new PostgresAdviceQueue(database.db, { leaseMs: 150, attemptTimeoutMs: 5000 });
    const lease = (await short.claim("short"))!;
    await database.pool.query(`CREATE FUNCTION slow_test_advice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.25); RETURN NEW; END; $$;
      CREATE TRIGGER slow_test_advice BEFORE INSERT ON "Advice" FOR EACH ROW EXECUTE FUNCTION slow_test_advice()`);
    try {
      await expect(short.complete(lease, completion(lease))).rejects.toBeInstanceOf(LeaseLostError);
      expect(await database.db.advice.count()).toBe(0);
      expect((await read(lease.requestId)).status).toBe("RUNNING");
    } finally { await database.pool.query('DROP TRIGGER slow_test_advice ON "Advice"; DROP FUNCTION slow_test_advice()'); }
    await submit();
    const waiting = (await short.claim("waiting"))!;
    const lock = await database.pool.connect();
    try {
      await lock.query("BEGIN");
      await lock.query('SELECT "id" FROM "AdviceRequest" WHERE "id" = $1 FOR UPDATE', [waiting.requestId]);
      const rejected = expect(short.heartbeat(waiting)).rejects.toBeInstanceOf(LeaseLostError);
      await lock.query("SELECT pg_sleep(0.25)");
      await lock.query("ROLLBACK");
      await rejected;
    } finally { await lock.query("ROLLBACK"); lock.release(); }
  });

  it("honors the persisted retry budget with backoff and never resets it on idempotent resubmission", async () => {
    const source = await submit(2);
    const first = await claim();
    expect(await queue.fail(first, retryError)).toEqual({ status: "PENDING", failureCount: 1 });
    expect(await queue.claim("too-early")).toBeNull();
    await ready(first.requestId);
    const second = await claim();
    expect(await queue.fail(second, retryError)).toEqual({ status: "FAILED", failureCount: 2 });
    expect((await new AdviceRepository(database.db).createRequest(source.request.investigationId, source.body, source.key, 20)).reused).toBe(true);
    expect(await queue.claim("past-limit")).toBeNull();
    expect(await read(first.requestId)).toMatchObject({ maxAttempts: 2, failureCount: 2, attemptCount: 2, status: "FAILED" });
    expect((await httpState(source.request.investigationId, source.request.id)).request.error?.code).toBe("PROVIDER_FAILED");
  });

  it("reclaims a lease after an actual advice child process is killed", async () => {
    const source = await submit();
    const child = fork("tests/support/crashing-advice-worker.ts", [], { execArgv: ["--import", "tsx"], env: { ...process.env, TEST_DATABASE_URL: database.connectionString }, windowsHide: true, stdio: ["ignore", "ignore", "pipe", "ipc"] });
    let old: AdviceExecutionLease;
    try {
      const payload = await Promise.race([once(child, "message").then(([message]) => message as { lease: AdviceExecutionLease }), once(child, "exit").then(([code]) => { throw new Error(`Advice crash fixture exited: ${String(code)}`); })]);
      old = AdviceExecutionLeaseSchema.parse({ ...payload.lease, expiresAt: new Date(payload.lease.expiresAt) });
      expect(old.requestId).toBe(source.request.id);
      const exited = once(child, "exit"); child.kill("SIGKILL"); await exited;
    } finally { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); }
    await database.pool.query("SELECT pg_sleep(0.25)");
    expect(await queue.recoverExpired()).toBe(1);
    await ready(source.request.id);
    const replacement = await claim("survivor");
    expect(replacement.executionToken).not.toBe(old!.executionToken);
    await expect(queue.complete(old!, completion(old!))).rejects.toBeInstanceOf(LeaseLostError);
  });

  it("recovers after PostgreSQL terminates an executor's active renewal connection", async () => {
    await submit();
    const url = new URL(database.connectionString);
    const applicationName = `advice_disconnect_${randomUUID()}`;
    url.searchParams.set("application_name", applicationName);
    const db = createDatabaseClient(url.toString());
    const disconnected = new PostgresAdviceQueue(db, queue.options);
    const lease = (await disconnected.claim("disconnected"))!;
    const lock = await database.pool.connect();
    try {
      await lock.query("BEGIN");
      await lock.query('SELECT "id" FROM "AdviceRequest" WHERE "id" = $1 FOR UPDATE', [lease.requestId]);
      const renewal = disconnected.heartbeat(lease).then(() => null, (error: unknown) => error);
      let pid: number | undefined;
      for (let i = 0; i < 50 && pid === undefined; i++) {
        pid = (await database.pool.query<{ pid: number }>("SELECT pid FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock'", [applicationName])).rows[0]?.pid;
        if (pid === undefined) await database.pool.query("SELECT pg_sleep(0.01)");
      }
      expect(pid).toBeDefined();
      await database.pool.query("SELECT pg_terminate_backend($1)", [pid]);
      expect(classifyFailure(await renewal)).toMatchObject({ code: "STORAGE_FAILED", retryable: true });
      await lock.query("ROLLBACK");
      await expire(lease.requestId);
      expect(await other.recoverExpired()).toBe(1);
      await ready(lease.requestId);
      expect((await other.claim("surviving-connection"))?.executionToken).not.toBe(lease.executionToken);
      await expect(disconnected.complete(lease, completion(lease))).rejects.toBeInstanceOf(LeaseLostError);
    } finally { await lock.query("ROLLBACK"); lock.release(); await db.$disconnect(); }
  });
});

describe("advice runner bounded execution", () => {
  it.each(["success", "conditions", "unverified"])("runs the configured recommendation adapter through queue publication and HTTP (%s)", async mode => {
    const source = await submit(2, true);
    const calls: string[] = [];
    const model: ModelProvider = { config: () => ({ provider: "synthetic-adapter-model", model: "test-only", promptVersion: "test", temperature: null, generatedAt: new Date().toISOString() }), async generate<T>(request: ModelRequest<T>) {
      expect(request.signal).toBeDefined(); calls.push(request.purpose!);
      if (request.purpose === "advice-grounded-proposal") return request.outputSchema.parse(mode === "conditions" ? { conditionsIssue: { message: "Synthetic missing deployment constraint", missingConditions: ["Deployment constraint"] }, paragraphs: [] } : { conditionsIssue: null, paragraphs: [{ text: "Synthetic limited advice for this use case", claimIds: [source.snapshot.claims[0]!.id] }] });
      return request.outputSchema.parse({ checks: [{ index: 0, supported: mode !== "unverified", reason: "Synthetic evidence validation" }] });
    } };
    await new AdviceWorkerRunner(queue, createAdviceHandler(createRecommendationProvider({ model })), "configured-adapter", { heartbeatMs: 50 }, silent).processOne();
    const state = await httpState(source.request.investigationId, source.request.id);
    expect(state.request.status).toBe(mode === "success" ? "SUCCEEDED" : mode === "conditions" ? "INSUFFICIENT_CONDITIONS" : "FAILED");
    expect(calls).toHaveLength(mode === "conditions" ? 1 : 2);
    expect(await database.db.advice.count()).toBe(mode === "success" ? 1 : 0);
    expect(state.advice?.content ?? "").toContain(mode === "success" ? source.snapshot.evidence[0]!.originalExcerpt! : "");
    expect(await new InvestigationRepository(database.db).findAnswer(source.answer.id)).toEqual(source.answer);
    expect((await database.db.adviceExecutionAttempt.findFirstOrThrow()).status).toBe(state.request.status);
  });

  it("fails production missing configuration once, is visible through HTTP, and logs no input", async () => {
    const source = await submit();
    const logs: Record<string, unknown>[] = [];
    expect(await new AdviceWorkerRunner(queue, adviceHandler, "real-advice-entry", { heartbeatMs: 50 }, (event) => logs.push(event)).processOne()).toBe(true);
    const state = await httpState(source.request.investigationId, source.request.id);
    expect(state.request.status).toBe("FAILED");
    expect(state.request.error).toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", retryable: false });
    expect(state.advice).toBeNull();
    expect(await database.db.adviceExecutionAttempt.count()).toBe(1);
    expect(JSON.stringify(logs)).not.toContain(conditions.useCase);
    expect(JSON.stringify(state)).not.toContain("executionToken");
  });

  it("keeps a handler alive with real heartbeats and atomically exposes its test-only result", async () => {
    const source = await submit();
    const short = new PostgresAdviceQueue(database.db, { leaseMs: 400, attemptTimeoutMs: 3000 });
    const handler: AdviceHandler = async ({ request, signal }) => {
      await delay(700, undefined, { signal });
      const lease = { snapshotId: request.snapshotId } as AdviceExecutionLease;
      return completion(lease);
    };
    await new AdviceWorkerRunner(short, handler, "heartbeat", { heartbeatMs: 50 }, silent).processOne();
    expect((await httpState(source.request.investigationId, source.request.id)).request.status).toBe("SUCCEEDED");
    const attempt = await database.db.adviceExecutionAttempt.findFirstOrThrow();
    expect(attempt.heartbeatAt.getTime()).toBeGreaterThan(attempt.startedAt.getTime() + 400);
  });

  it("bounds a handler ignoring cancellation and rejects its late result", async () => {
    const source = await submit();
    const short = new PostgresAdviceQueue(database.db, { leaseMs: 200, attemptTimeoutMs: 300, retryBaseMs: 10, retryMaxMs: 10 });
    let finish!: (result: AdviceHandlerResult) => void;
    let signal: AbortSignal | undefined;
    const pending = new Promise<AdviceHandlerResult>((resolve) => { finish = resolve; });
    const handler: AdviceHandler = async (context) => { signal = context.signal; return pending; };
    await new AdviceWorkerRunner(short, handler, "timeout", { heartbeatMs: 50 }, silent).processOne();
    expect(signal?.aborted).toBe(true);
    await short.recoverExpired();
    expect((await read(source.request.id)).lastError).toMatchObject({ code: "TASK_TIMEOUT" });
    finish(completion({ snapshotId: source.snapshot.id } as AdviceExecutionLease));
    await delay(30);
    expect(await database.db.advice.count()).toBe(0);
  });

  it("aborts active work on internal shutdown and retains the bounded retry history", async () => {
    const source = await submit();
    const controller = new AbortController();
    let began!: () => void;
    const started = new Promise<void>((resolve) => { began = resolve; });
    const handler: AdviceHandler = async ({ signal }) => { began(); await delay(10000, undefined, { signal }); throw new Error("unreachable"); };
    const running = new AdviceWorkerRunner(queue, handler, "shutdown", { heartbeatMs: 50, pollMs: 20 }, silent).run(controller.signal);
    await started; controller.abort(); await running;
    expect(await read(source.request.id)).toMatchObject({ status: "PENDING", attemptCount: 1, failureCount: 1, leaseExpiresAt: null, lastError: { code: "WORKER_SHUTDOWN" } });
    expect(await database.db.advice.count()).toBe(0);
  });

  it("aborts after heartbeat ownership loss and never publishes", async () => {
    const source = await submit();
    let signal: AbortSignal | undefined;
    const handler: AdviceHandler = async (context) => {
      signal = context.signal; await expire(context.request.id);
      await delay(10000, undefined, { signal: context.signal });
      return completion({ snapshotId: context.snapshot.id } as AdviceExecutionLease);
    };
    await new AdviceWorkerRunner(queue, handler, "lost-heartbeat", { heartbeatMs: 50 }, silent).processOne();
    expect(signal?.aborted).toBe(true);
    expect(await database.db.advice.count()).toBe(0);
    expect(await queue.recoverExpired()).toBe(1);
    expect((await read(source.request.id)).failureCount).toBe(1);
  });

  it("rejects damaged output, changed input hashes and invisible snapshots before publishing", async () => {
    const first = await submit();
    const invalid: AdviceHandler = async () => ({ kind: "COMPLETE", advice: {} }) as AdviceHandlerResult;
    await new AdviceWorkerRunner(queue, invalid, "bad-output", { heartbeatMs: 50 }, silent).processOne();
    expect((await read(first.request.id)).error).toMatchObject({ code: "INVALID_INPUT", retryable: false });
    const second = await submit();
    await database.db.adviceRequest.update({ where: { id: second.request.id }, data: { requestHash: "0".repeat(64) } });
    let called = false;
    const never: AdviceHandler = async () => { called = true; throw new Error("unreachable"); };
    await new AdviceWorkerRunner(queue, never, "bad-input", { heartbeatMs: 50 }, silent).processOne();
    expect(called).toBe(false);
    expect((await read(second.request.id)).status).toBe("FAILED");
    const third = await submit();
    const hidden = new PostgresAdviceQueue(database.db, queue.options, () => false);
    await new AdviceWorkerRunner(hidden, never, "hidden", { heartbeatMs: 50 }, silent).processOne();
    expect(called).toBe(false);
    expect((await read(third.request.id)).error).toMatchObject({ code: "INVALID_INPUT", retryable: false });
    expect(await database.db.advice.count()).toBe(0);
  });

  it("rechecks snapshot visibility before completion", async () => {
    await submit();
    let visible = true;
    const restricted = new PostgresAdviceQueue(database.db, queue.options, () => visible);
    const lease = (await restricted.claim("visible-then-hidden"))!;
    await restricted.loadTask(lease);
    visible = false;
    await expect(restricted.complete(lease, completion(lease))).rejects.toBeInstanceOf(TaskFailure);
    expect(await database.db.advice.count()).toBe(0);
  });

  it("publishes the handler's validated condition-insufficient branch and sanitizes unexpected errors", async () => {
    const source = await submit();
    const insufficient: AdviceHandler = async () => ({ kind: "INSUFFICIENT_CONDITIONS", issue: { message: "Synthetic semantic gap", missingConditions: ["Usage constraints"] } });
    await new AdviceWorkerRunner(queue, insufficient, "needs-conditions", { heartbeatMs: 50 }, silent).processOne();
    expect((await httpState(source.request.investigationId, source.request.id)).request.status).toBe("INSUFFICIENT_CONDITIONS");
    const failed = await submit();
    const events: Record<string, unknown>[] = [];
    const unexpected: AdviceHandler = async () => { throw new Error(`Raw provider body with ${conditions.useCase}`); };
    await new AdviceWorkerRunner(queue, unexpected, "unexpected", { heartbeatMs: 50 }, (event) => events.push(event)).processOne();
    const row = await read(failed.request.id);
    expect(row.status).toBe("FAILED");
    expect(JSON.stringify(row.error)).not.toContain(conditions.useCase);
    expect(JSON.stringify(events)).not.toContain(conditions.useCase);
    expect(await database.db.advice.count()).toBe(0);
  });
});

it("upgrades stage-3 pending/running tasks while preserving terminal results and objective data", async () => {
  const old = await createQueueTestDatabase({ throughMigration: "20261025050000_advice_requests" });
  try {
    const repo = new InvestigationRepository(old.db);
    const investigation = await repo.createInvestigation({ question: "Synthetic upgrade source" });
    const snapshot = await repo.createSnapshot(makeSnapshot(investigation.id));
    const answer = makeAnswer(snapshot); await repo.createAnswer(answer);
    const requestHash = createHash("sha256").update(`advice:v1:${investigation.id}:${JSON.stringify({ snapshotId: snapshot.id, userConditions: conditions })}`).digest("hex");
    const data = { investigationId: investigation.id, snapshotId: snapshot.id, userConditions: conditions, requestHash };
    const pending = await old.db.$queryRaw<{ id: string }[]>`INSERT INTO "AdviceRequest" ("investigationId", "snapshotId", "userConditions", "idempotencyKey", "requestHash", "updatedAt") VALUES (${data.investigationId}::uuid, ${data.snapshotId}::uuid, ${JSON.stringify(conditions)}::jsonb, ${randomUUID()}, ${data.requestHash}, clock_timestamp()) RETURNING id`;
    const running = await old.db.$queryRaw<{ id: string }[]>`INSERT INTO "AdviceRequest" ("investigationId", "snapshotId", "userConditions", "idempotencyKey", "requestHash", "status", "updatedAt") VALUES (${data.investigationId}::uuid, ${data.snapshotId}::uuid, ${JSON.stringify(conditions)}::jsonb, ${randomUUID()}, ${data.requestHash}, 'RUNNING', clock_timestamp()) RETURNING id`;
    const beforeAnswer = await old.db.answer.findMany();
    const beforeSnapshot = await old.db.evidenceSnapshot.findMany();
    const terminalId = randomUUID();
    await old.db.$executeRaw`INSERT INTO "AdviceRequest" ("id", "investigationId", "snapshotId", "userConditions", "idempotencyKey", "requestHash", "status", "conditionsIssue", "updatedAt", "completedAt") VALUES (${terminalId}::uuid, ${data.investigationId}::uuid, ${data.snapshotId}::uuid, ${JSON.stringify(conditions)}::jsonb, ${randomUUID()}, ${data.requestHash}, 'INSUFFICIENT_CONDITIONS', '{"message":"Historical test gap","missingConditions":["Scope"]}'::jsonb, clock_timestamp(), clock_timestamp())`;
    const beforeTerminal = await old.pool.query('SELECT * FROM "AdviceRequest" WHERE "id" = $1', [terminalId]);
    await old.pool.query(await readFile("prisma/migrations/20261025060000_advice_execution/migration.sql", "utf8"));
    expect((await old.db.adviceRequest.findUniqueOrThrow({ where: { id: pending[0]!.id } })).status).toBe("PENDING");
    expect(await old.db.adviceRequest.findUniqueOrThrow({ where: { id: running[0]!.id } })).toMatchObject({ status: "PENDING", attemptCount: 0, lastError: { code: "LEASE_EXPIRED" } });
    expect(await old.db.answer.findMany()).toEqual(beforeAnswer);
    expect(await old.db.evidenceSnapshot.findMany()).toEqual(beforeSnapshot);
    const afterTerminal = await old.pool.query('SELECT * FROM "AdviceRequest" WHERE "id" = $1', [terminalId]);
    for (const [key, value] of Object.entries(beforeTerminal.rows[0] as Record<string, unknown>)) expect(afterTerminal.rows[0][key]).toEqual(value);
    expect((await new AdviceRepository(old.db).findRequest(investigation.id, terminalId)).request.status).toBe("INSUFFICIENT_CONDITIONS");
    const queue = new PostgresAdviceQueue(old.db);
    const lease = (await queue.claim("upgraded-worker"))!;
    expect((await queue.loadTask(lease)).snapshot).toEqual(snapshot);
  } finally { await old.close(); }
});
