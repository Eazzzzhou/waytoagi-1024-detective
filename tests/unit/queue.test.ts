import { describe, expect, it } from "vitest";
import { CapabilityError } from "../../src/server/errors";
import { QueueOptionsSchema, TaskFailure, classifyFailure, readWorkerConfig } from "../../src/server/queue";

describe("queue runtime boundaries", () => {
  it("validates environment settings and heartbeat safety margin", () => {
    expect(readWorkerConfig({}).queue.maxAttempts).toBe(3);
    expect(() => readWorkerConfig({ WORKER_POLL_MS: "NaN" })).toThrow();
    expect(() => readWorkerConfig({ WORKER_HEARTBEAT_MS: "20000" })).toThrow();
    expect(() => QueueOptionsSchema.parse({ retryBaseMs: 2000, retryMaxMs: 1000 })).toThrow();
    expect(() => QueueOptionsSchema.parse({ maxAttempts: 0 })).toThrow();
  });
  it("distinguishes unavailable providers, retryable failures, timeouts and unknown errors", () => {
    expect(classifyFailure(new CapabilityError("retrieval"))).toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", retryable: false });
    expect(classifyFailure(new TaskFailure({ code: "PROVIDER_FAILED", message: "Provider rate limit; retry later", retryable: true }))).toMatchObject({ retryable: true });
    expect(classifyFailure({ code: "P2010", meta: { code: "57P01" } })).toMatchObject({ code: "STORAGE_FAILED", retryable: true });
    expect(classifyFailure({ code: "P2002" })).toMatchObject({ retryable: false });
    expect(classifyFailure(new Error("Unclassified bug"))).toMatchObject({ code: "UNKNOWN", retryable: false, message: "Error: Unclassified bug" });
  });
  it("redacts recognizable credentials while retaining a concrete error reason", () => {
    const detail = classifyFailure(new Error("Fetch failed password=abc123 postgresql://name:pw@db/app"));
    expect(detail.message).toContain("Fetch failed");
    expect(detail.message).not.toContain("abc123");
    expect(detail.message).not.toContain("name:pw");
  });

  it("redacts full Bearer/Basic credentials, quoted passwords and URL credentials", () => {
    const error = classifyFailure(new Error('Request failed Authorization: Bearer hidden-token; Basic dXNlcjpwYXNz; password="two word secret" https://alice:private@api.example/path'));
    for (const secret of ["hidden-token", "dXNlcjpwYXNz", "two word secret", "alice:private"]) expect(error.message).not.toContain(secret);
    expect(error.message).toContain("Request failed");
  });
});
