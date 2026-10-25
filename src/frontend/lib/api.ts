import { z } from 'zod'
import { AcceptedAdviceRequestSchema, AcceptedInvestigationSchema, AdviceRequestDetailSchema, ApiErrorResponseSchema, CreateAdviceRequestSchema, CreateInvestigationSchema, IdSchema, IdentityConfirmationBodySchema, InvestigationDetailSchema, RetryBodySchema, SnapshotResponseSchema, type CreateAdviceRequest, type IdentityConfirmationBody } from '../../contracts'

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); this.name = 'ApiError' }
}

export function createApiClient(request: typeof fetch = (input, init) => fetch(input, init)) {
  async function read<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    let response: Response
    try { response = await request(path, { ...init, cache: 'no-store', redirect: 'error', signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) }) }
    catch { throw new ApiError(0, 'NETWORK_ERROR', '网络请求未完成，请保留输入后重试；提交结果可能已被服务端接受。') }
    let value: unknown
    try { value = await response.json() } catch { throw new ApiError(response.status, 'INVALID_RESPONSE', '服务返回格式异常，请重新读取状态。') }
    if (!response.ok) {
      const error = ApiErrorResponseSchema.safeParse(value)
      throw new ApiError(response.status, error.success ? error.data.error.code : 'HTTP_ERROR', error.success ? error.data.error.message : '请求未被接受，请检查服务后重试。')
    }
    const result = schema.safeParse(value)
    if (!result.success) throw new ApiError(response.status, 'INVALID_RESPONSE', '返回数据未通过共享契约校验，未显示为成功。')
    return result.data
  }
  const id = (value: string) => IdSchema.parse(value)
  const post = (body: unknown, key?: string): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body) })
  return {
    create: (question: string, key: string) => read('/api/investigations', AcceptedInvestigationSchema, post(CreateInvestigationSchema.parse({ question, researchDepth: 'AUTO' }), key)),
    detail: async (investigationId: string, signal?: AbortSignal) => {
      const value = await read(`/api/investigations/${id(investigationId)}`, InvestigationDetailSchema, signal ? { signal } : {})
      if (value.investigation.id !== investigationId) throw new ApiError(200, 'SCOPE_MISMATCH', '调查归属不符，已停止显示。')
      return value
    },
    snapshot: async (snapshotId: string, investigationId: string, signal?: AbortSignal) => {
      const value = await read(`/api/snapshots/${id(snapshotId)}`, SnapshotResponseSchema, signal ? { signal } : {})
      if (value.snapshot.id !== snapshotId || value.snapshot.investigationId !== investigationId) throw new ApiError(200, 'SCOPE_MISMATCH', '快照归属不符，已停止显示。')
      return value
    },
    confirm: (investigationId: string, body: IdentityConfirmationBody) => read(`/api/investigations/${id(investigationId)}/identity`, AcceptedInvestigationSchema, post(IdentityConfirmationBodySchema.parse(body))),
    retry: (investigationId: string, expectedAttemptCount: number) => read(`/api/investigations/${id(investigationId)}/retry`, AcceptedInvestigationSchema, post(RetryBodySchema.parse({ expectedAttemptCount }))),
    createAdvice: (investigationId: string, body: CreateAdviceRequest, key: string) => read(`/api/investigations/${id(investigationId)}/advice-requests`, AcceptedAdviceRequestSchema, post(CreateAdviceRequestSchema.parse(body), key)),
    advice: async (investigationId: string, requestId: string, signal?: AbortSignal) => {
      const value = await read(`/api/investigations/${id(investigationId)}/advice-requests/${id(requestId)}`, AdviceRequestDetailSchema, signal ? { signal } : {})
      if (value.request.id !== requestId || value.request.investigationId !== investigationId) throw new ApiError(200, 'SCOPE_MISMATCH', '建议请求归属不符，已停止显示。')
      return value
    }
  }
}

/** Preserve a user's prose verbatim; do not infer budget, experience or requirements. */
export function conditionsFromText(text: string) {
  return CreateAdviceRequestSchema.shape.userConditions.parse({ useCase: text, experience: null, budget: null, requirements: [] })
}
