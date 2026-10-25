import { useRef, useState, type ReactNode } from 'react'
import { motion, useScroll } from 'motion/react'
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  HelpCircle,
  History,
  Lock,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Result } from '../types'
import { cn } from '../lib/utils'
import { useCase } from './CaseContext'
import { RichText, SectionLabel } from './ui'
import {
  CapabilityTable,
  ConflictBlock,
  EvidenceIndex,
  FactsTable,
  FollowUps,
  GapsList,
  SourceRecord,
  VerdictPanel,
} from './ResultSections'

export function ResultScreen({
  result,
  question,
  historyAt,
  caseNo,
  offline,
  onReconnect,
  onRestart,
  onHome,
  onFollowUp,
  onToast,
}: {
  result: Result
  question: string
  historyAt?: string | undefined
  caseNo?: string | undefined
  offline: boolean
  onReconnect: () => void
  onRestart: () => void
  onHome: () => void
  onFollowUp: (q: string) => void
  onToast: (message: string) => void
}) {
  const { openEvidence } = useCase()
  const { scrollYProgress } = useScroll()
  const [copied, setCopied] = useState(false)
  const followRef = useRef<HTMLElement>(null)

  const restricted = result.sources.filter((source) => source.readStatus === 'restricted')
  const relationCounts = {
    supports: result.sources.filter((source) => source.relation === 'supports').length,
    conflicts: result.sources.filter((source) => source.relation === 'conflicts').length,
    unclear: result.sources.filter((source) => source.relation === 'unclear').length,
    restricted: restricted.length,
  }
  const date = historyAt ?? result.investigatedAt
  const caseId = caseNo ?? result.caseNo
  const isInsufficient = result.kind === 'insufficient'

  const kindLabel = isInsufficient
    ? '证据核查'
    : result.verdict
      ? '按用途评测'
      : result.flags?.conflict
        ? '分歧核查'
        : '事实核对'

  let cursor = 2
  const pad = (n: number) => String(n).padStart(2, '0')
  const conflictNo = result.conflict ? pad(cursor++) : null
  const capabilityNo = result.capability ? pad(cursor++) : null
  const gapsNo = pad(cursor++)
  const sourcesNo = pad(cursor++)
  const followNo = pad(cursor)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      onToast('复制失败，请从地址栏复制。')
    }
  }

  const jumpToFollow = () => {
    followRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => document.getElementById('follow-up-input')?.focus(), 520)
  }

  return (
    <>
      <motion.div
        aria-hidden="true"
        style={{ scaleX: scrollYProgress }}
        className="pointer-events-none fixed inset-x-0 top-16 z-30 h-[2px] origin-left bg-seal/55"
      />
      <div className="mx-auto max-w-[1240px] px-5 pb-16 pt-6 sm:px-8">
      <header className="border-b border-line/80 pb-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[8.5px] tracking-[0.1em] text-ink-faint">
            <button type="button" onClick={onHome} className="transition-colors hover:text-seal">
              案卷
            </button>
            <span className="text-line-strong">/</span>
            <span>{caseId}</span>
            <span className="h-3 w-px bg-line" />
            <span>{kindLabel}</span>
            <span className="rounded-[3px] border border-line bg-paper-deep/30 px-1.5 py-px text-[7.5px] tracking-[0.14em]">
              样稿
            </span>
            {historyAt && (
              <span className="rounded-[3px] border border-unclear/30 bg-unclear-soft/40 px-1.5 py-px text-[7.5px] tracking-[0.1em] text-unclear">
                历史结果
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-paper-raised/60 px-3 text-[10.5px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              {copied ? <Check size={11} className="text-support" /> : <Copy size={11} />}
              {copied ? '已复制' : '复制链接'}
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-paper-raised/60 px-3 text-[10.5px] text-ink-soft transition-colors hover:border-seal/40 hover:text-seal"
            >
              <RefreshCw size={11} />
              重新调查
            </button>
          </div>
        </div>

        <h1 className="mt-6 max-w-[46rem] font-display text-[clamp(1.65rem,3.6vw,2.55rem)] font-semibold leading-[1.35] tracking-[-0.01em]">
          {question}
        </h1>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {result.scope.map((item) => (
            <div key={item.label}>
              <dt className="font-mono text-[9px] tracking-[0.14em] text-ink-faint">{item.label}</dt>
              <dd className="mt-1 text-[11.5px] leading-snug text-ink-soft">
                {item.label === '时点' && historyAt ? historyAt : item.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Stat icon={Check} label="支持" value={relationCounts.supports} tone="support" />
          <Stat
            icon={AlertTriangle}
            label="冲突"
            value={relationCounts.conflicts}
            tone="conflict"
          />
          <Stat
            icon={HelpCircle}
            label="尚不能判断"
            value={relationCounts.unclear}
            tone="unclear"
          />
          <Stat icon={Lock} label="读取受限" value={relationCounts.restricted} tone="neutral" />
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9.5px] text-ink-faint">
          <span>调查于 {date}</span>
          <span className="h-2.5 w-px bg-line" />
          <span>{result.sources.length} 份材料</span>
          <span className="h-2.5 w-px bg-line" />
          <span>{result.activities.length} 条记录</span>
        </p>
      </header>

      <div className="mt-5 space-y-2">
        {offline && (
          <Banner
            tone="conflict"
            icon={<WifiOff size={13} />}
            title="网络已断开"
            body={`状态未更新 · 仍显示 ${date} 的内容`}
            action={
              <button
                type="button"
                onClick={onReconnect}
                className="inline-flex items-center gap-1.5 rounded-full border border-conflict/30 bg-paper-raised/70 px-3 py-1.5 text-[10.5px] text-conflict transition-colors hover:bg-conflict hover:text-paper-raised"
              >
                <RefreshCw size={10} />
                重新连接
              </button>
            }
          />
        )}

        {historyAt && (
          <Banner
            tone="unclear"
            icon={<History size={13} />}
            title="这是历史结果"
            body={`调查于 ${historyAt} · 此后可能已变化`}
            action={
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex items-center gap-1.5 rounded-full border border-unclear/30 bg-paper-raised/70 px-3 py-1.5 text-[10.5px] text-unclear transition-colors hover:bg-unclear hover:text-paper-raised"
              >
                <RefreshCw size={10} />
                重新调查
              </button>
            }
          />
        )}

        {restricted.length > 0 && (
          <Banner
            tone="conflict"
            icon={<Lock size={13} />}
            title={`${restricted.length} 个来源读取受限`}
            body={`${restricted.map((source) => source.title).join('、')} 未取得正文`}
            action={
              <button
                type="button"
                onClick={() => openEvidence(restricted[0]!.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong/70 bg-paper-raised/70 px-3 py-1.5 text-[10.5px] text-ink-soft transition-colors hover:text-seal"
              >
                查看
                <ArrowUpRight size={10} />
              </button>
            }
          />
        )}
      </div>

      <div className="mt-10 grid gap-14 lg:grid-cols-[minmax(0,1fr)_318px] lg:gap-16">
        <article className="mx-auto w-full min-w-0 max-w-[46rem]">
          <section className="scroll-mt-24">
            <SectionLabel
              index="01"
              title={isInsufficient ? '已能确认' : '核心回答'}
              aside={
                !isInsufficient ? (
                  <span className="hidden font-mono text-[8px] tracking-[0.1em] text-ink-faint sm:inline">
                    AI 归纳
                  </span>
                ) : undefined
              }
            />

            {isInsufficient ? (
              <>
                <div className="mt-4 rounded-[10px] border border-unclear/30 bg-unclear-soft/25 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-unclear/35 bg-paper-raised/60 px-2.5 py-1 font-mono text-[8.5px] tracking-[0.12em] text-unclear">
                      <AlertTriangle size={10} />
                      证据不足
                    </span>
                  </div>
                  <p className="mt-3 font-display text-[18px] leading-[1.85] text-ink">
                    <RichText text={result.tldr} />
                  </p>
                </div>
                <ul className="mt-6 space-y-4">
                  {result.answer.map((paragraph) => (
                    <li key={paragraph} className="flex gap-3">
                      <Check size={13} className="mt-2 shrink-0 text-support" />
                      <p className="font-sans text-[14.5px] leading-[1.85] text-ink-soft">
                        <RichText text={paragraph} />
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                {result.verdict && (
                  <div className="mt-4">
                    <VerdictPanel result={result} />
                  </div>
                )}
                <div className="relative mt-5 rounded-[10px] border border-line bg-paper-raised/70 p-5 sm:p-6">
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-seal/75" />
                  <p className="font-display text-[18.5px] leading-[1.85] text-ink sm:text-[21px]">
                    <RichText text={result.tldr} />
                  </p>
                </div>
                <div className="mt-6 space-y-5 font-sans text-[15px] leading-[1.85] text-ink-soft">
                  {result.answer.map((paragraph) => (
                    <p key={paragraph}>
                      <RichText text={paragraph} />
                    </p>
                  ))}
                </div>
                {result.facts && <FactsTable result={result} asOf={date.slice(0, 10)} />}
              </>
            )}
          </section>

          {result.conflict && conflictNo && (
            <section className="mt-14 scroll-mt-24">
              <SectionLabel index={conflictNo} title="关键证据与分歧" />
              <div className="mt-4">
                <ConflictBlock result={result} />
              </div>
            </section>
          )}

          {result.capability && capabilityNo && (
            <section className="mt-14 scroll-mt-24">
              <SectionLabel index={capabilityNo} title="能力对照" />
              <div className="mt-3">
                <CapabilityTable result={result} />
              </div>
            </section>
          )}

          <section className="mt-14 scroll-mt-24">
            <SectionLabel
              index={gapsNo}
              title={isInsufficient ? '还不能确定' : '证据缺口'}
            />
            <GapsList result={result} />
          </section>

          <section className="mt-14 scroll-mt-24">
            <SectionLabel index={sourcesNo} title={isInsufficient ? '查过哪些来源' : '搜索与来源记录'} />
            <SourceRecord result={result} />
          </section>

          <section ref={followRef} className="mt-14 scroll-mt-24">
            <SectionLabel index={followNo} title="继续提问" />
            <FollowUps result={result} onFollowUp={onFollowUp} />
          </section>

          <div className="mt-10 border-t border-line/70 pt-4 font-mono text-[9px] leading-relaxed text-ink-faint">
            {caseId} · ARCHIVED {date}
          </div>
        </article>

        <EvidenceIndex result={result} onAsk={jumpToFollow} caseNo={caseId} />
      </div>
      </div>
    </>
  )
}

const statTone = {
  support: 'border-support/25 bg-support-soft/55 text-support',
  conflict: 'border-conflict/25 bg-conflict-soft/55 text-conflict',
  unclear: 'border-unclear/25 bg-unclear-soft/55 text-unclear',
  neutral: 'border-line bg-paper-raised/65 text-ink-soft',
} as const

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  tone: keyof typeof statTone
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9.5px]',
        statTone[tone],
      )}
    >
      <Icon size={10} />
      {label}
      <span className="font-mono text-[10px]">{value}</span>
    </span>
  )
}

function Banner({
  tone,
  icon,
  title,
  body,
  action,
}: {
  tone: 'conflict' | 'unclear'
  icon: ReactNode
  title: string
  body: string
  action: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[8px] border px-3.5 py-2.5',
        tone === 'conflict'
          ? 'border-conflict/25 bg-conflict-soft/30'
          : 'border-unclear/25 bg-unclear-soft/30',
      )}
    >
      <span className={cn('shrink-0', tone === 'conflict' ? 'text-conflict' : 'text-unclear')}>
        {icon}
      </span>
      <p className="text-[11px] font-medium text-ink">{title}</p>
      <p className="min-w-0 flex-1 text-[10.5px] leading-relaxed text-ink-soft">{body}</p>
      {action}
    </motion.div>
  )
}
