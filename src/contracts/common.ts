import { z } from "zod";

export const CONTRACT_VERSION = "1.0.0" as const;
export const IdSchema = z.uuid();
export const TimestampSchema = z.iso.datetime({ offset: true });
export const TextSchema = z.string().trim().min(1);
export const HttpUrlSchema = z.url({ protocol: /^https?$/ });
export const ErrorSchema = z.strictObject({
  code: z.enum(["PROVIDER_NOT_CONFIGURED", "CAPABILITY_NOT_IMPLEMENTED", "INVALID_INPUT", "PROVIDER_FAILED", "STORAGE_FAILED", "LEASE_LOST", "TASK_TIMEOUT", "WORKER_SHUTDOWN", "LEASE_EXPIRED", "IDEMPOTENCY_CONFLICT", "UNKNOWN"]),
  message: TextSchema,
  retryable: z.boolean()
});
export type DomainError = z.infer<typeof ErrorSchema>;

export const GenerationConfigSchema = z.strictObject({
  provider: TextSchema,
  model: TextSchema,
  promptVersion: TextSchema,
  temperature: z.number().min(0).max(2).nullable(),
  generatedAt: TimestampSchema
});
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;
