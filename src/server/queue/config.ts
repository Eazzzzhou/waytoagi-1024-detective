import { z } from "zod";

export const QueueOptionsSchema = z.strictObject({
  leaseMs: z.number().int().min(50).max(300000).default(30000),
  attemptTimeoutMs: z.number().int().min(50).max(3600000).default(300000),
  maxAttempts: z.number().int().min(1).max(20).default(3),
  retryBaseMs: z.number().int().min(1).max(60000).default(1000),
  retryMaxMs: z.number().int().min(1).max(3600000).default(60000),
  recoveryBatchSize: z.number().int().min(1).max(100).default(20)
}).refine((value) => value.retryMaxMs >= value.retryBaseMs, "retryMaxMs must be >= retryBaseMs");
export type QueueOptions = z.infer<typeof QueueOptionsSchema>;

export const WorkerOptionsSchema = z.strictObject({
  pollMs: z.number().int().min(10).max(60000).default(1000),
  heartbeatMs: z.number().int().min(10).max(60000).default(10000),
  shutdownGraceMs: z.number().int().min(50).max(300000).default(10000)
});
export type WorkerOptions = z.infer<typeof WorkerOptionsSchema>;

export function readQueueConfig(env: Record<string, string | undefined> = process.env): QueueOptions {
  const number = (key: string) => env[key] === undefined ? undefined : Number(env[key]);
  return QueueOptionsSchema.parse({
    leaseMs: number("WORKER_LEASE_MS"), attemptTimeoutMs: number("WORKER_TIMEOUT_MS"),
    maxAttempts: number("WORKER_MAX_ATTEMPTS"), retryBaseMs: number("WORKER_RETRY_BASE_MS"), retryMaxMs: number("WORKER_RETRY_MAX_MS")
  });
}

export function readWorkerConfig(env: Record<string, string | undefined> = process.env) {
  const queue = readQueueConfig(env);
  const number = (key: string) => env[key] === undefined ? undefined : Number(env[key]);
  const worker = WorkerOptionsSchema.parse({ pollMs: number("WORKER_POLL_MS"), heartbeatMs: number("WORKER_HEARTBEAT_MS"), shutdownGraceMs: number("WORKER_SHUTDOWN_GRACE_MS") });
  if (worker.heartbeatMs * 2 >= Math.min(queue.leaseMs, queue.attemptTimeoutMs)) throw new Error("Heartbeat interval must be less than half the lease and attempt timeout");
  return { queue, worker };
}
