'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { AlertTriangle } from 'lucide-react'
import type { Activity, Evidence, View } from './types'
import { SCENARIOS } from './data/scenarios'
import { CaseContext } from './components/CaseContext'
import { Header } from './components/Header'
import { HomeScreen } from './components/HomeScreen'
import { InvestigatingScreen } from './components/InvestigatingScreen'
import { ResultScreen } from './components/ResultScreen'
import { FailureScreen } from './components/FailureScreen'
import { EvidencePanel } from './components/EvidencePanel'
import { SearchGraph } from './components/SearchGraph'
import { MethodSheet } from './components/MethodSheet'
import { DemoPanel } from './components/DemoPanel'
import { Footer } from './components/Footer'

const EMPTY_SOURCES: Evidence[] = []

function detectScenario(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes('devin')) return 'devin'
  if (lower.includes('dify')) return 'dify'
  if (lower.includes('copilot')) return 'copilot'
  if (lower.includes('cursor')) return 'cursor'
  if (lower.includes('deepseek') || text.includes('上下文')) return 'fact'
  return null
}

/** Demo-only shell. Loaded lazily from App so live investigations do not ship the scenario corpus. */
export default function DemoApp() {
  const [view, setView] = useState<View>({ name: 'home' })
  const [runId, setRunId] = useState(0)
  const [methodOpen, setMethodOpen] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [graphActs, setGraphActs] = useState<Activity[]>([])
  const [graphQuestion, setGraphQuestion] = useState('')
  const [evidenceId, setEvidenceId] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [forceHistory, setForceHistory] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const askRef = useRef<HTMLTextAreaElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const toastTimer = useRef<number | null>(null)

  const scenario = view.name === 'home' ? null : SCENARIOS[view.scenarioId]
  const result = scenario?.result ?? null
  const sources = result?.sources ?? EMPTY_SOURCES
  const resultQuestion =
    view.name === 'result' ? (view.question ?? result?.question ?? '') : (result?.question ?? '')
  const historyForResult =
    view.name === 'result' ? (view.historyAt ?? (forceHistory ? '2026-10-18 20:10' : undefined)) : undefined

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), 4800)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const goHome = useCallback((focus = false) => {
    setView({ name: 'home' })
    setEvidenceId(null)
    setGraphOpen(false)
    setHovered(null)
    if (focus) {
      window.setTimeout(() => askRef.current?.focus(), 280)
    }
  }, [])

  const startScenario = useCallback((id: string, question: string) => {
    setEvidenceId(null)
    setGraphOpen(false)
    setHovered(null)
    setRunId((value) => value + 1)
    setView({ name: 'investigating', scenarioId: id, question })
  }, [])

  const complete = useCallback(() => {
    setView((current) => {
      if (current.name !== 'investigating') return current
      const found = SCENARIOS[current.scenarioId]
      if (!found?.result) return current
      return {
        name: 'result',
        scenarioId: current.scenarioId,
        question: found.kind === 'ambiguous' ? found.result.question : current.question,
      }
    })
  }, [])

  const fail = useCallback(() => {
    setView((current) =>
      current.name === 'investigating'
        ? { name: 'failure', scenarioId: current.scenarioId, question: current.question }
        : current,
    )
  }, [])

  const openEvidence = useCallback((id: string, trigger?: HTMLElement | null) => {
    returnFocusRef.current =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setEvidenceId(id)
  }, [])

  const closeEvidence = useCallback(() => {
    setEvidenceId(null)
    const target = returnFocusRef.current
    window.setTimeout(() => {
      if (target && document.contains(target)) {
        target.focus({ preventScroll: true })
        target.scrollIntoView({ block: 'nearest' })
      }
    }, 260)
  }, [])

  const openGraphFromResult = useCallback(() => {
    if (!result) return
    setGraphActs(result.activities)
    setGraphQuestion(resultQuestion)
    setGraphOpen(true)
  }, [result, resultQuestion])

  const caseApi = useMemo(
    () => ({
      sources,
      openEvidence,
      hovered,
      setHovered,
      openGraph: openGraphFromResult,
    }),
    [sources, openEvidence, hovered, openGraphFromResult],
  )

  const handleSubmit = useCallback(
    (text: string) => {
      const id = detectScenario(text)
      if (!id) {
        showToast(
          '这个问题的预置材料不在样稿里。案卷不会伪造答案——试试下面的示例，或打开「样稿」查看全部场景。',
        )
        return
      }
      startScenario(id, text)
    },
    [startScenario, showToast],
  )

  const handleArchive = useCallback((id: string, at: string, caseNo: string) => {
    const found = SCENARIOS[id]
    if (!found?.result) return
    setEvidenceId(null)
    setGraphOpen(false)
    setView({ name: 'result', scenarioId: id, question: found.result.question, historyAt: at, caseNo })
  }, [])

  const handleFollowUp = useCallback(
    (question: string) => {
      const id = detectScenario(question)
      if (!id) {
        showToast('样稿未接入实时搜索：这条追问不会伪造答案。可以点上面的预设追问，或换一个示例。')
        return
      }
      startScenario(id, question)
    },
    [showToast, startScenario],
  )

  const restart = useCallback(() => {
    if (!scenario) return
    startScenario(scenario.id, resultQuestion || scenario.question)
  }, [scenario, resultQuestion, startScenario])

  const demoScenario = useCallback(
    (id: string, mode: 'process' | 'result' | 'failure') => {
      const found = SCENARIOS[id]
      if (!found) return
      setEvidenceId(null)
      setGraphOpen(false)
      setHovered(null)
      if (mode === 'failure') {
        setView({ name: 'failure', scenarioId: id, question: found.question })
        return
      }
      if (mode === 'result' && found.result) {
        setView({ name: 'result', scenarioId: id, question: found.result.question })
        return
      }
      setRunId((value) => value + 1)
      setView({ name: 'investigating', scenarioId: id, question: found.question })
    },
    [],
  )

  const handleOffline = useCallback(
    (value: boolean) => {
      setOffline(value)
      if (!value) {
        showToast('已重新连接。此页不会自动更新；重新调查可以获取新结果。')
      }
    },
    [showToast],
  )

  const handleHistory = useCallback((value: boolean) => {
    setForceHistory(value)
    if (!value) {
      setView((current) =>
        current.name === 'result' ? { ...current, historyAt: undefined, caseNo: undefined } : current,
      )
    }
  }, [])

  const viewScenarioId = view.name === 'home' ? '' : view.scenarioId
  const historyDemo = forceHistory || (view.name === 'result' && Boolean(view.historyAt))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view.name, viewScenarioId, runId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (evidenceId) {
        closeEvidence()
        return
      }
      if (graphOpen) {
        setGraphOpen(false)
        return
      }
      if (methodOpen) setMethodOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [evidenceId, graphOpen, methodOpen, closeEvidence])

  const pageKey =
    view.name === 'home'
      ? 'home'
      : view.name === 'investigating'
        ? `investigating-${view.scenarioId}-${runId}`
        : `${view.name}-${view.scenarioId}`

  const evidence = evidenceId ? (sources.find((source) => source.id === evidenceId) ?? null) : null
  const evidenceIndex = evidenceId
    ? sources.findIndex((source) => source.id === evidenceId) + 1
    : 0

  return (
    <MotionConfig reducedMotion="user">
      <CaseContext.Provider value={caseApi}>
        <div className="min-h-screen">
          <Header
            onHome={() => goHome()}
            onNew={() => goHome(true)}
            onMethod={() => setMethodOpen(true)}
          />

          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={pageKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {view.name === 'home' && (
                <HomeScreen
                  onSubmit={handleSubmit}
                  onExample={(id, question) => startScenario(id, question)}
                  onArchive={handleArchive}
                  askRef={askRef}
                />
              )}

              {view.name === 'investigating' && scenario && (
                <InvestigatingScreen
                  scenario={scenario}
                  question={view.question}
                  onComplete={complete}
                  onFail={fail}
                  onExit={() => goHome()}
                  onOpenGraph={(activities) => {
                    setGraphActs(activities)
                    setGraphQuestion(view.question)
                    setGraphOpen(true)
                  }}
                  onClarifyBlocked={(label) =>
                    showToast(`样稿只准备了 GitHub Copilot 的后续材料；${label} 暂未覆盖。`)
                  }
                />
              )}

              {view.name === 'result' && result && (
                <ResultScreen
                  result={result}
                  question={resultQuestion}
                  caseNo={view.caseNo}
                  historyAt={historyForResult}
                  offline={offline}
                  onReconnect={() => handleOffline(false)}
                  onRestart={restart}
                  onHome={() => goHome()}
                  onFollowUp={handleFollowUp}
                  onToast={showToast}
                />
              )}

              {view.name === 'failure' && scenario && (
                <FailureScreen
                  scenario={scenario}
                  question={view.question}
                  onRetry={() => startScenario(scenario.id, view.question)}
                  onHome={() => goHome()}
                />
              )}
            </motion.main>
          </AnimatePresence>

          {view.name !== 'investigating' && <Footer />}

          <MethodSheet open={methodOpen} onClose={() => setMethodOpen(false)} />

          <SearchGraph
            open={graphOpen}
            onClose={() => setGraphOpen(false)}
            question={graphQuestion}
            activities={graphActs}
          />

          <EvidencePanel
            evidence={evidence}
            index={evidenceIndex}
            total={sources.length}
            onClose={closeEvidence}
          />

          <DemoPanel
            view={view}
            onScenario={demoScenario}
            onHome={() => goHome()}
            offline={offline}
            onOffline={handleOffline}
            forceHistory={historyDemo}
            onHistory={handleHistory}
          />

          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="fixed bottom-6 left-1/2 z-[95] w-[min(92vw,540px)] -translate-x-1/2"
              >
                <div className="flex items-start gap-2.5 rounded-[10px] border border-line-strong/70 bg-paper-raised/95 px-4 py-3 shadow-sheet backdrop-blur">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-unclear" />
                  <p className="text-[11.5px] leading-relaxed text-ink-soft">{toast}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CaseContext.Provider>
    </MotionConfig>
  )
}
