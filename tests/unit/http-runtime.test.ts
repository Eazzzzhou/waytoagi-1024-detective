import { afterEach, expect, it, vi } from "vitest";
import { POST, GET } from "../../src/app/api/investigations/route";
import { ApiErrorResponseSchema } from "../../src/contracts";
import { POST as createAdvice, GET as unsupportedAdvice } from "../../src/app/api/investigations/[id]/advice-requests/route";
import { GET as readAdvice, POST as unsupportedAdviceDetail } from "../../src/app/api/investigations/[id]/advice-requests/[requestId]/route";

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
it("advice thin routes preserve safe initialization and unsupported-method responses", async () => {
  vi.stubEnv("DATABASE_URL", "invalid-advice-secret-sentinel");
  const id = "11111111-1111-4111-8111-111111111111";
  const responses = [await createAdvice(new Request(`http://127.0.0.1/api/investigations/${id}/advice-requests`), { params: Promise.resolve({ id }) }), await readAdvice(new Request(`http://127.0.0.1/api/investigations/${id}/advice-requests/${id}`), { params: Promise.resolve({ id, requestId: id }) })];
  for (const response of responses) {
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain("invalid-advice-secret-sentinel");
    expect(ApiErrorResponseSchema.parse(JSON.parse(text)).error.code).toBe("STORAGE_UNAVAILABLE");
  }
  expect(unsupportedAdvice().headers.get("Allow")).toBe("POST");
  expect(unsupportedAdviceDetail().headers.get("Allow")).toBe("GET, HEAD");
});
