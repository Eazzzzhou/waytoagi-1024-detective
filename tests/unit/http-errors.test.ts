import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiErrorResponseSchema } from "../../src/contracts";
import { apiFailure, HttpError } from "../../src/server/http/errors";
import { StoredDataError } from "../../src/server/storage/errors";

afterEach(() => vi.restoreAllMocks());

it("records contract, stored-data and configuration failures without their input or messages", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const invalid = z.strictObject({ value: z.string() }).safeParse({ value: 1, "private-question-sentinel": true });
  if (invalid.success) throw new Error("Expected invalid fixture");
  for (const error of [invalid.error, new StoredDataError(), new HttpError(503, "STORAGE_UNAVAILABLE", "Configuration unavailable")]) {
    const response = apiFailure(error);
    const body = ApiErrorResponseSchema.parse(await response.json());
    expect(log).toHaveBeenLastCalledWith(JSON.stringify({ event: "http.failure", status: response.status, code: body.error.code }));
  }
  expect(log).toHaveBeenCalledTimes(3);
  expect(JSON.stringify(log.mock.calls)).not.toContain("private-question-sentinel");
});

it("logs only error classifications for unexpected failures, retaining the safe response", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const response = apiFailure(new Error("private-question-and-provider-response-sentinel"));
  expect(response.status).toBe(500);
  expect(ApiErrorResponseSchema.parse(await response.json()).error.code).toBe("INTERNAL_ERROR");
  expect(log).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ event: "http.failure", status: 500, code: "INTERNAL_ERROR" }));
});

it("keeps expected client errors out of server failure logs", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  expect(apiFailure(new HttpError(400, "INVALID_INPUT", "Invalid request")).status).toBe(400);
  expect(log).not.toHaveBeenCalled();
});
