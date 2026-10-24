import { setTimeout as delay } from "node:timers/promises";
import type { InvestigationHandler } from "../server/investigation/handler";
import { HandlerResultSchema, LeaseLostError, TaskFailure, WorkerOptionsSchema, classifyFailure, type ExecutionLease, type WorkerOptions, type PostgresInvestigationQueue } from "../server/queue";

type Log = (event: Record<string, unknown>) => void;
export class WorkerRunner {
  readonly options: WorkerOptions;
  constructor(private readonly queue: PostgresInvestigationQueue, private readonly handler: InvestigationHandler, readonly workerId: string, options: Partial<WorkerOptions> = {}, private readonly log: Log = (event) => console.log(JSON.stringify(event))) {
    this.options = WorkerOptionsSchema.parse(options);
    if (this.options.heartbeatMs * 2 >= Math.min(queue.options.leaseMs, queue.options.attemptTimeoutMs)) throw new Error("Heartbeat must run more frequently than half the lease and deadline");
  }

  async run(signal: AbortSignal) {
    this.log({ event: "worker.started", workerId: this.workerId });
    while (!signal.aborted) {
      try {
        const recovered = await this.queue.recoverExpired();
        if (recovered) this.log({ event: "jobs.recovered", workerId: this.workerId, count: recovered });
        if (signal.aborted) break;
        if (await this.processOne(signal)) continue;
      } catch (error) {
        this.log({ event: "worker.database_error", workerId: this.workerId, error: classifyFailure(error) });
      }
      try { await delay(this.options.pollMs, undefined, { signal }); } catch { if (!signal.aborted) throw new Error("Worker polling interrupted unexpectedly"); }
    }
    this.log({ event: "worker.stopped", workerId: this.workerId });
  }

  async processOne(signal: AbortSignal = new AbortController().signal): Promise<boolean> {
    if (signal.aborted) return false;
    const lease = await this.queue.claim(this.workerId);
    if (!lease) return false;
    await this.runAttempt(lease, signal);
    return true;
  }

  private async runAttempt(lease: ExecutionLease, shutdownSignal: AbortSignal) {
    const controller = new AbortController();
    const heartbeatStop = new AbortController();
    const stop = () => controller.abort(new TaskFailure({ code: "WORKER_SHUTDOWN", message: "Worker received shutdown; unfinished execution will be retried within its failure budget", retryable: true }));
    shutdownSignal.addEventListener("abort", stop, { once: true });
    if (shutdownSignal.aborted) stop();
    const timer = setTimeout(() => controller.abort(new TaskFailure({ code: "TASK_TIMEOUT", message: "Investigation attempt exceeded configured execution timeout", retryable: true })), this.queue.options.attemptTimeoutMs);
    const heartbeat = (async () => {
      while (!heartbeatStop.signal.aborted) {
        try { await delay(this.options.heartbeatMs, undefined, { signal: heartbeatStop.signal }); } catch { return; }
        if (heartbeatStop.signal.aborted) return;
        try { await this.queue.heartbeat(lease); }
        catch (error) { controller.abort(error); return; }
      }
    })();
    let onAbort: () => void = () => undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", onAbort, { once: true });
      if (controller.signal.aborted) onAbort();
    });
    this.log({ event: "attempt.started", workerId: this.workerId, jobId: lease.jobId, attemptId: lease.attemptId });
    try {
      const pending = (async () => {
        const task = await this.queue.loadTask(lease);
        controller.signal.throwIfAborted();
        return this.handler({
          investigationId: task.investigation.id, question: task.investigation.question,
          confirmedIdentity: task.confirmedIdentity, signal: controller.signal,
          setStage: async (stage) => { controller.signal.throwIfAborted(); await this.queue.advanceStage(lease, stage); }
        });
      })();
      const result = HandlerResultSchema.parse(await Promise.race([pending, aborted]));
      controller.signal.throwIfAborted();
      heartbeatStop.abort();
      await heartbeat;
      controller.signal.throwIfAborted();
      if (result.kind === "COMPLETE") await this.queue.complete(lease, result.result);
      else await this.queue.awaitConfirmation(lease, result.request);
      this.log({ event: "attempt.finished", workerId: this.workerId, jobId: lease.jobId, outcome: result.kind });
    } catch (error) {
      heartbeatStop.abort();
      await heartbeat;
      const detail = classifyFailure(error);
      try {
        if (!(error instanceof LeaseLostError)) await this.queue.fail(lease, detail);
      } catch (writeError) {
        // A lost/uncertain lease must be recovered from the database, never locally forced to completion.
        this.log({ event: "attempt.failure_not_recorded", jobId: lease.jobId, error: classifyFailure(writeError) });
      }
      this.log({ event: "attempt.failed", workerId: this.workerId, jobId: lease.jobId, error: detail });
    } finally {
      clearTimeout(timer);
      heartbeatStop.abort();
      await heartbeat;
      shutdownSignal.removeEventListener("abort", stop);
      controller.signal.removeEventListener("abort", onAbort);
      // A handler ignoring AbortSignal cannot submit through this runner after its outcome is abandoned.
    }
  }
}
