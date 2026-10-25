import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, FlaskConical, History, WifiOff, X } from 'lucide-react'
import { SCENARIO_LIST } from '../data/scenarios'
import { cn } from '../lib/utils'
import type { View } from '../types'

export function DemoPanel({
  view,
  onScenario,
  onHome,
  offline,
  onOffline,
  forceHistory,
  onHistory,
}: {
  view: View
  onScenario: (id: string, mode: 'process' | 'result' | 'failure') => void
  onHome: () => void
  offline: boolean
  onOffline: (value: boolean) => void
  forceHistory: boolean
  onHistory: (value: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const currentId = view.name === 'home' ? null : view.scenarioId
  const viewKey = view.name === 'home' ? 'home' : `${view.name}-${view.scenarioId}`

  useEffect(() => {
    setOpen(false)
  }, [viewKey])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="fixed bottom-4 left-4 z-[66] print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-12 left-0 max-h-[72vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-[12px] border border-line-strong/70 bg-paper-raised p-4 shadow-sheet sm:w-[348px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mono-label text-seal">SAMPLE CONTROL</p>
                <h2 className="mt-1.5 font-display text-[17px] font-semibold">样稿控制</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭样稿控制"
                className="grid h-7 w-7 place-items-center rounded-full text-ink-faint transition-colors hover:bg-paper-deep/60 hover:text-ink"
              >
                <X size={14} />
              </button>
            </div>

            <p className="mt-2 text-[10px] leading-[1.75] text-ink-faint">
              样稿 · 数字与引文待替换。
            </p>

            <div className="mt-3 space-y-1.5">
              {SCENARIO_LIST.map((scenario) => {
                const active = scenario.id === currentId
                return (
                  <div
                    key={scenario.id}
                    className={cn(
                      'rounded-[7px] border px-2.5 py-2 transition-colors',
                      active
                        ? 'border-seal/30 bg-seal-soft/30'
                        : 'border-line/70 bg-paper/30',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11.5px] font-medium text-ink">{scenario.label}</span>
                      {active && (
                        <span className="font-mono text-[7.5px] tracking-[0.1em] text-seal">当前</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[9.5px] leading-[1.6] text-ink-faint">{scenario.demo}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onScenario(scenario.id, scenario.result ? 'process' : 'failure')
                          setOpen(false)
                        }}
                        className="rounded-full border border-line bg-paper-raised/70 px-2 py-0.5 font-mono text-[8.5px] text-ink-soft transition-colors hover:border-seal/30 hover:text-seal"
                      >
                        看过程
                      </button>
                      {scenario.result ? (
                        <button
                          type="button"
                          onClick={() => {
                            onScenario(scenario.id, 'result')
                            setOpen(false)
                          }}
                          className="rounded-full border border-line bg-paper-raised/70 px-2 py-0.5 font-mono text-[8.5px] text-ink-soft transition-colors hover:border-seal/30 hover:text-seal"
                        >
                          看结果
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onScenario(scenario.id, 'failure')
                            setOpen(false)
                          }}
                          className="rounded-full border border-line bg-paper-raised/70 px-2 py-0.5 font-mono text-[8.5px] text-ink-soft transition-colors hover:border-seal/30 hover:text-seal"
                        >
                          失败页
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 border-t border-line/70 pt-3">
              <p className="mono-label text-ink-faint">页面状态</p>
              <Toggle
                icon={<WifiOff size={11} />}
                label="网络已断开"
                value={offline}
                onChange={onOffline}
              />
              <Toggle
                icon={<History size={11} />}
                label="历史结果"
                value={forceHistory}
                onChange={onHistory}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onHome()
                setOpen(false)
              }}
              className="mt-3 flex w-full items-center justify-between rounded-[7px] border border-line bg-paper/40 px-3 py-2 text-[10.5px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              回到搜索首页
              <ArrowRight size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong/70 bg-paper-raised/90 px-3 text-[10.5px] text-ink-soft shadow-sheet backdrop-blur transition-colors hover:border-seal/35 hover:text-seal"
      >
        <FlaskConical size={12} />
        样稿
        <span className="font-mono text-[7.5px] tracking-[0.1em] text-ink-faint">DEMO</span>
      </button>
    </div>
  )
}

function Toggle({
  icon,
  label,
  value,
  onChange,
}: {
  icon: ReactNode
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-[5px] px-1 py-1 text-[10.5px] text-ink-soft transition-colors hover:text-ink"
    >
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          'relative h-[18px] w-8 rounded-full transition-colors',
          value ? 'bg-seal/80' : 'bg-line-strong/50',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] h-[14px] w-[14px] rounded-full bg-paper-raised shadow-sm transition-all',
            value ? 'left-[16px]' : 'left-[2px]',
          )}
        />
      </span>
    </button>
  )
}
