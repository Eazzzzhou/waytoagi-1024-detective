import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Quote,
  X,
} from 'lucide-react'
import type { Evidence } from '../types'
import { cn, hostOf } from '../lib/utils'
import { RelationTag, SourceTypeTag } from './ui'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export function EvidencePanel({
  evidence,
  index,
  total,
  onClose,
}: {
  evidence: Evidence | null
  index: number
  total: number
  onClose: () => void
}) {
  const isDesktop = useIsDesktop()
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!evidence) return
    closeRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const restoreOverflow = document.body.style.overflow
    if (!isDesktop) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = restoreOverflow
    }
  }, [evidence, isDesktop])

  useEffect(() => {
    setCopied(false)
  }, [evidence?.id])

  const copy = async () => {
    if (!evidence?.original) return
    try {
      await navigator.clipboard.writeText(evidence.original)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const restricted = evidence?.readStatus === 'restricted'

  return (
    <AnimatePresence>
      {evidence && (
        <>
          {!isDesktop && (
            <motion.button
              type="button"
              aria-label="关闭证据"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[78] bg-ink/30 backdrop-blur-[2px] lg:hidden"
            />
          )}

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-title"
            initial={isDesktop ? { x: '100%' } : { y: '100%' }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            drag={isDesktop ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (!isDesktop && info.offset.y > 110) onClose()
            }}
            className="fixed z-[80] flex flex-col overflow-hidden border-line-strong/80 bg-paper-raised shadow-sheet max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-[7vh] max-lg:w-full max-lg:rounded-t-[18px] max-lg:border-t lg:inset-y-0 lg:right-0 lg:w-[480px] lg:border-l"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[9px] tracking-[0.14em] text-ink-faint">
                  证据 {String(index).padStart(2, '0')} / {String(total).padStart(2, '0')}
                </span>
                <span className="h-3 w-px bg-line" />
                <SourceTypeTag type={evidence.sourceType} />
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="关闭证据"
                className="inline-grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep/60 hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>

            {!isDesktop && (
              <div className="flex justify-center py-2">
                <span className="h-1 w-9 rounded-full bg-line-strong/70" />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="evidence-title"
                  className="font-display text-[22px] font-semibold leading-[1.35] tracking-[-0.005em]"
                >
                  {evidence.title}
                </h2>
                <Quote size={20} className="mt-1 shrink-0 text-line-strong" />
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <a
                  href={evidence.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft underline decoration-line-strong/70 decoration-1 underline-offset-[4px] transition-colors hover:text-seal hover:decoration-seal/50"
                >
                  {evidence.site}
                  <ExternalLink size={11} />
                </a>
                <span className="font-mono text-[9px] text-ink-faint">{hostOf(evidence.url)}</span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-line/80 py-4">
                <Meta label="作者" value={evidence.author} />
                <Meta label="发布时间" value={evidence.published} />
                <Meta label="获取时间" value={evidence.retrieved} accent />
                <Meta label="版本 / 套餐" value={evidence.version ?? evidence.plan} />
              </dl>

              {evidence.upstream && (
                <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-ink-faint">
                  <span className="font-mono text-[9.5px] tracking-[0.12em]">上游来源</span>
                  <span className="text-ink-soft">{evidence.upstream}</span>
                </p>
              )}

              {restricted ? (
                <div className="mt-6 rounded-[10px] border border-conflict/25 bg-conflict-soft/30 p-5">
                  <div className="flex items-center gap-2 text-conflict">
                    <Lock size={14} />
                    <span className="mono-label">读取受限</span>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-[1.85] text-ink-soft">
                    {evidence.restrictedNote ?? '本次未取得正文。'}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">未采用。</p>
                  <a
                    href={evidence.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line-strong/70 bg-paper-raised px-3.5 py-2 text-[11.5px] text-ink transition-colors hover:border-seal/40 hover:text-seal"
                  >
                    打开原始页面
                    <ExternalLink size={11} />
                  </a>
                </div>
              ) : (
                <>
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <span className="mono-label text-ink-faint">
                        原文 · {evidence.originalLang === 'en' ? 'EN' : '中文'}
                      </span>
                      <span className="font-mono text-[9.5px] tracking-[0.1em] text-ink-faint">
                        逐字引用，未改写
                      </span>
                    </div>
                    <div className="relative mt-2.5 rounded-[10px] border border-line bg-paper p-5 pl-6">
                      <span className="absolute inset-y-4 left-0 w-[2px] bg-seal/50" />
                      <p className="font-display text-[16.5px] leading-[2] text-ink">
                        <Highlighted text={evidence.original} phrase={evidence.highlight} />
                      </p>
                    </div>
                  </div>

                  {evidence.translation && (
                    <div className="mt-3.5 rounded-[10px] border border-line/80 bg-paper-deep/25 p-5">
                      <div className="flex items-center justify-between">
                        <span className="mono-label text-ink-faint">中文译文</span>
                        <span className="rounded-full border border-line bg-paper-raised/70 px-2 py-[3px] font-mono text-[9px] text-seal/80">
                          AI 翻译 · 非原文
                        </span>
                      </div>
                      <p className="mt-2.5 font-sans text-[13.5px] leading-[1.95] text-ink-soft">
                        {evidence.translation}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="mt-6 border-t border-line pt-5">
                <div className="flex items-center justify-between">
                  <span className="mono-label text-ink-faint">与当前结论的关系</span>
                  <RelationTag relation={evidence.relation} />
                </div>
                <p className="mt-2.5 text-[12.5px] leading-[1.9] text-ink-soft">{evidence.relationNote}</p>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="mono-label text-ink-faint">发现路径</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-ink-soft">
                  <span className="rounded-full border border-line bg-paper px-2 py-1 font-mono text-[9.5px]">
                    结论
                  </span>
                  <ArrowRight size={10} className="text-line-strong" />
                  <span className="rounded-full border border-seal/20 bg-seal-soft/40 px-2 py-1 font-mono text-[9.5px] text-seal">
                    {evidence.foundBy.engine} · “{evidence.foundBy.query}”
                  </span>
                  <ArrowRight size={10} className="text-line-strong" />
                  <span className="rounded-full border border-line bg-paper px-2 py-1 font-mono text-[9.5px]">
                    读取于 {evidence.retrieved.slice(-5)}
                  </span>
                </div>
              </div>

              {evidence.mirrors && evidence.mirrors.length > 0 && (
                <div className="mt-6 rounded-[8px] border border-line bg-paper/60 p-4">
                  <p className="mono-label text-ink-faint">同源转载 · 不重复计入独立来源</p>
                  <ul className="mt-2 space-y-1.5">
                    {evidence.mirrors.map((m) => (
                      <li key={m.url}>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft hover:text-seal"
                        >
                          {m.site}
                          <ExternalLink size={10} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>


            <div className="flex shrink-0 items-center gap-2 border-t border-line bg-paper-raised/95 px-5 py-3.5">
              <button
                type="button"
                onClick={copy}
                disabled={!evidence.original}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-paper px-3 text-[11.5px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? <Check size={12} className="text-support" /> : <Copy size={12} />}
                {copied ? '已复制原句' : '复制原句'}
              </button>
              <a
                href={evidence.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-seal px-3 text-[11.5px] text-white transition-colors hover:bg-seal-deep"
              >
                打开原始页面
                <ExternalLink size={11} />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Meta({ label, value, accent }: { label: string; value?: string | undefined; accent?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd className={cn('mt-1 text-[11.5px] leading-snug', accent ? 'text-ink' : 'text-ink-soft')}>
        {value ?? '未获取'}
      </dd>
    </div>
  )
}

function Highlighted({ text, phrase }: { text: string; phrase?: string | undefined }) {
  const parts = useMemo(() => {
    if (!phrase) return [text]
    const index = text.indexOf(phrase)
    if (index === -1) return [text]
    return [text.slice(0, index), phrase, text.slice(index + phrase.length)]
  }, [text, phrase])

  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts[0]}
      <mark className="quote-mark bg-transparent px-[0.1em] text-ink">{parts[1]}</mark>
      {parts[2]}
    </>
  )
}
