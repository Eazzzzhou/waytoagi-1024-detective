import "dotenv/config";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { createQueueTestDatabase } from "../support/database";
import { emptyCompletion } from "../fixtures/empty-completion";
import { PostgresInvestigationQueue } from "../../src/server/queue";
import { investigationHandler, type InvestigationHandler } from "../../src/server/investigation/handler";
import { WorkerRunner } from "../../src/worker/runner";

let database: Awaited<ReturnType<typeof createQueueTestDatabase>>;
let queue: PostgresInvestigationQueue;
beforeAll(async () => { database = await createQueueTestDatabase(); });
afterAll(async () => { await database?.close(); });
beforeEach(async () => {
  await database.pool.query('TRUNCATE "Job", "ExecutionAttempt", "Investigation", "EvidenceSnapshot", "Answer", "Advice" CASCADE');
  queue = new PostgresInvestigationQueue(database.db, { leaseMs: 300, attemptTimeoutMs: 3000, retryBaseMs: 10, retryMaxMs: 10 });
});
const silent = () => undefined;
async function submit() { return queue.enqueue({ question: "Worker test only", idempotencyKey: randomUUID() }); }

describe("independent Worker execution with real PostgreSQL", () => {
  it("runs the production entry and records PROVIDER_NOT_CONFIGURED without publishing", async () => {
    const created = await submit();
    const worker = new WorkerRunner(queue, investigationHandler, "real-entry-test", { heartbeatMs: 50 }, silent);
    expect(await worker.processOne()).toBe(true);
    const job = await database.db.job.findUniqueOrThrow({ where: { id: created.jobId } });
    expect(job.status).toBe("FAILED");
    expect(job.lastError).toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", retryable: false });
    expect((await database.db.executionAttempt.findFirstOrThrow()).stage).toBe("IDENTITY");
    expect(await database.db.evidenceSnapshot.count()).toBe(0);
    expect(await database.db.answer.count()).toBe(0);
  });

  it("keeps a long-running test handler alive through sequential database heartbeats", async () => {
    await submit();
    let heartbeats = 0;
    const handler: InvestigationHandler = async (context) => {
      await context.setStage("RETRIEVAL");
      // Wait for several real heartbeat advances, longer than the original lease.
      const first = await database.db.job.findFirstOrThrow();
      for (let index = 0; index < 20 && heartbeats < 4; index++) {
        await delay(60);
        const current = await database.db.job.findFirstOrThrow();
        if (current.heartbeatAt!.getTime() > first.heartbeatAt!.getTime()) heartbeats++;
        context.signal.throwIfAborted();
      }
      await delay(150);
      await context.setStage("ANSWER");
      return { kind: "COMPLETE", result: emptyCompletion(context.investigationId) };
    };
    expect(await new WorkerRunner(queue, handler, "heartbeat-test", { heartbeatMs: 50 }, silent).processOne()).toBe(true);
    expect(heartbeats).toBe(4);
    expect((await database.db.job.findFirstOrThrow()).status).toBe("SUCCEEDED");
  });

  it("bounds a handler that ignores cancellation and rejects its late result", async () => {
    await submit();
    const shortQueue = new PostgresInvestigationQueue(database.db, { leaseMs: 200, attemptTimeoutMs: 300, retryBaseMs: 10, retryMaxMs: 10 });
    let finish!: (value: Awaited<ReturnType<InvestigationHandler>>) => void;
    let capturedSignal: AbortSignal | undefined;
    const pending = new Promise<Awaited<ReturnType<InvestigationHandler>>>((resolve) => { finish = resolve; });
    const handler: InvestigationHandler = async (context) => { capturedSignal = context.signal; return pending; };
    await new WorkerRunner(shortQueue, handler, "timeout-test", { heartbeatMs: 50 }, silent).processOne();
    expect(capturedSignal?.aborted).toBe(true);
    await shortQueue.recoverExpired();
    const job = await database.db.job.findFirstOrThrow();
    expect(job.status).toBe("PENDING");
    expect(job.lastError).toMatchObject({ code: "TASK_TIMEOUT", retryable: true });
    finish({ kind: "COMPLETE", result: emptyCompletion(job.investigationId) });
    await delay(30);
    expect(await database.db.evidenceSnapshot.count()).toBe(0);
  });

  it("aborts active work on graceful shutdown, records a retry and stops polling", async () => {
    await submit();
    const controller = new AbortController();
    let began!: () => void;
    const started = new Promise<void>((resolve) => { began = resolve; });
    const handler: InvestigationHandler = async (context) => {
      began();
      await delay(10000, undefined, { signal: context.signal });
      throw new Error("Unreachable after shutdown");
    };
    const running = new WorkerRunner(queue, handler, "shutdown-test", { pollMs: 20, heartbeatMs: 50 }, silent).run(controller.signal);
    await started;
    controller.abort();
    await running;
    const job = await database.db.job.findFirstOrThrow();
    expect(job.status).toBe("PENDING");
    expect(job.lastError).toMatchObject({ code: "WORKER_SHUTDOWN", retryable: true });
    expect(job.attemptCount).toBe(1);
    expect(job.leaseExpiresAt).toBeNull();
  });

  it("validates unknown handler output before any publication", async () => {
    await submit();
    const invalid: InvestigationHandler = async () => ({ kind: "COMPLETE", result: { fabricated: true } }) as unknown as Awaited<ReturnType<InvestigationHandler>>;
    await new WorkerRunner(queue, invalid, "invalid-output-test", { heartbeatMs: 50 }, silent).processOne();
    expect((await database.db.job.findFirstOrThrow()).lastError).toMatchObject({ code: "INVALID_INPUT", retryable: false });
    expect(await database.db.evidenceSnapshot.count()).toBe(0);
  });

  it("aborts the handler after heartbeat loses ownership and never publishes", async () => {
    await submit();
    let signal: AbortSignal | undefined;
    const handler: InvestigationHandler = async (context) => {
      signal = context.signal;
      await database.pool.query('UPDATE "Job" SET "leaseExpiresAt" = clock_timestamp() - interval \'1 second\'');
      await delay(10000, undefined, { signal: context.signal });
      return { kind: "COMPLETE", result: emptyCompletion(context.investigationId) };
    };
    await new WorkerRunner(queue, handler, "lost-heartbeat-test", { heartbeatMs: 50 }, silent).processOne();
    expect(signal?.aborted).toBe(true);
    expect(await database.db.evidenceSnapshot.count()).toBe(0);
    expect(await queue.recoverExpired()).toBe(1);
  });
});
