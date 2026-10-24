import { afterEach, expect, it, vi } from "vitest";
import { POST, GET } from "../../src/app/api/investigations/route";
import { ApiErrorResponseSchema } from "../../src/contracts";

afterEach(() => vi.unstubAllEnvs());
it("route initialization failures stay JSON and do not expose an invalid server credential", async () => {
  vi.stubEnv("DATABASE_URL", "invalid-secret-url-sentinel");
  const response = await POST(new Request("http://127.0.0.1/api/investigations", { method: "POST" }));
  expect(response.status).toBe(503);
  const body = await response.text();
  expect(body).not.toContain("invalid-secret-url-sentinel");
  expect(ApiErrorResponseSchema.parse(JSON.parse(body)).error.code).toBe("STORAGE_UNAVAILABLE");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
it("unsupported route methods return the same JSON envelope with an Allow header", async () => {
  const response = GET();
  expect(response.status).toBe(405);
  expect(response.headers.get("Allow")).toBe("POST");
  expect(ApiErrorResponseSchema.parse(await response.json()).error.code).toBe("NOT_ALLOWED");
});
