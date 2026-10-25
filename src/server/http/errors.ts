import { z } from "zod";
import { ApiErrorResponseSchema, type ApiErrorResponse } from "../../contracts";
import { IdempotencyConflictError, classifyFailure } from "../queue/errors";
import { ResourceNotFoundError, StoredDataError } from "../storage/errors";

export const JSON_HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
export class HttpError extends Error {
  constructor(readonly status: number, readonly code: ApiErrorResponse["error"]["code"], message: string) { super(message); }
}
export function apiFailure(error: unknown): Response {
  let failure: HttpError;
  if (error instanceof HttpError) failure = error;
  else if (error instanceof ResourceNotFoundError) failure = new HttpError(404, "NOT_FOUND", "未找到此调查范围内的资源。");
  else if (error instanceof IdempotencyConflictError) failure = new HttpError(409, "CONFLICT", error.detail.message);
  else if (error instanceof z.ZodError || error instanceof StoredDataError) failure = new HttpError(500, "INVALID_STORED_DATA", "数据库内容未通过契约校验，无法安全显示。");
  else {
    const detail = classifyFailure(error);
    failure = detail.code === "STORAGE_FAILED" ? new HttpError(503, "STORAGE_UNAVAILABLE", "数据库暂不可用，请稍后刷新或重试提交。") : new HttpError(500, "INTERNAL_ERROR", "服务暂时无法处理请求，请稍后重试。");
  }
  // Emit every server failure through one boundary. Exception messages, Zod issues
  // and request/provider payloads can contain business data even after secret redaction.
  if (failure.status >= 500) console.error(JSON.stringify({ event: "http.failure", status: failure.status, code: failure.code }));
  return Response.json(ApiErrorResponseSchema.parse({ error: { code: failure.code, message: failure.message } }), { status: failure.status, headers: JSON_HEADERS });
}
export function methodNotAllowed(allowed: string): Response {
  const response = apiFailure(new HttpError(405, "NOT_ALLOWED", "此接口不支持该 HTTP 方法。"));
  response.headers.set("Allow", allowed);
  return response;
}
