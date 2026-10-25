import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUpRight,
  Check,
  FileText,
  GitBranch,
  HelpCircle,
  Lock,
  RotateCw,
  Search,
  X,
} from 'lucide-react'
import type { Activity, GraphEdge, GraphNode } from '../types'
import { useCase } from './CaseContext'
import { cn } from '../lib/utils'
import { AsciiField } from './AsciiField'

const NODE_W = 200
const NODE_H = 60
const GAP_X = 238
const GAP_Y = 80
const PAD = 26

function buildGraph(activities: Activity[], question: string) {
  const acts = activities.filter((a) => a.kind !== 'plan' && a.kind !== 'archive')
  const hasConclusion = activities.some((a) => a.kind === 'archive')
  const rowOf = new Map(acts.map((a, i) => [a.id, i]))
  const branchNames = Array.from(
    new Set(acts.map((a) => a.branch).filter((b): b is string => Boolean(b))),
  )
  const centerRow = Math.max(0, Math.floor((acts.length - 1) / 2))
  const nodes: GraphNode[] = [
    {
      id: 'root',
      label: question,
      kind: 'question',
      col: 0,
      row: centerRow,
      meta: '原始问题',
    },
  ]

  branchNames.forEach((name, i) => {
    const rows = acts.filter((a) => a.branch === name).map((a) => rowOf.get(a.id) ?? 0)
    const row = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + r, 0) / rows.length)
      : i
    nodes.push({
      id: `branch-${i}`,
      label: name,
      kind: 'branch',
      col: 1,
      row,
      meta: `${rows.length} 次操作`,
    })
  })

  acts.forEach((a) => {
    const isRead = a.kind === 'read'
    const meta =
      a.kind === 'read'
        ? `${a.site ?? ''} · ${a.status === 'restricted' ? '读取受限' : '已读取'}`
        : a.kind === 'rescan'
          ? `${a.engine ?? '元宝'} · 补查`
          : `${a.engine ?? '元宝'} · ${a.status === 'empty' ? '未搜到' : a.status === 'failed' ? '超时' : a.status === 'skipped' ? '未执行' : '搜索'}`
    nodes.push({
      id: a.id,
      label: isRead
        ? a.title.replace(/^读取/, '').replace(/[《》]/g, '')
        : (a.query ?? a.title),
      kind: isRead ? 'read' : a.kind === 'rescan' ? 'rescan' : 'search',
      col: isRead ? 3 : 2,
      row: rowOf.get(a.id) ?? 0,
      status: a.status,
      meta,
      detail: a.detail,
      evidenceId: a.evidenceId,
    })
  })

  const edges: GraphEdge[] = branchNames.map((_, i) => ({ from: 'root', to: `branch-${i}` }))

  acts.forEach((a) => {
    const branchIndex = a.branch ? branchNames.indexOf(a.branch) : -1
    const parents =
      a.parents && a.parents.length > 0
        ? a.parents
        : branchIndex >= 0
          ? [`branch-${branchIndex}`]
          : ['root']
    parents.forEach((parent) => {
      if (nodes.some((n) => n.id === parent)) {
        edges.push({ from: parent, to: a.id, dashed: a.kind === 'rescan' })
      }
    })
  })

  if (hasConclusion) {
    nodes.push({
      id: 'conclusion',
      label: '结论 · 标注来源与缺口',
      kind: 'conclusion',
      col: 4,
      row: centerRow,
      meta: '已归档',
    })
    acts
      .filter((a) => a.kind === 'read' && a.status !== 'restricted')
      .forEach((a) => edges.push({ from: a.id, to: 'conclusion' }))
  }

  const seen = new Set<string>()
  const uniqueEdges = edges.filter((edge) => {
    const key = `${edge.from}>${edge.to}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const maxRow = Math.max(...nodes.map((n) => n.row), 0)
  return {
    nodes,
    edges: uniqueEdges,
    height: PAD * 2 + maxRow * GAP_Y + NODE_H,
    width: PAD * 2 + 4 * GAP_X + NODE_W,
  }
}

const kindIcon = {
  question: HelpCircle,
  branch: GitBranch,
  search: Search,
  read: FileText,
  rescan: RotateCw,
  conclusion: Check,
} as const

const kindLabel = {
  question: '问题',
  branch: '分支',
  search: '搜索',
  read: '读取',
  rescan: '补查',
  conclusion: '结论',
} as const

export function SearchGraph({
  open,
  onClose,
  question,
  activities,
}: {
  open: boolean
  onClose: () => void
  question: string
  activities: Activity[]
}) {
  const { openEvidence, sources } = useCase()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const graph = useMemo(() => buildGraph(activities, question), [activities, question])
  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null
  const branchCount = graph.nodes.filter((node) => node.kind === 'branch').length
  const actionCount = graph.nodes.filter(
    (node) => node.kind === 'search' || node.kind === 'read' || node.kind === 'rescan',
  ).length
  const materialCount = graph.nodes.filter((node) => node.kind === 'read').length
  const restrictedCount = graph.nodes.filter((node) => node.status === 'restricted').length

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    setSelectedId(null)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[70] flex flex-col bg-[#07090C] text-white"
          role="dialog"
          aria-modal="true"
          aria-label="搜索关系图"
        >
          <div className="relative z-10 border-b border-white/10 bg-[#07090C]/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-[1240px] items-start justify-between gap-6 px-5 py-4 sm:px-8">
              <div>
                <div className="flex items-center gap-2">
                  <span className="mono-label text-[#C7F464]">链路</span>
                  <span className="h-px w-6 bg-[#C7F464]/30" />
                  <span className="font-mono text-[8.5px] text-white/35">TRACE</span>
                </div>
                <h2 className="mt-2 font-display text-[20px] font-semibold leading-snug text-white sm:text-[23px]">
                  搜索关系
                </h2>
                <p className="mt-1 max-w-[640px] truncate text-[11px] text-white/40">{question}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="关闭搜索关系"
                className="mt-1 inline-grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white/55 transition-colors hover:border-white/30 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 px-5 py-2.5 sm:px-8">
              {[
                { label: '问题 / 分支', tone: 'bg-white/50' },
                { label: '搜索', tone: 'bg-white/75' },
                { label: '读取', tone: 'bg-[#60A5FA]' },
                { label: '补查', tone: 'bg-[#FBBF24]' },
                { label: '结论', tone: 'bg-[#C7F464]' },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 font-mono text-[8.5px] text-white/40">
                  <span className={cn('h-1.5 w-1.5 rounded-full', item.tone)} />
                  {item.label}
                </span>
              ))}
              <span className="ml-auto hidden font-mono text-[8.5px] text-white/35 sm:inline">
                {branchCount} 分支 · {actionCount} 操作 · {materialCount} 材料
                {restrictedCount > 0 ? ` · ${restrictedCount} 受限` : ''}
              </span>
            </div>
          </div>

          <div className="relative z-10 min-h-0 flex-1">
            <AsciiField dark opacity={0.32} gap={20} fontSize={10} animate={false} />
            <div className="relative h-full overflow-auto">
            <div
              className="relative mx-auto"
              style={{ width: graph.width, height: graph.height }}
            >
              <svg
                width={graph.width}
                height={graph.height}
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                {graph.edges.map((edge, i) => {
                  const from = graph.nodes.find((n) => n.id === edge.from)
                  const to = graph.nodes.find((n) => n.id === edge.to)
                  if (!from || !to) return null
                  const x1 = PAD + from.col * GAP_X + NODE_W
                  const y1 = PAD + from.row * GAP_Y + NODE_H / 2
                  const x2 = PAD + to.col * GAP_X
                  const y2 = PAD + to.row * GAP_Y + NODE_H / 2
                  const d = `M ${x1} ${y1} C ${x1 + 46} ${y1}, ${x2 - 46} ${y2}, ${x2} ${y2}`
                  return (
                    <motion.path
                      key={`${edge.from}-${edge.to}`}
                      d={d}
                      fill="none"
                      stroke={edge.dashed ? 'rgba(199,244,100,0.6)' : 'rgba(255,255,255,0.18)'}
                      strokeWidth={1.1}
                      strokeDasharray={edge.dashed ? '3 5' : undefined}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: edge.dashed ? 0.7 : 0.9 }}
                      transition={{ duration: 0.7, delay: 0.08 + i * 0.025, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )
                })}
              </svg>

              {graph.nodes.map((node, i) => {
                const Icon = kindIcon[node.kind]
                const isSelected = selectedId === node.id
                const source = node.evidenceId
                  ? sources.find((item) => item.id === node.evidenceId)
                  : undefined
                const accent = source
                  ? source.relation === 'supports'
                    ? 'border-l-2 border-l-[#4ADE80]'
                    : source.relation === 'conflicts'
                      ? 'border-l-2 border-l-[#F87171]'
                      : 'border-l-2 border-l-[#FBBF24]'
                  : ''
                const dotTone = source
                  ? source.relation === 'supports'
                    ? 'bg-[#4ADE80]'
                    : source.relation === 'conflicts'
                      ? 'bg-[#F87171]'
                      : 'bg-[#FBBF24]'
                  : node.status === 'restricted' || node.status === 'failed'
                    ? 'bg-[#F87171]'
                    : node.status === 'empty'
                      ? 'bg-[#FBBF24]'
                      : node.status === 'skipped'
                        ? 'bg-white/25'
                        : node.kind === 'conclusion'
                          ? 'bg-[#C7F464]'
                          : 'bg-white/40'
                return (
                  <motion.button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedId(node.id)}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      'absolute flex flex-col items-start gap-1 rounded-[7px] border px-3 py-2 text-left transition-[border-color,box-shadow,background-color]',
                      node.kind === 'question'
                        ? 'border-[#C7F464]/40 bg-[#C7F464]/10'
                        : node.kind === 'branch'
                          ? 'border-white/10 bg-white/[0.04]'
                          : node.kind === 'rescan'
                            ? 'border-dashed border-[#FBBF24]/45 bg-[#FBBF24]/[0.06]'
                            : node.kind === 'conclusion'
                              ? 'border-[#C7F464]/30 bg-[#C7F464]/10'
                              : 'border-white/10 bg-[#0D1217]',
                      accent,
                      isSelected
                        ? 'border-[#C7F464]/70 shadow-[0_0_0_3px_rgba(199,244,100,0.14)]'
                        : 'hover:border-white/25',
                    )}
                    style={{
                      left: PAD + node.col * GAP_X,
                      top: PAD + node.row * GAP_Y,
                      width: NODE_W,
                      height: NODE_H,
                    }}
                  >
                    <span className="flex w-full items-center gap-1.5">
                      <Icon size={10} className="shrink-0 text-white/35" />
                      <span className="truncate font-mono text-[7.5px] tracking-[0.12em] text-white/35">
                        {kindLabel[node.kind]}
                      </span>
                      <span
                        className={cn(
                          'ml-auto h-1.5 w-1.5 shrink-0 rounded-full',
                          dotTone,
                        )}
                      />
                      {node.status === 'restricted' && <Lock size={8} className="text-[#F87171]" />}
                    </span>
                    <span
                      className={cn(
                        'line-clamp-2 w-full leading-[1.4]',
                        node.kind === 'question'
                          ? 'font-display text-[10.5px] font-medium text-white'
                          : 'text-[10px] text-white/80',
                      )}
                    >
                      {node.label}
                    </span>
                    <span className="mt-auto w-full truncate font-mono text-[7.5px] text-white/35">
                      {node.meta}
                    </span>
                  </motion.button>
                )
              })}
            </div>
            </div>
          </div>

          <div className="relative z-20 border-t border-white/10 bg-[#0A0D12]/95 backdrop-blur-md">
            <div className="mx-auto min-h-[84px] max-w-[1240px] px-5 py-3.5 sm:px-8">
              {selected ? (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-mono text-[9.5px] tracking-[0.12em] text-white/35">
                      <span className="text-[#C7F464]">{kindLabel[selected.kind]}</span>
                      <span className="h-2.5 w-px bg-white/15" />
                      <span>{selected.meta}</span>
                      {selected.status === 'restricted' && (
                        <span className="text-[#F87171]">读取受限</span>
                      )}
                      {selected.status === 'empty' && (
                        <span className="text-[#FBBF24]">未搜到相关结果</span>
                      )}
                      {selected.status === 'skipped' && (
                        <span className="text-white/40">未执行该项搜索</span>
                      )}
                    </div>
                    <p className="mt-1.5 max-w-[720px] text-[12.5px] leading-relaxed text-white/85">
                      {selected.id === 'root' ? question : selected.label}
                    </p>
                    {selected.detail && (
                      <p className="mt-1 text-[10.5px] text-white/40">{selected.detail}</p>
                    )}
                  </div>
                  {selected.evidenceId && sources.some((s) => s.id === selected.evidenceId) && (
                    <button
                      type="button"
                      onClick={(event) => openEvidence(selected.evidenceId!, event.currentTarget)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#C7F464]/30 bg-[#C7F464]/10 px-3 py-1.5 text-[10.5px] text-[#C7F464] transition-colors hover:bg-[#C7F464] hover:text-[#07090C]"
                    >
                      查看对应原句
                      <ArrowUpRight size={11} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex h-[56px] items-center justify-between gap-4">
                  <p className="text-[11px] text-white/40">点节点查看详情。</p>
                  <span className="font-mono text-[8.5px] text-white/30">
                    {graph.nodes.length} 节点 · {graph.edges.length} 关系
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
