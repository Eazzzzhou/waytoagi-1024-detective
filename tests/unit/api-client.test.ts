import { afterEach, expect, it, vi } from "vitest";
import { AcceptedInvestigationSchema } from "../../src/contracts";
import { ApiError, isStateConflict, readApi } from "../../src/components/investigation/api-client";

afterEach(() => vi.unstubAllGlobals());
it("preserves 409 status for recovery without resubmitting", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "CONFLICT", message: "State changed" } }), { status: 409 }));
  vi.stubGlobal("fetch", fetchMock);
  const error = await readApi("/api/test", AcceptedInvestigationSchema).catch((failure: unknown) => failure);
  expect(error).toBeInstanceOf(ApiError);
  expect(isStateConflict(error)).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(isStateConflict(new ApiError("unavailable", 503))).toBe(false);
});
it("keeps HTTP conflict identity even when the body is malformed", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid-json", { status: 409 })));
  const error = await readApi("/api/test", AcceptedInvestigationSchema).catch((failure: unknown) => failure);
  expect(isStateConflict(error)).toBe(true);
});
