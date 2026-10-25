import { useState, type RefObject } from 'react'
import { motion } from 'motion/react'
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  FileText,
  Fingerprint,
  FolderOpen,
  Link2,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { EXAMPLES, HOME_ARCHIVE, SCENARIOS } from '../data/scenarios'
import { cn } from '../lib/utils'
import { ChainPreview } from './ChainPreview'
import { DecodeHeadline } from './DecodeHeadline'

const QUICK_TAGS = [
  { label: '自动化工作流', insert: ' · 用于自动化工作流' },
  { label: '个人使用', insert: ' · 个人使用' },
  { label: '优先低成本', insert: ' · 优先低成本' },
]

const EXAMPLE_TONES = [
  { bg: 'bg-seal-soft', text: 'text-seal', dot: 'bg-seal' },
  { bg: 'bg-unclear-soft', text: 'text-unclear', dot: 'bg-unclear' },
  { bg: 'bg-support-soft', text: 'text-support', dot: 'bg-support' },
] as const

const ease = [0.16, 1, 0.3, 1] as const

const tagActive = (value: string, tag: (typeof QUICK_TAGS)[number]) =>
  value.includes(tag.insert) || value.includes(`${tag.label}，`)

export function HomeScreen({
  onSubmit,
  onExample,
  onArchive,
  askRef,
}: {
  onSubmit: (text: string) => void
  onExample: (scenarioId: keyof typeof SCENARIOS, question: string) => void
  onArchive: (scenarioId: string, at: string, caseNo: string) => void
  askRef: RefObject<HTMLTextAreaElement | null>
}) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [conditionsOpen, setConditionsOpen] = useState(false)

  const activeConditions = QUICK_TAGS.filter((tag) => tagActive(text, tag))

  const submit = () => {
    const value = text.trim()
    if (!value) {
      askRef.current?.focus()
      return
    }
    onSubmit(value)
  }

  const toggleTag = (tag: (typeof QUICK_TAGS)[number]) => {
    setText((prev) => {
      if (tagActive(prev, tag)) {
        return prev.replace(tag.insert, '').replace(`${tag.label}，`, '').replace(/[，,]\s*$/, '').trim()
      }
      return prev.trim() ? `${prev.trim()}${tag.insert}` : `${tag.label}，`
    })
    setConditionsOpen(false)
    requestAnimationFrame(() => askRef.current?.focus())
  }

  const pasteLink = async () => {
    try {
      const clipboard = await navigator.clipboard.readText()
      const value = clipboard.trim()
      if (/^https?:\/\//i.test(value)) {
        setText((prev) => `${prev.trim()}${prev.trim() ? ' ' : ''}${value}`)
        setConditionsOpen(false)
        return
      }
    } catch {
      // Clipboard permission is optional; fall through to focus.
    }
    askRef.current?.focus()
  }

  return (
    <div>
      <section className="mx-auto max-w-[1240px] px-5 pb-4 pt-12 sm:px-8 lg:pt-20">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.32fr)_minmax(300px,0.68fr)] lg:gap-16">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease }}
              className="flex items-center gap-3"
            >
              <span className="h-px w-8 bg-line-strong" />
              <span className="font-mono text-[9.5px] tracking-[0.26em] text-ink-faint">
                AI 产品调查工具 · EST. 2026
              </span>
            </motion.div>

            <DecodeHeadline />
            <span className="mt-5 block h-[3px] w-14 rounded-full bg-seal" />

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.32, ease }}
              className="mt-5 max-w-[33rem] text-[15.5px] leading-[1.9] text-ink-soft sm:text-[16.5px]"
            >
              查清 AI 产品的事实、真实使用反馈，以及是否适合你的用途。
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease }}
              onSubmit={(event) => {
                event.preventDefault()
                submit()
              }}
              className={cn(
                'search-input-container group relative mt-7',
                focused && 'is-focused',
              )}
            >
              <textarea
                ref={askRef}
                rows={2}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    submit()
                  }
                }}
                placeholder="查一个 AI 产品，或贴一条说法 / 链接"
                aria-label="输入要调查的问题或链接"
                className="w-full resize-none bg-transparent px-4 pb-1 pt-4 font-display text-[17px] leading-[1.75] text-ink outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-ink-faint/75 sm:px-5 sm:text-[18px]"
              />

              <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 sm:px-3">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-seal/15 bg-seal-soft/70 px-2.5 font-mono text-[9px] text-seal-deep">
                    <span className="h-1.5 w-1.5 rounded-full bg-seal" />
                    元宝
                  </span>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setConditionsOpen((value) => !value)}
                      aria-expanded={conditionsOpen}
                      className={cn(
                        'inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[10.5px] transition-colors',
                        activeConditions.length > 0
                          ? 'border-seal/35 bg-seal-soft/55 text-seal-deep'
                          : 'border-line bg-paper/40 text-ink-soft hover:border-line-strong',
                      )}
                    >
                      <Plus size={10} />
                      条件
                      {activeConditions.length > 0 && (
                        <span className="font-mono text-[8.5px]">· {activeConditions.length}</span>
                      )}
                    </button>

                    {conditionsOpen && (
                      <div className="absolute bottom-10 left-0 z-20 w-[252px] rounded-[10px] border border-line-strong/70 bg-paper-raised p-3 shadow-sheet">
                        <p className="mono-label text-ink-faint">附加条件</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {QUICK_TAGS.map((tag) => {
                            const active = tagActive(text, tag)
                            return (
                              <button
                                key={tag.label}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                aria-pressed={active}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] transition-colors',
                                  active
                                    ? 'border-seal/35 bg-seal-soft/65 text-seal-deep'
                                    : 'border-line bg-paper/50 text-ink-soft hover:border-line-strong',
                                )}
                              >
                                {active ? <Check size={10} /> : <Plus size={10} />}
                                {tag.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={pasteLink}
                    title="粘贴链接"
                    aria-label="粘贴链接"
                    className="grid h-9 w-9 place-items-center rounded-full text-ink-faint transition-colors hover:bg-paper-deep/50 hover:text-ink"
                  >
                    <Link2 size={14} />
                  </button>
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    aria-label="开始调查"
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-full transition-colors',
                      text.trim()
                        ? 'bg-seal text-white hover:bg-seal-deep'
                        : 'cursor-not-allowed bg-paper-deep text-ink-faint/60',
                    )}
                  >
                    <ArrowUp size={18} />
                  </button>
                </div>
              </div>
            </motion.form>

            <div className="mt-8">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] tracking-[0.2em] text-ink-faint">示例</span>
                <span className="h-px flex-1 bg-line/80" />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {EXAMPLES.map((example, index) => {
                  const tone = EXAMPLE_TONES[index] ?? EXAMPLE_TONES[0]!
                  return (
                    <motion.button
                      key={example.scenarioId}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55, delay: 0.52 + index * 0.06, ease }}
                      onClick={() =>
                        onExample(example.scenarioId as keyof typeof SCENARIOS, example.question)
                      }
                      className="corner-reveal-card group/card flex min-h-[132px] flex-col items-start p-2.5 text-left"
                    >
                      <span
                        className={cn(
                          'flex h-8 w-full items-center justify-between rounded-[6px] px-2 font-mono text-[8.5px] tracking-[0.14em]',
                          tone.bg,
                          tone.text,
                        )}
                      >
                        <span>
                          0{index + 1} · {example.tag}
                        </span>
                        <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
                      </span>
                      <span className="mt-3 line-clamp-3 px-1 font-sans text-[13px] font-medium leading-[1.6] text-ink">
                        {example.question}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.72 }}
              className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line/70 pt-4 text-[10.5px] text-ink-faint"
            >
              {[
                { icon: Fingerprint, label: '可追溯' },
                { icon: ShieldCheck, label: '不编造' },
                { icon: FileText, label: '留时间' },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  <item.icon size={12} className="text-seal/80" />
                  {item.label}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.aside
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.42, ease }}
            className="relative lg:pt-16"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="flex items-center gap-2 font-mono text-[9px] tracking-[0.2em] text-ink-faint">
                <FolderOpen size={13} />
                案卷柜
              </span>
              <span className="font-mono text-[9px] text-ink-faint">最近 3 份</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {HOME_ARCHIVE.map((item) => (
                <button
                  key={item.caseNo}
                  type="button"
                  onClick={() => onArchive(item.scenarioId, item.at, item.caseNo)}
                  className="corner-reveal-card group/file w-full p-4 text-left"
                >
                  <div className="flex items-center justify-between font-mono text-[9px] text-ink-soft">
                    <span className="tracking-[0.08em]">{item.caseNo}</span>
                    <span>{item.date}</span>
                  </div>
                  <p className="mt-2 font-sans text-[13.5px] font-medium leading-[1.55] text-ink">
                    {item.question}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-ink-soft">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          item.tone === 'support' ? 'bg-support' : 'bg-unclear',
                        )}
                      />
                      {item.status}
                    </span>
                    <ArrowUpRight
                      size={13}
                      className="text-ink-faint opacity-0 transition-all duration-300 group-hover/file:-translate-y-0.5 group-hover/file:translate-x-0.5 group-hover/file:opacity-100"
                    />
                  </div>
                </button>
              ))}
            </div>

            <ChainPreview className="mt-10" />
          </motion.aside>
        </div>
      </section>
    </div>
  )
}
