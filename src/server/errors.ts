import { ErrorSchema, type DomainError } from "../contracts";

export class CapabilityError extends Error {
  readonly detail: DomainError;
  constructor(capability: string) {
    const detail = ErrorSchema.parse({ code: "PROVIDER_NOT_CONFIGURED", message: `${capability}: real provider is not configured`, retryable: false });
    super(detail.message);
    this.name = "CapabilityError";
    this.detail = detail;
  }
}

export async function unavailable<T>(capability: string): Promise<T> {
  throw new CapabilityError(capability);
}
