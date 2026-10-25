// @vitest-environment jsdom
import { randomUUID } from 'node:crypto'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveWorkspace } from '../../src/frontend/components/LiveWorkspace'
import { makeSnapshot, makeAnswer } from '../fixtures/snapshot'

vi.mock('../../src/frontend/components/HomeScreen', () => ({ HomeScreen: ({ onSubmit }: { onSubmit: (q: string) => void }) => <button onClick={() => onSubmit('Synthetic investigation question')}>Submit synthetic question</button> }))
vi.mock('../../src/frontend/components/Header', () => ({ Header: () => <header>Test header</header> }))
vi.mock('../../src/frontend/components/Footer', () => ({ Footer: () => null }))
vi.mock('../../src/frontend/components/MethodSheet', () => ({ MethodSheet: () => null }))

let root: Root, host: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  window.history.replaceState(null, '', '/')
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
async function flush() { await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve() }) }
async function mount() { await act(async () => root.render(<LiveWorkspace onDemo={() => undefined} />)); await flush() }
async function click(label: string) {
  const element = [...host.querySelectorAll('button')].find(button => button.textContent === label)
  expect(element, label).toBeTruthy()
  await act(async () => element!.click()); await flush()
}
function detail(id: string, status: 'FAILED' | 'PENDING' | 'SUCCEEDED', snapshotId: string | null = null) {
  const at = '2026-10-25T06:00:00.000Z'
  return { investigation: { id, question: 'Synthetic investigation question', status, stage: status === 'SUCCEEDED' ? 'COMPLETED' : 'CREATED', error: status === 'FAILED' ? { code: 'PROVIDER_FAILED', message: 'Synthetic service failure', retryable: false } : null, createdAt: at, updatedAt: at, startedAt: null, completedAt: status === 'PENDING' ? null : at, resultSnapshotId: snapshotId }, identityConfirmation: null, retry: { allowed: status === 'FAILED', reason: 'Synthetic retry policy', remaining: 1, expectedAttemptCount: 1 } }
}
describe('live workspace controller and report with synthetic HTTP only', () => {
  it('retains the idempotency key after uncertain submission and does not display a fake result', async () => {
    const keys: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url, init: RequestInit) => { keys.push((init.headers as Record<string, string>)['Idempotency-Key']!); throw new Error('Synthetic lost connection') }))
    await mount(); await click('Submit synthetic question'); await click('Submit synthetic question')
    expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1])
    expect(host.textContent).toContain('NETWORK_ERROR'); expect(host.textContent).not.toContain('客观回答')
  })
  it('reads after 409, preserves the rejected operation error and never replays POST', async () => {
    const id = randomUUID(); window.history.replaceState(null, '', `/?investigation=${id}`)
    let reads = 0, posts = 0
    vi.stubGlobal('fetch', vi.fn(async (_url, init: RequestInit) => {
      if (init.method === 'POST') { posts++; return Response.json({ error: { code: 'CONFLICT', message: 'Synthetic stale attempt' } }, { status: 409 }) }
      return Response.json(detail(id, ++reads === 1 ? 'FAILED' : 'PENDING'))
    }))
    await mount(); await click('重试这次调查')
    expect(posts).toBe(1); expect(reads).toBeGreaterThanOrEqual(2)
    expect(host.textContent).toContain('操作未接受'); expect(host.textContent).toContain('409 / CONFLICT'); expect(host.textContent).toContain('排队中')
  })
  it('renders real contract semantics and honest unknowns without scenario substitution', async () => {
    const snapshot = makeSnapshot(), answer = makeAnswer(snapshot)
    snapshot.claims[0]!.kind = 'OFFICIAL_CLAIM'; snapshot.claims[0]!.verificationStatus = 'SUPPORTED'
    snapshot.gaps.push({ id: randomUUID(), kind: 'INSUFFICIENT_EVIDENCE', claimIds: [], description: 'Synthetic overall gap', searchScope: null })
    window.history.replaceState(null, '', `/?investigation=${snapshot.investigationId}`)
    vi.stubGlobal('fetch', vi.fn(async url => Response.json(String(url).startsWith('/api/snapshots/') ? { snapshot, answers: [answer] } : detail(snapshot.investigationId, 'SUCCEEDED', snapshot.id))))
    await mount()
    expect(host.textContent).toContain('Synthetic test answer [1].')
    expect(host.textContent).toContain('不表示能力已获独立实测证实')
    expect(host.textContent).toContain('整体缺口／未关联具体主张')
    expect(host.textContent).toContain('未知，不计独立')
    expect(host.querySelector(`[id="claim-${snapshot.claims[0]!.id}"]`)).not.toBeNull()
    expect(host.querySelector(`[href="#evidence-${snapshot.evidence[0]!.id}"]`)).not.toBeNull()
    expect(host.textContent).toContain('按你的用途生成建议')
  })
  it('ignores late reads after unmount rather than updating another view', async () => {
    const id = randomUUID(); window.history.replaceState(null, '', `/?investigation=${id}`)
    let complete!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { complete = resolve })))
    await mount(); await act(async () => root.render(<p>Different view</p>))
    await act(async () => { complete(Response.json(detail(id, 'PENDING'))); await Promise.resolve() }); await flush()
    expect(host.textContent).toBe('Different view')
  })
  it('keeps objective answers visible when a resumed advice request is missing', async () => {
    const snapshot = makeSnapshot(), answer = makeAnswer(snapshot)
    window.history.replaceState(null, '', `/?investigation=${snapshot.investigationId}&advice=${randomUUID()}`)
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (String(url).includes('/advice-requests/')) return Response.json({ error: { code: 'NOT_FOUND', message: 'Synthetic missing advice' } }, { status: 404 })
      return Response.json(String(url).startsWith('/api/snapshots/') ? { snapshot, answers: [answer] } : detail(snapshot.investigationId, 'SUCCEEDED', snapshot.id))
    }))
    await mount()
    expect(host.textContent).toContain('Synthetic test answer [1].')
    expect(host.textContent).toContain('404 / NOT_FOUND')
  })
})
