import type { z } from "zod";
import { ApiErrorResponseSchema } from "@/contracts";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = "ApiError"; }
}
export const isStateConflict = (error: unknown) => error instanceof ApiError && error.status === 409;

export async function readApi<T>(url: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  let data: unknown;
  try { data = await response.json(); } catch { throw new ApiError("服务未返回有效响应，请稍后重试。", response.status); }
  if (!response.ok) {
    const failure = ApiErrorResponseSchema.safeParse(data);
    throw new ApiError(failure.success ? failure.data.error.message : `请求失败（HTTP ${response.status}）。`, response.status);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error("响应未通过数据契约校验，已停止显示该内容。");
  return parsed.data;
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : "请求失败，请稍后重试。"; }
export function postJson(body: unknown): RequestInit { return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }; }
