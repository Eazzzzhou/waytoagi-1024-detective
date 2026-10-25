import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  ChevronRight,
  CircleAlert,
  FileText,
  GitBranch,
  HelpCircle,
  Lock,
  Maximize2,
  RotateCw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import type { Activity, Scenario } from '../types'
import { activityTime, cn } from '../lib/utils'
import { useCase } from './CaseContext'
import { Stamp, StatusDot } from './ui'

const ease = [0.16, 1, 0.3, 1] as const

const kindMeta = {
  plan: { label: '拆解', icon: GitBranch },
  search: { label: '搜索', icon: Search },
  read: { label: '读取', icon: FileText },
  rescan: { label: '补查', icon: RotateCw },
  archive: { label: '归档', icon: Archive },
  clarify: { label: '澄清', icon: HelpCircle },
} as const

export function InvestigatingScreen({
  scenario,
  question,
  onComplete,
  onFail,
  onExit,
  onOpenGraph,
  onClarifyBlocked,
}: {
  scenario: Scenario
  question: string
  onComplete: () => void
  onFail: () => void
  onExit: () => void
  onOpenGraph: (activities: Activity[]) => void
  onClarifyBlocked: (label: string) => void
}) {
  const { openEvidence } = useCase()
  const activities = scenario.activities
  const [visibleCount, setVisibleCount] = useState(0)
  const [phase, setPhase] = useState<'running' | 'clarify' | 'finishing'>('running')
  const [chosen, setChosen] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const shown = activities.slice(0, visibleCount)

  useEffect(() => {
    if (visibleCount >= activities.length) {
      if (scenario.failAt !== undefined) {
        const t = window.setTimeout(onFail, 1200)
        return () => window.clearTimeout(t)
      }
      setPhase('finishing')
      const t = window.setTimeout(onComplete, 1250)
      return () => window.clearTimeout(t)
    }

    if (scenario.clarifyAt !== undefined && visibleCount === scenario.clarifyAt && !chosen) {
      setPhase('clarify')
      return
    }

    const next = activities[visibleCount]
    const t = window.setTimeout(() => setVisibleCount((v) => v + 1), next?.delay ?? 650)
    return () => window.clearTimeout(t)
  }, [visibleCount, chosen, activities, scenario.clarifyAt, scenario.failAt, onComplete, onFail])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [visibleCount, chosen])

  const current = useMemo(() => {
    if (phase === 'clarify') return '需要确认一个对象'
    if (scenario.failAt !== undefined && visibleCount >= scenario.failAt) return '搜索入口超时，调查已停止'
    if (phase === 'finishing') return '正在整理成卷'
    if (visibleCount === 0) return '正在建立调查'
    return shown[shown.length - 1]?.currentLabel ?? shown[shown.length - 1]?.title ?? '正在调查'
  }, [phase, shown, scenario.failAt, visibleCount])

  const branches = useMemo(() => {
    const map = new Map<string, { count: number; rescanned: boolean }>()
    shown.forEach((a) => {
      if (!a.branch) return
      const prev = map.get(a.branch) ?? { count: 0, rescanned: false }
      map.set(a.branch, {
        count: prev.count + 1,
        rescanned: prev.rescanned || a.kind === 'rescan',
      })
    })
    return Array.from(map.entries())
  }, [shown])

  const materials = useMemo(() => {
    const seen = new Set<string>()
    return shown
      .filter((a) => a.kind === 'read')
      .filter((a) => {
        const key = a.evidenceId ?? a.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((a) => ({
        activity: a,
        source: scenario.result?.sources.find((s) => s.id === a.evidenceId),
      }))
      .sort((a, b) => {
        const rank = (item: typeof a) =>
          item.source
            ? (scenario.result?.sources.findIndex((s) => s.id === item.source!.id) ?? 99)
            : 99
        return rank(a) - rank(b)
      })
  }, [shown, scenario.result])

  const restrictedCount = materials.filter(
    (m) => m.activity.status === 'restricted' || m.source?.readStatus === 'restricted',
  ).length

  const latestGap = [...shown].reverse().find((a) => a.kind === 'rescan')
  const lastBranch = shown[shown.length - 1]?.branch

  const skip = () => {
    if (phase === 'clarify') return
    setVisibleCount(activities.length)
  }

  return (
    <div className="relative">
      <div className="mx-auto max-w-[1240px] px-5 pb-10 pt-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 py-3">
          <button
            type="button"
            onClick={onExit}
            className="group inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft transition-colors hover:text-seal"
          >
            <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
            退出调查
          </button>
          <div className="flex items-center gap-3 font-mono text-[9px] tracking-[0.12em] text-ink-faint">
            <span>{scenario.result?.caseNo ?? 'A-2026-1025-06'}</span>
            <span className="h-3 w-px bg-line" />
            <span>开始于 {scenario.result?.investigatedAt.slice(-5) ?? '11:58'}</span>
          </div>
        </div>

        <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14 lg:pt-10">
          <main className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusDot pulse={phase === 'running'} tone={phase === 'finishing' ? 'support' : 'seal'} />
              <span className="font-mono text-[9.5px] tracking-[0.2em] text-seal">
                {phase === 'finishing' ? '已核对' : phase === 'clarify' ? '等待确认' : '调查进行中'}
              </span>
              {phase === 'running' && (
                <button
                  type="button"
                  onClick={skip}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-line/80 px-2.5 py-1 font-mono text-[9px] text-ink-faint transition-colors hover:border-line-strong hover:text-ink-soft"
                >
                  跳过过程
                  <ChevronRight size={10} />
                </button>
              )}
            </div>

            <h1 className="mt-4 max-w-[42rem] font-display text-[clamp(1.65rem,4vw,2.45rem)] font-semibold leading-[1.32] tracking-[-0.005em]">
              {question}
            </h1>

            <div className="relative mt-7 overflow-hidden rounded-[12px] border border-line bg-paper-raised/65 p-5">
              <div className="flex items-center justify-between">
                <span className="mono-label text-ink-faint">当前动作</span>
                <button
                  type="button"
                  onClick={() => onOpenGraph(shown)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper/60 px-2.5 py-1 font-mono text-[9px] text-ink-soft transition-colors hover:border-seal/35 hover:text-seal"
                >
                  搜索关系
                  <Maximize2 size={10} />
                </button>
              </div>
              <div className="mt-3 min-h-[3.4rem]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={current}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3, ease }}
                    className="font-display text-[20px] font-medium leading-[1.5] text-ink sm:text-[23px]"
                  >
                    {current}
                    {phase === 'running' && <span className="ml-1 inline-block h-[1.1em] w-[2px] translate-y-[2px] bg-seal/60 motion-safe:animate-pulse" />}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="mt-4 h-px overflow-hidden bg-line/70">
                <div
                  className={cn(
                    'h-px w-1/4 bg-seal/70',
                    phase === 'running' && 'scan-line',
                    phase !== 'running' && 'w-full opacity-40',
                  )}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] text-ink-faint">
                <span>{shown.length} 条记录</span>
                <span>{materials.length} 份材料</span>
                {restrictedCount > 0 && <span className="text-conflict">{restrictedCount} 份读取受限</span>}
              </div>
            </div>

            <div className="mt-8">
              <span className="mono-label text-ink-faint">调查记录</span>
            </div>

            <div
              ref={listRef}
              className="mt-2 max-h-[520px] overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,black_94%,transparent)]"
            >
              <ol>
                {shown.map((activity, i) => (
                  <Fragment key={activity.id}>
                    <ActivityRow
                      activity={activity}
                      index={i}
                      time={activityTime(scenario.result?.investigatedAt.slice(-5) ?? '11:58', i)}
                      last={i === shown.length - 1 && !chosen && phase !== 'clarify'}
                      onOpenEvidence={openEvidence}
                    />
                    {chosen && scenario.clarifyAt === i + 1 && (
                      <motion.li
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-[28px_1fr] gap-3 py-[9px]"
                      >
                        <div className="flex justify-center">
                          <span className="z-10 grid h-6 w-6 place-items-center rounded-full border border-support/30 bg-support-soft text-support">
                            <ShieldCheck size={12} />
                          </span>
                        </div>
                        <div>
                          <p className="font-mono text-[9.5px] tracking-[0.1em] text-ink-faint">澄清</p>
                          <p className="mt-1 text-[13px] text-ink">已确认对象：{chosen}</p>
                        </div>
                      </motion.li>
                    )}
                  </Fragment>
                ))}
              </ol>

              {phase === 'clarify' && scenario.clarify && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease }}
                  className="relative mt-3 overflow-hidden rounded-[10px] border border-seal/25 bg-seal-soft/25 p-5"
                >
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-seal/70" />
                  <div className="flex items-center gap-2">
                    <HelpCircle size={13} className="text-seal" />
                    <span className="mono-label text-seal">需要确认一下</span>
                  </div>
                  <p className="mt-2.5 font-display text-[18px] font-medium leading-snug">
                    {scenario.clarify.question}
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-ink-faint">
                    只问一个问题。
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {scenario.clarify.options.map((option) => {
                      const available = option.label === 'GitHub Copilot'
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => {
                            if (!available) {
                              onClarifyBlocked(option.label)
                              return
                            }
                            setChosen(option.label)
                            setPhase('running')
                          }}
                          className="group/opt flex items-start justify-between gap-3 rounded-[8px] border border-line bg-paper-raised/80 px-4 py-3 text-left transition-colors hover:border-seal/40 hover:bg-paper-raised"
                        >
                          <span>
                            <span className="block text-[13px] font-medium text-ink">{option.label}</span>
                            <span className="mt-0.5 block text-[10.5px] text-ink-faint">{option.hint}</span>
                          </span>
                          <ArrowUpRight
                            size={13}
                            className="mt-0.5 shrink-0 text-ink-faint transition-all group-hover/opt:-translate-y-0.5 group-hover/opt:translate-x-0.5 group-hover/opt:text-seal"
                          />
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            <p className="mt-4 flex items-center gap-2 border-t border-line/60 pt-3 text-[10.5px] leading-relaxed text-ink-faint">
              <CircleAlert size={12} className="shrink-0" />
              仅记录实际搜索与读取。
            </p>
          </main>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <span className="mono-label text-ink-faint">调查分支</span>
              <span className="font-mono text-[9px] text-ink-faint">{branches.length}</span>
            </div>
            <div className="mt-3 space-y-1">
              {branches.length === 0 && (
                <p className="py-2 text-[11.5px] text-ink-faint">正在建立核查点…</p>
              )}
              {branches.map(([name, info], i) => {
                const active = lastBranch === name && phase === 'running'
                return (
                  <div
                    key={name}
                    className={cn(
                      'flex items-start gap-2.5 rounded-[6px] px-2 py-2 transition-colors',
                      active && 'bg-paper-raised/80',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        active ? 'bg-seal' : 'bg-line-strong',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[9px] text-ink-faint">
                          0{i + 1}
                        </span>
                        <span className="truncate text-[12px] text-ink">{name}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="font-mono text-[9.5px] text-ink-faint">
                          {info.count} 次操作
                        </span>
                        <span
                          className={cn(
                            'font-mono text-[9.5px]',
                            active ? 'text-seal' : info.rescanned ? 'text-unclear' : 'text-ink-faint',
                          )}
                        >
                          {active ? '进行中' : info.rescanned ? '含补查' : '已完成'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {latestGap && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-[8px] border border-unclear/25 bg-unclear-soft/40 p-3.5"
              >
                <div className="flex items-center gap-1.5">
                  <RotateCw size={11} className="text-unclear" />
                  <span className="mono-label text-unclear">
                    {phase === 'running' ? '正在补查' : '补查记录'}
                  </span>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">{latestGap.detail}</p>
              </motion.div>
            )}

            <div className="mt-7 flex items-center justify-between border-b border-line pb-2.5">
              <span className="mono-label text-ink-faint">已取得材料</span>
              <span className="font-mono text-[9px] text-ink-faint">
                {materials.length} 份{restrictedCount > 0 ? ` · ${restrictedCount} 受限` : ''}
              </span>
            </div>

            <div className="mt-2">
              {materials.length === 0 && (
                <p className="py-3 text-[11.5px] text-ink-faint">还没有可展示的材料。</p>
              )}
              <AnimatePresence initial={false}>
                {materials.map(({ activity, source }) => {
                  const restricted =
                    activity.status === 'restricted' || source?.readStatus === 'restricted'
                  return (
                    <motion.button
                      key={activity.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      type="button"
                      disabled={!source}
                      onClick={() => source && openEvidence(source.id)}
                      className="group/mat flex w-full items-start gap-2.5 border-b border-line/60 py-2.5 text-left last:border-0 enabled:hover:bg-paper-raised/60 disabled:cursor-default"
                    >
                      <span className="mt-0.5 font-mono text-[9px] text-ink-faint">
                        {source
                          ? String((scenario.result?.sources.findIndex((s) => s.id === source.id) ?? 0) + 1).padStart(2, '0')
                          : '--'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block font-display text-[11.5px] leading-snug text-ink group-enabled:group-hover/mat:text-seal">
                          {activity.title.replace(/^读取/, '')}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] text-ink-faint">
                          {restricted ? (
                            <>
                              <Lock size={9} className="text-conflict" />
                              <span className="text-conflict">读取受限</span>
                            </>
                          ) : (
                            <>
                              <span className="h-1 w-1 rounded-full bg-support" />
                              已读取
                            </>
                          )}
                          <span>·</span>
                          <span className="truncate">{source?.site ?? activity.site}</span>
                        </span>
                      </span>
                      {source && (
                        <ArrowUpRight
                          size={11}
                          className="mt-0.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover/mat:opacity-100"
                        />
                      )}
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {phase === 'finishing' && (
          <motion.div
            className="fixed inset-0 z-[60] grid place-items-center bg-paper/85 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex flex-col items-center px-6 text-center"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
            >
              <motion.div
                initial={{ scale: 1.55, rotate: -14, opacity: 0 }}
                animate={{ scale: 1, rotate: -5, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 210, damping: 17, delay: 0.1 }}
              >
                <Stamp label="整理成卷" meta="BINDING" size="lg" />
              </motion.div>
              <p className="mt-7 font-display text-[21px] font-medium">把材料与结论装订到一起</p>
              <p className="mt-2 font-mono text-[9px] tracking-[0.16em] text-ink-faint">
                核对引用 · 标注关系 · 合并同源
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActivityRow({
  activity,
  index,
  time,
  last,
  onOpenEvidence,
}: {
  activity: Activity
  index: number
  time: string
  last: boolean
  onOpenEvidence: (id: string, trigger?: HTMLElement | null) => void
}) {
  const meta = kindMeta[activity.kind]
  const Icon = meta.icon
  const restricted = activity.status === 'restricted'
  const failed = activity.status === 'failed'
  const empty = activity.status === 'empty'
  const skipped = activity.status === 'skipped'

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease, delay: index === 0 ? 0.05 : 0 }}
      className="relative grid grid-cols-[28px_1fr] gap-3 py-[9px]"
    >
      <div className="relative flex justify-center">
        {!last && <span className="absolute left-1/2 top-7 h-[calc(100%-0.5rem)] w-px -translate-x-1/2 bg-line/80" />}
        <span
          className={cn(
            'z-10 grid h-6 w-6 place-items-center rounded-full border bg-paper',
            restricted || failed
              ? 'border-conflict/25 bg-conflict-soft/60 text-conflict'
              : skipped
                ? 'border-line-strong/40 bg-paper-deep/40 text-ink-faint'
                : empty
                  ? 'border-unclear/25 bg-unclear-soft/60 text-unclear'
                  : activity.kind === 'archive'
                    ? 'border-seal/25 bg-seal-soft/60 text-seal'
                    : 'border-line bg-paper-raised text-ink-soft',
          )}
        >
          {restricted ? <Lock size={11} /> : skipped ? <Ban size={11} /> : <Icon size={11} />}
        </span>
      </div>

      <div className="min-w-0 pb-1">
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9.5px] text-ink-faint">
          <span>{time}</span>
          <span className="h-2 w-px bg-line" />
          <span>{meta.label}</span>
          {activity.engine && (
            <span className="rounded-[3px] border border-seal/20 bg-seal-soft/40 px-1 py-px text-[8px] text-seal">
              {activity.engine}
            </span>
          )}
          {activity.branch && (
            <>
              <span className="text-line-strong">/</span>
              <span>{activity.branch}</span>
            </>
          )}
        </div>

        <p className={cn('mt-1 text-[13px] leading-snug text-ink', last && 'font-medium')}>
          {activity.title}
        </p>

        {activity.query && (
          <p className="mt-0.5 truncate font-mono text-[10px] text-ink-faint">“{activity.query}”</p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {activity.site && !activity.query && (
            <span className="font-mono text-[9px] text-ink-faint">{activity.site}</span>
          )}
          {restricted && (
            <span className="inline-flex items-center gap-1 font-mono text-[9.5px] text-conflict">
              <Lock size={9} />
              读取受限
            </span>
          )}
          {failed && (
            <span className="inline-flex items-center gap-1 font-mono text-[9.5px] text-conflict">
              <CircleAlert size={9} />
              入口超时
            </span>
          )}
          {empty && (
            <span className="font-mono text-[9.5px] text-unclear">未搜到相关结果</span>
          )}
          {skipped && (
            <span className="inline-flex items-center gap-1 font-mono text-[9.5px] text-ink-faint">
              <Ban size={9} />
              未执行
            </span>
          )}
          {activity.status === 'ok' && (
            <span className="font-mono text-[9.5px] text-ink-faint">已读取</span>
          )}
          {activity.detail && (
            <span className="text-[10px] text-ink-faint">· {activity.detail}</span>
          )}
          {activity.evidenceId && (
            <button
              type="button"
              onClick={(event) => onOpenEvidence(activity.evidenceId!, event.currentTarget)}
              className="ml-auto inline-flex items-center gap-1 font-mono text-[9.5px] text-seal/80 hover:text-seal"
            >
              查看摘录
              <ArrowUpRight size={9} />
            </button>
          )}
        </div>
      </div>
    </motion.li>
  )
}
