import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { ApiError, conditionsFromText, createApiClient } from '../../src/frontend/lib/api'
import { makeSnapshot, makeAnswer } from '../fixtures/snapshot'

describe('production frontend HTTP boundary (synthetic responses)', () => {
  it('submits prose and depth only, and validates 202 confirmation/retry contracts', async () => {
    const id = randomUUID(), key = randomUUID(), calls: { path: string; init: RequestInit }[] = []
    const client = createApiClient(async (url, init) => { calls.push({ path: String(url), init: init! }); return Response.json({ investigationId: id, reused: false }, { status: 202 }) })
    await expect(client.create('  Synthetic question with real-use constraints  ', key)).resolves.toEqual({ investigationId: id, reused: false })
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ question: 'Synthetic question with real-use constraints', researchDepth: 'AUTO' })
    expect(calls[0]!.init.headers).toMatchObject({ 'Idempotency-Key': key })
    await client.confirm(id, { expectedAttemptCount: 1, identity: { name: 'Synthetic product', officialWebsite: null, version: null, plan: null, confirmationStatus: 'NEEDS_CONFIRMATION', confirmationBasis: [], userClarification: 'Synthetic user clarification' } })
    await client.retry(id, 2)
    expect(calls.map(call => call.path)).toEqual(['/api/investigations', `/api/investigations/${id}/identity`, `/api/investigations/${id}/retry`])
    expect(JSON.parse(calls[2]!.init.body as string)).toEqual({ expectedAttemptCount: 2 })
  })
  it('preserves status/code and never retries a rejected POST', async () => {
    let calls = 0
    const client = createApiClient(async () => { calls++; return Response.json({ error: { code: 'CONFLICT', message: 'Synthetic stale attempt' } }, { status: 409 }) })
    await expect(client.retry(randomUUID(), 1)).rejects.toMatchObject({ status: 409, code: 'CONFLICT', message: 'Synthetic stale attempt' })
    expect(calls).toBe(1)
  })
  it('does not show raw errors, malformed success or network failure as product success', async () => {
    const id = randomUUID()
    await expect(createApiClient(async () => { throw new Error('private-value') }).detail(id)).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
    await expect(createApiClient(async () => new Response('private-value', { status: 500 })).detail(id)).rejects.toMatchObject({ status: 500, code: 'INVALID_RESPONSE' })
    await expect(createApiClient(async () => Response.json({ success: true })).detail(id)).rejects.toBeInstanceOf(ApiError)
  })
  it('enforces source ownership and exact quote validation before display', async () => {
    const snapshot = makeSnapshot(), answer = makeAnswer(snapshot)
    const client = createApiClient(async () => Response.json({ snapshot, answers: [answer] }))
    await expect(client.snapshot(snapshot.id, snapshot.investigationId)).resolves.toEqual({ snapshot, answers: [answer] })
    await expect(client.snapshot(snapshot.id, randomUUID())).rejects.toMatchObject({ code: 'SCOPE_MISMATCH' })
    answer.citations[0]!.quotes![0]!.originalExcerpt = 'Synthetic forged quote'
    await expect(client.snapshot(snapshot.id, snapshot.investigationId)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })
  it('preserves user prose and unknown conditions without inferred fields', async () => {
    const snapshotId = randomUUID(), investigationId = randomUUID(), requestId = randomUUID(), key = randomUUID()
    const userConditions = conditionsFromText('Synthetic product for CAD; budget is unknown.')
    expect(userConditions).toEqual({ useCase: 'Synthetic product for CAD; budget is unknown.', experience: null, budget: null, requirements: [] })
    let body: unknown
    const client = createApiClient(async (_url, init) => { body = JSON.parse(init!.body as string); return Response.json({ adviceRequestId: requestId, reused: false }, { status: 202 }) })
    await expect(client.createAdvice(investigationId, { snapshotId, userConditions }, key)).resolves.toMatchObject({ adviceRequestId: requestId })
    expect(body).toEqual({ snapshotId, userConditions })
    expect(() => conditionsFromText(' ')).toThrow()
  })
  it('retains caller cancellation alongside the HTTP timeout', async () => {
    const controller = new AbortController()
    let observed: AbortSignal | null | undefined
    const client = createApiClient(async (_url, init) => { observed = init?.signal; controller.abort(); throw new Error('Synthetic abort') })
    await expect(client.detail(randomUUID(), controller.signal)).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(observed?.aborted).toBe(true)
  })
})
