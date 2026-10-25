'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { IdSchema, type AdviceRequestDetail, type InvestigationDetail, type SnapshotResponse } from '../../contracts'
import { ApiError, conditionsFromText, createApiClient } from '../lib/api'
import { states, stages } from '../lib/live-labels'
import { Header } from './Header'
import { Footer } from './Footer'
import { HomeScreen } from './HomeScreen'
import { MethodSheet } from './MethodSheet'
import { Report, Section } from './LiveReport'

const api = createApiClient()
const button = 'rounded-full border border-line-strong px-4 py-2 text-sm text-seal disabled:opacity-50'
const field = 'w-full rounded-lg border border-line-strong bg-paper-raised p-3 text-ink'

function message(error: unknown) {
  return error instanceof ApiError
    ? `${error.message}（${error.status || '网络'} / ${error.code}）`
    : '操作未完成，请保留输入并检查状态。'
}

export function LiveWorkspace({ onDemo }: { onDemo: () => void }) {
  const [investigationId, setInvestigationId] = useState<string | null>(null)
  const [detail, setDetail] = useState<InvestigationDetail | null>(null)
  const [source, setSource] = useState<SnapshotResponse | null>(null)
  const [adviceId, setAdviceId] = useState<string | null>(null)
  const [advice, setAdvice] = useState<AdviceRequestDetail | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [clarification, setClarification] = useState('')
  const [conditions, setConditions] = useState('')
  const [question, setQuestion] = useState('')
  const [method, setMethod] = useState(false)
  const [revision, setRevision] = useState(0)
  const askRef = useRef<HTMLTextAreaElement>(null)
  const submitKey = useRef<{ payload: string; key: string } | null>(null)
  const adviceKey = useRef<{ payload: string; key: string } | null>(null)
  const operationLock = useRef(false)
  const generation = useRef(0)
  const current = useRef({ investigationId, adviceId })
  current.current = { investigationId, adviceId }

  const url = (id: string | null, aid: string | null) => {
    const next = new URL(window.location.href)
    if (id) next.searchParams.set('investigation', id)
    else next.searchParams.delete('investigation')
    if (aid) next.searchParams.set('advice', aid)
    else next.searchParams.delete('advice')
    window.history.replaceState(null, '', next)
  }

  useEffect(() => {
    const params = new URL(window.location.href).searchParams
    const id = IdSchema.safeParse(params.get('investigation'))
    const aid = IdSchema.safeParse(params.get('advice'))
    if (id.success) {
      setInvestigationId(id.data)
      if (aid.success) setAdviceId(aid.data)
    }
    return () => {
      generation.current++
    }
  }, [])

  const refresh = useCallback(async (id: string, aid: string | null, signal: AbortSignal) => {
    const fresh = await api.detail(id, signal)
    const snapshot = fresh.investigation.resultSnapshotId
      ? await api.snapshot(fresh.investigation.resultSnapshotId, id, signal)
      : null
    if (signal.aborted || current.current.investigationId !== id || current.current.adviceId !== aid) return null
    // A missing/broken advice request must never hide a valid objective report.
    setDetail(fresh)
    setSource(snapshot)
    setReadError(null)
    const result = aid ? await api.advice(id, aid, signal) : null
    if (signal.aborted || current.current.investigationId !== id || current.current.adviceId !== aid) return null
    if (result && (!snapshot || result.request.snapshotId !== snapshot.snapshot.id)) {
      setAdvice(null)
      throw new ApiError(200, 'SCOPE_MISMATCH', '建议绑定的快照与当前报告不同，已停止混合显示。')
    }
    setAdvice(result)
    return { fresh, result }
  }, [])

  useEffect(() => {
    if (!investigationId) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
      try {
        const state = await refresh(investigationId, adviceId, controller.signal)
        if (!state || controller.signal.aborted) return
        if (
          ['PENDING', 'RUNNING', 'AWAITING_CONFIRMATION'].includes(state.fresh.investigation.status) ||
          (state.result && ['PENDING', 'RUNNING'].includes(state.result.request.status))
        ) {
          timer = setTimeout(poll, 1500)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setReadError(message(error))
          timer = setTimeout(poll, 5000)
        }
      }
    }
    void poll()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [investigationId, adviceId, refresh, revision])

  const operate = async (action: () => Promise<void>) => {
    if (operationLock.current) return
    operationLock.current = true
    setBusy(true)
    setOperationError(null)
    const token = generation.current
    try {
      await action()
    } catch (error) {
      if (token === generation.current) {
        setOperationError(
          message(error) +
            (error instanceof ApiError && error.status === 409
              ? ' 操作未接受，正在重新读取状态；不会自动重放提交。'
              : ''),
        )
        if (error instanceof ApiError && error.status === 409) setRevision((value) => value + 1)
      }
    } finally {
      operationLock.current = false
      if (token === generation.current) setBusy(false)
    }
  }

  const submit = (text: string) =>
    void operate(async () => {
      setQuestion(text)
      const payload = text.trim()
      if (submitKey.current?.payload !== payload) submitKey.current = { payload, key: crypto.randomUUID() }
      const accepted = await api.create(payload, submitKey.current.key)
      setDetail(null)
      setSource(null)
      setAdvice(null)
      setAdviceId(null)
      setInvestigationId(accepted.investigationId)
      current.current = { investigationId: accepted.investigationId, adviceId: null }
      setReadError(null)
      url(accepted.investigationId, null)
    })

  const home = () => {
    if (operationLock.current) return
    generation.current++
    submitKey.current = null
    adviceKey.current = null
    setQuestion('')
    setClarification('')
    setConditions('')
    setInvestigationId(null)
    setDetail(null)
    setSource(null)
    setAdviceId(null)
    setAdvice(null)
    setReadError(null)
    setOperationError(null)
    url(null, null)
  }

  const createAdvice = () =>
    void operate(async () => {
      if (!source || !investigationId) return
      const body = { snapshotId: source.snapshot.id, userConditions: conditionsFromText(conditions) }
      const payload = JSON.stringify({ investigationId, body })
      if (adviceKey.current?.payload !== payload) adviceKey.current = { payload, key: crypto.randomUUID() }
      const accepted = await api.createAdvice(investigationId, body, adviceKey.current.key)
      setAdvice(null)
      setAdviceId(accepted.adviceRequestId)
      current.current = { investigationId, adviceId: accepted.adviceRequestId }
      url(investigationId, accepted.adviceRequestId)
      setRevision((value) => value + 1)
    })

  return (
    <div className="min-h-screen text-ink [overflow-wrap:anywhere]">
      <Header onHome={home} onNew={home} onMethod={() => setMethod(true)} />
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 pt-5 text-xs text-ink-soft">
        <span>正式调查 · 结果来自实际任务</span>
        <button className="underline" disabled={busy} onClick={onDemo}>
          查看演示样稿
        </button>
      </div>
      {operationError && (
        <p role="alert" className="mx-auto mt-5 max-w-5xl whitespace-pre-wrap border border-line p-4">
          {operationError}
        </p>
      )}
      {!investigationId ? (
        <HomeScreen
          onSubmit={submit}
          onExample={(_id, text) => submit(text)}
          onArchive={onDemo}
          askRef={askRef}
          live
          initialText={question}
          busy={busy}
        />
      ) : (
        <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
          <h1 className="font-display text-3xl leading-snug">
            {detail?.investigation.question ?? (question || '正在读取调查')}
          </h1>
          <p className="mt-4 break-all text-xs text-ink-soft">调查 {investigationId}</p>
          <div className="my-6 flex flex-wrap items-center gap-4">
            <p role="status" aria-live="polite">
              {detail
                ? `${states[detail.investigation.status]} · ${stages[detail.investigation.stage]}`
                : '正在读取真实状态…'}
            </p>
            <button className={button} onClick={() => setRevision((value) => value + 1)}>
              重新读取
            </button>
            <button className={button} disabled={busy} onClick={home}>
              新调查
            </button>
          </div>
          {readError && (
            <p role="alert" className="my-4 border border-line p-4">
              读取失败：{readError}；已显示的内容来自上次读取，网络恢复后继续读取。
            </p>
          )}
          {detail?.investigation.status === 'PENDING' && <p>任务等待独立 Worker 领取，页面不会模拟调查进度。</p>}
          {detail?.investigation.error && (
            <p role="alert">
              {detail.investigation.error.message}（{detail.investigation.error.code}）
            </p>
          )}
          {detail?.investigation.status === 'FAILED' && (
            <div className="my-4 space-y-3">
              <p>
                {detail.retry.reason}；剩余恢复机会 {detail.retry.remaining}
              </p>
              <button
                className={button}
                disabled={busy || !detail.retry.allowed}
                onClick={() =>
                  void operate(async () => {
                    await api.retry(investigationId, detail.retry.expectedAttemptCount)
                    setRevision((value) => value + 1)
                  })
                }
              >
                重试这次调查
              </button>
            </div>
          )}
          {detail?.identityConfirmation && (
            <Section title="确认你要调查的产品">
              <p>{detail.identityConfirmation.reason}</p>
              <p>当前候选：{detail.identityConfirmation.identity.name}</p>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  void operate(async () => {
                    await api.confirm(investigationId, {
                      expectedAttemptCount: detail.retry.expectedAttemptCount,
                      identity: {
                        ...detail.identityConfirmation!.identity,
                        userClarification: clarification.trim(),
                      },
                    })
                    setRevision((value) => value + 1)
                  })
                }}
              >
                <label className="block" htmlFor="identity-clarification">
                  请用一句话说明指哪个产品，不要求提供官网或证据
                </label>
                <textarea
                  id="identity-clarification"
                  className={field}
                  maxLength={500}
                  value={clarification}
                  onChange={(event) => setClarification(event.target.value)}
                  required
                />
                <button className={button} disabled={busy || !clarification.trim()}>
                  确认并继续
                </button>
              </form>
            </Section>
          )}
          {source && (
            <>
              <Report data={source} />
              <Section title="按你的用途生成建议">
                <p className="text-sm text-ink-soft">
                  客观回答保持在上方。用一句话说明真实用途、期望与已知限制，未知可以不填。
                </p>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    createAdvice()
                  }}
                >
                  <label htmlFor="advice-conditions" className="block">
                    我的用途与要求
                  </label>
                  <textarea
                    id="advice-conditions"
                    className={field}
                    value={conditions}
                    onChange={(event) => setConditions(event.target.value)}
                    maxLength={4000}
                    required
                  />
                  <button className={button} disabled={busy || !conditions.trim()}>
                    生成建议
                  </button>
                </form>
                {adviceId && (
                  <p className="break-all text-xs">
                    建议请求 {adviceId} · 快照 {source.snapshot.id}
                  </p>
                )}
                {advice && (
                  <article className="space-y-3">
                    <p role="status">{states[advice.request.status]}</p>
                    <p className="whitespace-pre-wrap text-sm">本次条件：{advice.request.userConditions.useCase}</p>
                    {advice.request.conditionsIssue && (
                      <div>
                        <p>{advice.request.conditionsIssue.message}</p>
                        <ul className="list-disc pl-5">
                          {advice.request.conditionsIssue.missingConditions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                        <p>补充后提交新请求，原请求仍保留。</p>
                      </div>
                    )}
                    {advice.request.error && (
                      <p role="alert">
                        {advice.request.error.message}（{advice.request.error.code}）
                      </p>
                    )}
                    {advice.advice && (
                      <div className="whitespace-pre-wrap leading-loose">
                        <h3 className="mb-3 text-lg">基于本次条件的建议 · 模型归纳</h3>
                        {advice.advice.content}
                      </div>
                    )}
                  </article>
                )}
              </Section>
            </>
          )}
        </main>
      )}
      <Footer />
      <MethodSheet open={method} onClose={() => setMethod(false)} />
    </div>
  )
}
