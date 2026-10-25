import type { z } from "zod";
import { ApiErrorResponseSchema, type ApiErrorResponse } from "@/contracts";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: ApiErrorResponse["error"]["code"]) { super(message); }
}
export class NetworkError extends Error {}
export const CONFLICT_MESSAGE = "调查数据已变化，正在重新读取当前状态。请核对后再操作，本次操作不会自动重放。";
export function isConflict(error: unknown) { return error instanceof ApiError && error.status === 409; }

export async function readApi<T>(url: string, schema: z.ZodType<T>, options: RequestInit & { expectedStatus?: number } = {}): Promise<T> {
  const { expectedStatus, ...init } = options;
  const timeout = AbortSignal.timeout(20000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  let response: Response;
  try { response = await fetch(url, { ...init, cache: "no-store", signal }); }
  catch (error) {
    if (init.signal?.aborted) throw error;
    throw new NetworkError(timeout.aborted ? "请求超时，请检查连接后重试。" : "无法连接服务，请检查网络或本地服务是否运行。");
  }
  let data: unknown;
  try { data = await response.json(); } catch (error) {
    if (init.signal?.aborted) throw error;
    if (timeout.aborted || error instanceof TypeError) throw new NetworkError("响应读取中断，请检查连接后重试。");
    throw new ApiError("服务未返回有效 JSON 响应，请刷新后重试。", response.status);
  }
  if (!response.ok) {
    const failure = ApiErrorResponseSchema.safeParse(data);
    throw new ApiError(failure.success ? failure.data.error.message : `请求失败（HTTP ${response.status}）。`, response.status, failure.success ? failure.data.error.code : undefined);
  }
  if (expectedStatus !== undefined && response.status !== expectedStatus) throw new ApiError(`服务未确认接受操作（预期 HTTP ${expectedStatus}，实际 ${response.status}）。请核对后重试。`, response.status);
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error("响应未通过数据契约校验，已停止显示该内容。");
  return parsed.data;
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : "请求失败，请稍后重试。"; }
export function postJson(body: unknown): RequestInit { return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }; }
