import { ArrowLeft, Ban, Check, CircleSlash, RefreshCw } from 'lucide-react'
import type { Scenario } from '../types'
import { cn } from '../lib/utils'

export function FailureScreen({
  scenario,
  question,
  onRetry,
  onHome,
}: {
  scenario: Scenario
  question: string
  onRetry: () => void
  onHome: () => void
}) {
  const failure = scenario.failure
  if (!failure) return null

  return (
    <div className="mx-auto max-w-[760px] px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 py-3">
        <button
          type="button"
          onClick={onHome}
          className="group inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft transition-colors hover:text-seal"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          回到首页
        </button>
        <span className="font-mono text-[8.5px] tracking-[0.12em] text-ink-faint">
          A-2026-1025-06 · 调查未完成
        </span>
      </div>

      <div className="mt-10 overflow-hidden rounded-[14px] border border-line bg-paper-raised/70 shadow-card">
        <div className="hatch h-2 w-full opacity-60" />
        <div className="p-6 sm:p-9">
          <div className="flex items-start justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-conflict/30 bg-conflict-soft/50 px-2.5 py-1 font-mono text-[8.5px] tracking-[0.14em] text-conflict">
                <CircleSlash size={10} />
                未生成结论
              </span>
              <h1 className="mt-5 font-display text-[30px] font-semibold leading-tight sm:text-[36px]">
                这次没查成。
              </h1>
              <p className="mt-3 max-w-[32rem] text-[14px] leading-[1.85] text-ink-soft">
                {failure.reason}
              </p>
            </div>
          </div>

          <p className="mt-6 font-display text-[16px] leading-[1.8] text-ink">{question}</p>

          <div className="mt-5 rounded-[10px] border border-line bg-paper p-4">
            <p className="mono-label text-ink-faint">失败原因</p>
            <p className="mt-2 font-mono text-[10.5px] leading-[1.9] text-ink-soft">{failure.detail}</p>
            <p className="mt-2 font-mono text-[9px] tracking-[0.08em] text-ink-faint">{failure.attempts}</p>
          </div>

          <div className="mt-5">
            <p className="mono-label text-ink-faint">已尝试的动作</p>
            <ol className="mt-2 border-y border-line/70">
              {scenario.activities.map((activity, index) => {
                const failed = activity.status === 'failed'
                return (
                  <li
                    key={activity.id}
                    className="grid grid-cols-[24px_1fr_auto] items-start gap-3 border-b border-line/60 py-2.5 last:border-0"
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-5 w-5 place-items-center rounded-full border',
                        failed
                          ? 'border-conflict/25 bg-conflict-soft/60 text-conflict'
                          : 'border-line bg-paper-raised text-ink-faint',
                      )}
                    >
                      {failed ? <Ban size={10} /> : <Check size={10} />}
                    </span>
                    <div>
                      <p className="text-[11.5px] text-ink">{activity.title}</p>
                      {activity.query && (
                        <p className="mt-0.5 font-mono text-[9px] text-ink-faint">“{activity.query}”</p>
                      )}
                    </div>
                    <span className="font-mono text-[8.5px] text-ink-faint">
                      {failed ? '超时' : index === 0 ? '完成' : '无结果'}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-seal px-5 text-[12px] text-white transition-colors hover:bg-seal-deep"
            >
              <RefreshCw size={12} />
              重试调查
            </button>
            <button
              type="button"
              onClick={onHome}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-paper px-5 text-[12px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              换个问法
            </button>
            <span className="ml-auto font-mono text-[8.5px] text-ink-faint">
              没有生成任何结论 · 0 份材料
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
