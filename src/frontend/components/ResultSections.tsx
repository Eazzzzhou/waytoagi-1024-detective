import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  ArrowUpRight,
  Archive,
  Check,
  ChevronDown,
  CircleDashed,
  FileText,
  GitBranch,
  HelpCircle,
  Lock,
  Maximize2,
  RotateCw,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react'
import type { Activity, Evidence, Result } from '../types'
import { activityTime, cn, SOURCE_TYPE_LABEL } from '../lib/utils'
import { useCase } from './CaseContext'
import { Cite, RelationTag, RichText, SourceTypeTag } from './ui'

const ease = [0.16, 1, 0.3, 1] as const

/* ── Verdict ────────────────────────────────────────────────── */

export function VerdictPanel({ result }: { result: Result }) {
  const verdict = result.verdict
  if (!verdict) return null
  const tone =
    verdict.level === 'worth'
      ? 'text-support border-support/30'
      : verdict.level === 'avoid'
        ? 'text-conflict border-conflict/30'
        : verdict.level === 'insufficient'
          ? 'text-unclear border-unclear/30'
          : 'text-unclear border-unclear/30'

  return (
    <div className={cn('relative overflow-hidden rounded-[12px] border bg-paper-raised/70 p-5 sm:p-6', tone)}>
      <span className="absolute inset-y-0 left-0 w-[3px] bg-current opacity-70" />
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono-label text-ink-faint">{verdict.eyebrow}</span>
            {result.conditions?.map((condition) => (
              <span
                key={condition}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-paper/60 px-2 py-[3px] text-[10px] text-ink-soft"
              >
                <Check size={9} className="text-seal/70" />
                {condition}
              </span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-[30px] font-semibold leading-none tracking-[-0.01em] sm:text-[34px]">
              {verdict.label}
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.16em] text-ink-faint">
              CONDITIONAL VERDICT
            </span>
          </div>

          <p className="mt-3 max-w-[36rem] text-[13px] leading-[1.9] text-ink-soft">
            {verdict.summary}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-x-6 gap-y-3 border-t border-line/80 pt-4 sm:grid-cols-2">
        {verdict.conditions.map((condition) => (
          <div key={condition.label} className="flex gap-2.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-seal/70" />
            <div>
              <p className="text-[10.5px] font-medium text-ink">{condition.label}</p>
              <p className="mt-0.5 text-[11.5px] leading-[1.7] text-ink-faint">{condition.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 font-mono text-[9.5px] tracking-[0.1em] text-ink-faint">
        仅针对当前条件
      </p>
    </div>
  )
}

/* ── Facts table ────────────────────────────────────────────── */

export function FactsTable({ result, asOf }: { result: Result; asOf: string }) {
  const facts = result.facts
  if (!facts) return null

  return (
    <div className="mt-7">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11.5px] font-medium text-ink">{facts.title}</p>
        <span className="font-mono text-[9.5px] tracking-[0.1em] text-ink-faint">AS OF {asOf}</span>
      </div>
      <div className="mt-2.5 overflow-x-auto rounded-[8px] border border-line">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="bg-paper-deep/25">
              {facts.columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-line px-3.5 py-2.5 font-mono text-[9.5px] font-normal uppercase tracking-[0.1em] text-ink-faint"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facts.rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-line/60 bg-paper-raised/50 transition-colors last:border-0 hover:bg-seal-soft/20"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      'px-3.5 py-3 text-[12px] leading-relaxed text-ink-soft',
                      j === 0 && 'font-medium text-ink',
                    )}
                  >
                    <RichText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {facts.note && (
        <p className="mt-2 text-[10.5px] leading-[1.7] text-ink-faint">
          <RichText text={facts.note} />
        </p>
      )}
    </div>
  )
}

/* ── Conflict ───────────────────────────────────────────────── */

const sideLabel = {
  official: '官方口径',
  independent: '独立实测',
  media: '媒体复核',
} as const

export function ConflictBlock({ result }: { result: Result }) {
  const { openEvidence } = useCase()
  const conflict = result.conflict
  if (!conflict) return null

  return (
    <div>
      <p className="text-[12.5px] text-ink-soft">{conflict.summary}</p>
      <div className="mt-4 space-y-2.5">
        {conflict.items.map((item) => {
          const source = result.sources.find((s) => s.id === item.sourceId)
          if (!source) return null
          return (
            <div
              key={item.sourceId}
              className={cn(
                'rounded-[10px] border bg-paper-raised/60 p-4 sm:p-5',
                source.relation === 'conflicts' ? 'border-conflict/20' : 'border-line',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-line bg-paper px-2 py-[3px] font-mono text-[9.5px] tracking-[0.1em] text-ink-faint">
                    {sideLabel[item.side]}
                  </span>
                  <SourceTypeTag type={source.sourceType} />
                </div>
                <RelationTag relation={source.relation} />
              </div>

              <blockquote
                className={cn(
                  'mt-3 border-l-2 pl-4 font-display text-[13.5px] leading-[1.85] text-ink',
                  source.relation === 'conflicts' ? 'border-conflict/40' : 'border-line-strong',
                )}
              >
                “<RichText text={item.excerpt} />”
              </blockquote>

              {source.translation && (
                <p className="mt-2 flex gap-1.5 text-[11px] leading-[1.8] text-ink-faint">
                  <span className="mt-[3px] shrink-0 font-mono text-[7.5px] tracking-[0.08em] text-seal/70">
                    译
                  </span>
                  <span>{source.translation}</span>
                </p>
              )}

              <p className="mt-2.5 font-mono text-[9px] leading-relaxed text-ink-faint">
                成立条件 · {item.condition}
              </p>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line/60 pt-2.5">
                <span className="truncate font-mono text-[9px] text-ink-faint">
                  {source.title} · {source.site}
                </span>
                <button
                  type="button"
                  onClick={(event) => openEvidence(source.id, event.currentTarget)}
                  className="inline-flex shrink-0 items-center gap-1 text-[10px] text-seal/80 transition-colors hover:text-seal"
                >
                  查看原句
                  <ArrowUpRight size={10} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 rounded-[8px] border border-support/20 bg-support-soft/25 p-4">
        <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] text-support">
          <ShieldCheck size={11} />
          如何理解这组分歧
        </p>
        <p className="mt-1.5 text-[12px] leading-[1.85] text-ink-soft">{conflict.reconcile}</p>
      </div>
    </div>
  )
}

/* ── Gaps ───────────────────────────────────────────────────── */

export function GapsList({ result }: { result: Result }) {
  return (
    <ol className="mt-4 border-y border-line/70">
      {result.gaps.map((gap, i) => (
        <li key={gap.title} className="grid grid-cols-[26px_1fr] gap-3 border-b border-line/60 py-4 last:border-0">
          <span className="font-mono text-[9px] leading-[1.9] text-ink-faint">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <p className="text-[12.5px] font-medium text-ink">{gap.title}</p>
            <p className="mt-1 text-[12px] leading-[1.85] text-ink-soft">{gap.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ── Capability ─────────────────────────────────────────────── */

const levelTone = {
  strong: 'border-support/30 bg-support-soft text-support',
  ok: 'border-official/25 bg-official-soft text-official',
  weak: 'border-unclear/25 bg-unclear-soft text-unclear',
  none: 'border-dashed border-line-strong bg-transparent text-ink-faint',
} as const

export function CapabilityTable({ result }: { result: Result }) {
  const [expanded, setExpanded] = useState(false)
  const capability = result.capability
  if (!capability) return null
  const visible = expanded ? capability.rows : capability.rows.filter((row) => row.relevant)

  return (
    <div>
      <div className="mt-3 overflow-hidden rounded-[8px] border border-line">
        {visible.map((row, index) => (
          <div
            key={row.dim}
            className={cn(
              'grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 px-3.5 py-3 sm:grid-cols-[140px_88px_1fr_auto] sm:items-start',
              index !== 0 && 'border-t border-line/60',
              row.relevant && 'bg-seal-soft/10',
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium text-ink">{row.dim}</span>
              {row.relevant && (
                <span className="rounded-full border border-seal/20 bg-seal-soft/50 px-1.5 py-px font-mono text-[7.5px] text-seal">
                  相关
                </span>
              )}
            </div>
            <span
              className={cn(
                'inline-flex w-fit items-center gap-1 rounded-full border px-2 py-[3px] text-[9.5px]',
                levelTone[row.level],
              )}
            >
              {row.level === 'none' ? <CircleDashed size={9} /> : null}
              {row.judgement}
            </span>
            <p className="col-span-2 text-[10.5px] leading-relaxed text-ink-faint sm:col-span-1 sm:pt-0.5">
              {row.scope}
            </p>
            <span className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto">
              {row.cite ? (
                <Cite id={row.cite} />
              ) : (
                <span className="font-mono text-[9px] text-line-strong">—</span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[32rem] text-[10.5px] leading-[1.75] text-ink-faint">{capability.note}</p>
        {capability.rows.some((row) => !row.relevant) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-paper-raised/70 px-3 py-1.5 text-[10.5px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            {expanded ? '只看与用途相关的维度' : `展开全部 ${capability.rows.length} 个维度`}
            <ChevronDown size={11} className={cn('transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Source record ──────────────────────────────────────────── */

const upstreamKey = (source: Evidence) =>
  (source.upstream ?? source.site)
    .replace(/（[^）]*）/g, '')
    .replace(/\s*官方.*$/g, '')
    .trim()

export function SourceRecord({ result }: { result: Result }) {
  const { openEvidence, openGraph } = useCase()
  const [logOpen, setLogOpen] = useState(false)
  const groups = Array.from(
    new Set(
      result.sources
        .filter((source) => source.readStatus !== 'restricted')
        .map(upstreamKey),
    ),
  )

  return (
    <div>
      <div className="mt-4 grid grid-cols-2 divide-line/70 overflow-hidden rounded-[8px] border border-line sm:grid-cols-4 sm:divide-x">
        {result.counts.map((count, index) => (
          <div
            key={count.label}
            className={cn(
              'px-4 py-4',
              index > 1 && 'border-t border-line/70 sm:border-t-0',
              index % 2 === 1 && 'border-l border-line/70 sm:border-l-0',
            )}
          >
            <p className="font-display text-[25px] font-semibold leading-none text-ink">{count.value}</p>
            <p className="mt-1.5 text-[10px] leading-snug text-ink-faint">{count.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[10px] leading-[1.7] text-ink-faint">读取受限 ≠ 未搜到。</p>

      <div className="mt-4 overflow-x-auto rounded-[8px] border border-line">
        <table className="w-full border-collapse text-left md:min-w-[680px]">
          <thead>
            <tr className="bg-paper-deep/25">
              {['#', '来源', '版本 / 套餐', '发布', '读取', '关系'].map((column, i) => (
                <th
                  key={column}
                  className={cn(
                    'border-b border-line px-3 py-2.5 font-mono text-[9px] font-normal uppercase tracking-[0.1em] text-ink-faint',
                    (i === 2 || i === 3 || i === 5) && 'hidden md:table-cell',
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.sources.map((source, index) => {
              const restricted = source.readStatus === 'restricted'
              return (
                <tr
                  key={source.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`打开证据 ${index + 1}：${source.title}`}
                  onClick={(event) => openEvidence(source.id, event.currentTarget)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openEvidence(source.id, event.currentTarget)
                    }
                  }}
                  className="cursor-pointer border-b border-line/60 bg-paper-raised/50 transition-colors last:border-0 hover:bg-seal-soft/20"
                >
                  <td className="px-3 py-3 align-top font-mono text-[9px] text-ink-faint">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="block font-sans text-[11.5px] font-medium leading-snug text-ink">
                      {source.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <SourceTypeTag type={source.sourceType} className="py-[2px] text-[9px]" />
                      <RelationTag relation={source.relation} className="md:hidden" />
                      <span className="truncate font-mono text-[9px] text-ink-faint">
                        {source.upstream ?? source.site}
                      </span>
                    </span>
                  </td>
                  <td className="hidden max-w-[130px] px-3 py-3 align-top text-[10px] leading-snug text-ink-soft md:table-cell">
                    {source.version ?? source.plan ?? '未标注'}
                  </td>
                  <td className="hidden px-3 py-3 align-top font-mono text-[9.5px] text-ink-faint md:table-cell">
                    {source.published ?? '未获取'}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 font-mono text-[9.5px]',
                        restricted ? 'text-conflict' : 'text-ink-faint',
                      )}
                    >
                      {restricted ? <Lock size={9} /> : <Check size={9} className="text-support" />}
                      {restricted ? '读取受限' : '已读取'}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 align-top md:table-cell">
                    <RelationTag relation={source.relation} compact />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 text-[10px] leading-[1.75] text-ink-faint">
        独立来源 {groups.length} · {groups.join('、')}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setLogOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised/70 px-3 py-1.5 text-[10.5px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          {logOpen ? '收起' : `记录 (${result.activities.length})`}
          <ChevronDown size={11} className={cn('transition-transform', logOpen && 'rotate-180')} />
        </button>
        <button
          type="button"
          onClick={openGraph}
          className="inline-flex items-center gap-1.5 text-[10.5px] text-seal/80 transition-colors hover:text-seal"
        >
          关系图
          <Maximize2 size={10} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {logOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="overflow-hidden"
          >
            <ActivityLog result={result} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const logIcon = {
  plan: GitBranch,
  search: Search,
  read: FileText,
  rescan: RotateCw,
  archive: Archive,
  clarify: HelpCircle,
} as const

function ActivityLog({ result }: { result: Result }) {
  const start = result.investigatedAt.slice(-5)
  return (
    <ol className="mt-3 rounded-[8px] border border-line/80 bg-paper/40 px-3 py-1">
      {result.activities.map((activity: Activity, index) => {
        const Icon = logIcon[activity.kind]
        return (
          <li
            key={activity.id}
            className="grid grid-cols-[44px_16px_1fr] items-start gap-2 border-b border-line/50 py-2 text-[10.5px] last:border-0"
          >
            <span className="font-mono text-[9px] leading-[1.7] text-ink-faint">
              {activityTime(start, index)}
            </span>
            <Icon size={10} />
            <div className="min-w-0">
              <p className="leading-snug text-ink-soft">
                {activity.title}
                {activity.query && (
                  <span className="ml-1 font-mono text-[9.5px] text-ink-faint">“{activity.query}”</span>
                )}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-ink-faint">
                {activity.engine && <span>{activity.engine}</span>}
                {activity.branch && <span>· {activity.branch}</span>}
                {activity.status === 'restricted' && <span className="text-conflict">· 读取受限</span>}
                {activity.status === 'empty' && <span className="text-unclear">· 未搜到相关结果</span>}
                {activity.status === 'failed' && <span className="text-conflict">· 超时</span>}
                {activity.status === 'skipped' && <span className="text-ink-faint">· 未执行</span>}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ── Follow-ups ─────────────────────────────────────────────── */

export function FollowUps({ result, onFollowUp }: { result: Result; onFollowUp: (q: string) => void }) {
  const [active, setActive] = useState<number | null>(null)
  const [text, setText] = useState('')

  return (
    <div className="mt-4 rounded-[10px] border border-line bg-paper-raised/60 p-4 sm:p-5">
      <div className="flex flex-wrap gap-2">
        {result.followUps.map((followUp, index) => (
          <button
            key={followUp.q}
            type="button"
            onClick={() => setActive((current) => (current === index ? null : index))}
            aria-expanded={active === index}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-[11px] transition-colors',
              active === index
                ? 'border-seal/40 bg-seal-soft/60 text-seal-deep'
                : 'border-line bg-paper/50 text-ink-soft hover:border-line-strong hover:text-ink',
            )}
          >
            {followUp.q}
            <ArrowUpRight size={10} className="shrink-0 opacity-50" />
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {active !== null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-[8px] border border-seal/20 bg-seal-soft/20 p-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9.5px] tracking-[0.12em] text-seal">
                  补充回答
                </span>
              </div>
              <p className="mt-2 font-sans text-[13.5px] leading-[1.85] text-ink">
                <RichText text={result.followUps[active]!.a} />
              </p>
              {result.followUps[active]!.cites && result.followUps[active]!.cites!.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="font-mono text-[9.5px] text-ink-faint">证据</span>
                  {result.followUps[active]!.cites!.map((id) => (
                    <Cite key={id} id={id} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          const value = text.trim()
          if (!value) return
          onFollowUp(value)
          setText('')
        }}
        className="mt-4 flex items-center gap-2 border-t border-line/70 pt-3"
      >
        <input
          id="follow-up-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="追问…"
          aria-label="继续追问"
          className="h-9 min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-faint/80"
        />
        <button
          type="submit"
          aria-label="提交追问"
          disabled={!text.trim()}
          className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-seal/40 hover:text-seal disabled:opacity-30"
        >
          <Send size={12} />
        </button>
      </form>
      <p className="mt-1 text-[9.5px] leading-relaxed text-ink-faint">新问题会重新调查。</p>
    </div>
  )
}

/* ── Evidence index rail ────────────────────────────────────── */

export function EvidenceIndex({
  result,
  onAsk,
  caseNo,
}: {
  result: Result
  onAsk: () => void
  caseNo: string
}) {
  const { openEvidence, hovered, setHovered, openGraph } = useCase()

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 overflow-hidden rounded-[12px] border border-line bg-white shadow-[0_18px_50px_-30px_rgba(16,24,40,0.3)]">
        <div className="flex items-center gap-1.5 border-b border-line bg-[#F9FAFB] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
          <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
          <span className="h-2 w-2 rounded-full bg-[#28C840]" />
          <span className="ml-2 truncate font-mono text-[8.5px] text-ink-faint">
            案卷 / {caseNo}
          </span>
          <span className="ml-auto font-mono text-[8px] text-ink-faint">
            {result.sources.length}
          </span>
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <span className="mono-label text-ink-faint">证据目录</span>
            <button
              type="button"
              onClick={openGraph}
              className="inline-flex items-center gap-1 text-[9.5px] text-ink-soft transition-colors hover:text-seal"
            >
              关系图
              <Maximize2 size={9} />
            </button>
          </div>

        <ul className="mt-3 space-y-2">
          {result.sources.map((source, index) => {
            const active = hovered === source.id
            const quote = source.translation ?? source.original
            const accent =
              source.relation === 'supports'
                ? 'border-l-support'
                : source.relation === 'conflicts'
                  ? 'border-l-conflict'
                  : 'border-l-unclear'
            return (
              <li key={source.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHovered(source.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(source.id)}
                  onBlur={() => setHovered(null)}
                  onClick={(event) => openEvidence(source.id, event.currentTarget)}
                  className={cn(
                    'group/card w-full rounded-[8px] border border-l-2 border-line bg-white p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all duration-200',
                    accent,
                    active
                      ? 'bg-seal-soft/25 ring-1 ring-seal/20'
                      : 'hover:bg-[#F9FAFB] hover:shadow-[0_6px_18px_-14px_rgba(16,24,40,0.25)]',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'font-mono text-[8.5px]',
                        active ? 'text-seal' : 'text-seal/75',
                      )}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <RelationTag relation={source.relation} />
                    {source.readStatus === 'restricted' && (
                      <Lock size={9} className="text-conflict" />
                    )}
                    <span className="ml-auto font-mono text-[8px] text-ink-faint">
                      {SOURCE_TYPE_LABEL[source.sourceType]}
                    </span>
                  </div>

                  <p
                    className={cn(
                      'mt-2 line-clamp-2 font-sans text-[12px] font-medium leading-snug transition-colors',
                      active ? 'text-seal' : 'text-ink group-hover/card:text-seal',
                    )}
                  >
                    {source.title}
                  </p>

                  {source.readStatus !== 'restricted' && quote && (
                    <p className="mt-1 line-clamp-2 text-[10px] leading-[1.65] text-ink-faint">
                      “{quote}”
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[8px] text-ink-faint">
                      {source.site}
                    </span>
                    <span className="shrink-0 text-[9px] text-seal/80 opacity-0 transition-opacity group-hover/card:opacity-100">
                      原句 →
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-4 rounded-[8px] border border-line bg-[#F9FAFB] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] text-ink-soft">补条件或追问</span>
            <button
              type="button"
              onClick={onAsk}
              className="inline-flex items-center gap-1 rounded-full bg-seal px-2.5 py-1 text-[9.5px] text-white transition-colors hover:bg-seal-deep"
            >
              追问
              <ArrowRight size={9} />
            </button>
          </div>
        </div>
        </div>
      </div>
    </aside>
  )
}
