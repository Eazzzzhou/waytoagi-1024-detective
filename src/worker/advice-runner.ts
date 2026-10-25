import { setTimeout as delay } from "node:timers/promises";
import { AdviceHandlerResultSchema, type AdviceExecutionLease } from "../server/queue/advice-contracts";
import { PostgresAdviceQueue } from "../server/queue/advice-postgres";
import { LeaseLostError, TaskFailure, classifyFailure } from "../server/queue/errors";
import { WorkerOptionsSchema, type WorkerOptions } from "../server/queue/config";
import type { AdviceHandler } from "./advice-handler";

type Log = (event: Record<string, unknown>) => void;
export class AdviceWorkerRunner {
  readonly options: WorkerOptions;
  constructor(private readonly queue: PostgresAdviceQueue, private readonly handler: AdviceHandler, readonly workerId: string, options: Partial<WorkerOptions> = {}, private readonly log: Log = (event) => console.log(JSON.stringify(event))) {
    this.options = WorkerOptionsSchema.parse(options);
    if (this.options.heartbeatMs * 2 >= Math.min(queue.options.leaseMs, queue.options.attemptTimeoutMs)) throw new Error("Heartbeat must run more frequently than half the lease and deadline");
  }

  async run(signal: AbortSignal) {
    this.log({ event: "advice.worker.started", workerId: this.workerId });
    while (!signal.aborted) {
      try {
        const recovered = await this.queue.recoverExpired();
        if (recovered) this.log({ event: "advice.recovered", count: recovered });
        if (signal.aborted) break;
        if (await this.processOne(signal)) continue;
      } catch (error) {
        this.log({ event: "advice.worker.database_error", code: classifyFailure(error).code });
      }
      try { await delay(this.options.pollMs, undefined, { signal }); } catch { if (!signal.aborted) throw new Error("Advice polling interrupted unexpectedly"); }
    }
    this.log({ event: "advice.worker.stopped", workerId: this.workerId });
  }

  async processOne(signal: AbortSignal = new AbortController().signal): Promise<boolean> {
    if (signal.aborted) return false;
    const lease = await this.queue.claim(this.workerId);
    if (!lease) return false;
    await this.runAttempt(lease, signal);
    return true;
  }

  private async runAttempt(lease: AdviceExecutionLease, shutdownSignal: AbortSignal) {
    const controller = new AbortController();
    const heartbeatStop = new AbortController();
    const stop = () => controller.abort(new TaskFailure({ code: "WORKER_SHUTDOWN", message: "Advice worker is shutting down; retry remains bounded", retryable: true }));
    shutdownSignal.addEventListener("abort", stop, { once: true });
    if (shutdownSignal.aborted) stop();
    const timer = setTimeout(() => controller.abort(new TaskFailure({ code: "TASK_TIMEOUT", message: "Advice attempt exceeded configured execution timeout", retryable: true })), this.queue.options.attemptTimeoutMs);
    const heartbeat = (async () => {
      while (!heartbeatStop.signal.aborted) {
        try { await delay(this.options.heartbeatMs, undefined, { signal: heartbeatStop.signal }); } catch { return; }
        if (heartbeatStop.signal.aborted) return;
        try { await this.queue.heartbeat(lease); }
        catch (error) { controller.abort(error); return; }
      }
    })();
    let onAbort = () => undefined as void;
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", onAbort, { once: true });
      if (controller.signal.aborted) onAbort();
    });
    this.log({ event: "advice.attempt.started", requestId: lease.requestId, attemptId: lease.attemptId });
    try {
      const pending = (async () => {
        const task = await this.queue.loadTask(lease);
        controller.signal.throwIfAborted();
        return this.handler({ ...task, signal: controller.signal });
      })();
      const result = AdviceHandlerResultSchema.parse(await Promise.race([pending, aborted]));
      controller.signal.throwIfAborted();
      heartbeatStop.abort();
      await heartbeat;
      controller.signal.throwIfAborted();
      await this.queue.complete(lease, result);
      this.log({ event: "advice.attempt.finished", requestId: lease.requestId, outcome: result.kind });
    } catch (error) {
      // An output/DB error also cancels any work still using this execution context.
      controller.abort(error);
      heartbeatStop.abort();
      await heartbeat;
      const classified = classifyFailure(error);
      const detail = classified.code === "UNKNOWN" ? { ...classified, message: "Advice execution failed; no result was published" } : classified;
      try { if (!(error instanceof LeaseLostError)) await this.queue.fail(lease, detail); }
      catch (writeError) { this.log({ event: "advice.failure_not_recorded", requestId: lease.requestId, code: classifyFailure(writeError).code }); }
      // No raw question, conditions, provider output, credentials or exception messages in logs.
      this.log({ event: "advice.attempt.failed", requestId: lease.requestId, code: detail.code, retryable: detail.retryable });
    } finally {
      clearTimeout(timer);
      heartbeatStop.abort();
      await heartbeat;
      shutdownSignal.removeEventListener("abort", stop);
      controller.signal.removeEventListener("abort", onAbort);
    }
  }
}
