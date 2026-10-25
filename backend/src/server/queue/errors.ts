import { ZodError } from "zod";
import { ErrorSchema, type DomainError } from "../../contracts";
import { CapabilityError } from "../errors";

export class TaskFailure extends Error {
  readonly detail: DomainError;
  constructor(detail: DomainError) {
    const parsed = ErrorSchema.parse(detail);
    super(parsed.message);
    this.name = "TaskFailure";
    this.detail = parsed;
  }
}
export class LeaseLostError extends TaskFailure {
  constructor() { super({ code: "LEASE_LOST", message: "Execution lease expired or belongs to another attempt", retryable: false }); }
}
export class IdempotencyConflictError extends TaskFailure {
  constructor(message = "Idempotency key is already bound to different request parameters") { super({ code: "IDEMPOTENCY_CONFLICT", message, retryable: false }); }
}

export function classifyFailure(error: unknown): DomainError {
  if (error instanceof TaskFailure || error instanceof CapabilityError) return redactFailure(ErrorSchema.parse(error.detail));
  if (error instanceof ZodError) return { code: "INVALID_INPUT", message: `Runtime contract rejected input/output: ${error.issues.map((item) => `${item.path.join(".")}: ${item.code}`).join("; ").slice(0, 3000)}`, retryable: false };
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const field = (value: unknown, key: string): unknown => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
  const meta = field(error, "meta");
  const adapterCause = field(field(meta, "driverAdapterError"), "cause");
  const sqlCode = String(field(meta, "code") ?? field(adapterCause, "code") ?? field(adapterCause, "originalCode") ?? "");
  if (/^P\d{4}$/.test(code) || ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "57P01", "08006"].includes(code)) {
    return { code: "STORAGE_FAILED", message: `Database operation failed (${[code, sqlCode].filter(Boolean).join("/")})`, retryable: ["P1001", "P1002", "P1008", "P1017", "P2024", "P2028", "P2034", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "57P01", "08006"].includes(code) || /^(08|40)/.test(sqlCode) || ["55P03", "57014", "57P01", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"].includes(sqlCode) };
  }
  return redactFailure({ code: "UNKNOWN", message: error instanceof Error ? `${error.name}: ${error.message}` : "Handler threw a non-Error value", retryable: false });
}

/** Defense in depth; adapters must still provide safe, specific public error messages. */
export function redactFailure(detail: DomainError): DomainError {
  let message = detail.message;
  for (const [key, value] of Object.entries(process.env)) {
    if (value && value.length >= 4 && /KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL/.test(key)) message = message.replaceAll(value, "[REDACTED]");
  }
  message = message
    .replace(/(postgres(?:ql)?:\/\/)[^\s]+/gi, "$1[REDACTED]")
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, "$1[REDACTED]@")
    .replace(/\b(Bearer|Basic)\s+[a-z0-9+/_.=-]+/gi, "$1 [REDACTED]")
    .replace(/((?:api[_-]?key|authorization|password|token|secret)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1[REDACTED]");
  return { ...detail, message: message.slice(0, 4000) };
}
