import { useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, HelpCircle, X } from 'lucide-react'
import { cn, clamp, RELATION_LABEL, RELATION_TONE, SOURCE_TONE, SOURCE_TYPE_LABEL } from '../lib/utils'
import { useCase } from './CaseContext'

/* ── Brand seal ─────────────────────────────────────────────── */

export function Seal({ className, size = 30 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn('text-seal', className)}
    >
      <rect x="1" y="1" width="38" height="38" rx="9" fill="currentColor" />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="'Noto Serif SC', 'Songti SC', serif"
        fontSize="18"
        fontWeight="600"
        fill="#ffffff"
      >
        案
      </text>
    </svg>
  )
}

/* ── Tags ───────────────────────────────────────────────────── */

export function SourceTypeTag({
  type,
  className,
  dot = true,
}: {
  type: string
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[10px] leading-none',
        SOURCE_TONE[type],
        className,
      )}
    >
      {dot && <span className="h-1 w-1 rounded-full bg-current" />}
      {SOURCE_TYPE_LABEL[type]}
    </span>
  )
}

const relationIcon = {
  supports: Check,
  conflicts: AlertTriangle,
  unclear: HelpCircle,
} as const

export function RelationTag({
  relation,
  className,
  compact = false,
}: {
  relation: string
  className?: string
  compact?: boolean
}) {
  const Icon = relationIcon[relation as keyof typeof relationIcon] ?? HelpCircle
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10px] leading-none',
        RELATION_TONE[relation],
        className,
      )}
    >
      <Icon size={10} strokeWidth={2} />
      {!compact && RELATION_LABEL[relation]}
    </span>
  )
}

export function Chip({
  children,
  active,
  onClick,
  className,
  icon,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
  icon?: ReactNode
}) {
  const Element = onClick ? 'button' : 'span'
  return (
    <Element
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors',
        active
          ? 'border-seal/40 bg-seal-soft/70 text-seal-deep'
          : 'border-line bg-paper-raised/60 text-ink-soft hover:border-line-strong hover:text-ink',
        className,
      )}
    >
      {icon}
      {children}
    </Element>
  )
}

export function StatusDot({ tone = 'seal', pulse = false }: { tone?: 'seal' | 'support' | 'unclear' | 'muted'; pulse?: boolean }) {
  const colors = {
    seal: 'bg-seal',
    support: 'bg-support',
    unclear: 'bg-unclear',
    muted: 'bg-ink-faint',
  }
  return (
    <span className="relative flex h-2 w-2">
      {pulse && (
        <span
          className={cn('absolute inset-0 rounded-full opacity-40', colors[tone], 'motion-safe:animate-ping')}
        />
      )}
      <span className={cn('relative h-2 w-2 rounded-full', colors[tone])} />
    </span>
  )
}

/* ── Section heading ────────────────────────────────────────── */

export function SectionLabel({
  index,
  title,
  aside,
  className,
}: {
  index?: string
  title: string
  aside?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline gap-3', className)}>
      {index && (
        <span className="font-mono text-[10px] tracking-[0.18em] text-seal">{index}</span>
      )}
      <h2 className="font-display text-[19px] font-semibold tracking-[0.04em] text-ink">{title}</h2>
      <span className="h-px flex-1 bg-line" />
      {aside}
    </div>
  )
}

/* ── Rich text with citations ───────────────────────────────── */

export function RichText({ text, className }: { text: string; className?: string }) {
  const nodes = useMemo(() => tokenize(text), [text])
  return <span className={className}>{nodes}</span>
}

function tokenize(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\[\[[a-zA-Z0-9-]+\]\]|`[^`]+`|\*\*[^*]+\*\*)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('[[')) {
      out.push(<Cite key={`c${key++}`} id={token.slice(2, -2)} />)
    } else if (token.startsWith('`')) {
      out.push(
        <code
          key={`k${key++}`}
          className="mx-[0.08em] rounded-[3px] bg-ink/[0.055] px-1.5 py-[0.12em] font-mono text-[0.84em] text-ink"
        >
          {token.slice(1, -1)}
        </code>,
      )
    } else {
      out.push(
        <strong key={`b${key++}`} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>,
      )
    }
    last = match.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/* ── Citation ───────────────────────────────────────────────── */

export function Cite({ id }: { id: string }) {
  const { sources, openEvidence, setHovered } = useCase()
  const ref = useRef<HTMLButtonElement>(null)
  const [tip, setTip] = useState<{ left: number; top: number; above: boolean } | null>(null)
  const source = sources.find((s) => s.id === id)
  const index = sources.findIndex((s) => s.id === id) + 1

  if (!source || index === 0) return null

  const show = () => {
    setHovered(id)
    if (!window.matchMedia('(hover: hover)').matches || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const width = 312
    const above = r.top > 240
    setTip({
      left: clamp(r.left + r.width / 2, width / 2 + 12, window.innerWidth - width / 2 - 12),
      top: above ? r.top - 10 : r.bottom + 10,
      above,
    })
  }

  const hide = () => {
    setHovered(null)
    setTip(null)
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation()
          hide()
          openEvidence(id, ref.current)
        }}
        aria-label={`查看证据 ${index}：${source.title}`}
        className="relative -top-[0.4em] mx-[0.16em] inline-flex h-[1.28em] min-w-[1.28em] items-center justify-center rounded-[3px] border border-seal/35 bg-seal-soft/60 px-[0.24em] align-baseline font-mono text-[0.64em] leading-none text-seal transition-colors hover:bg-seal hover:text-paper-raised focus-visible:bg-seal focus-visible:text-paper-raised"
      >
        {index}
      </button>
      {tip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[95] hidden w-[312px] -translate-x-1/2 lg:block"
            style={{
              left: tip.left,
              top: tip.top,
              transform: `translate(-50%, ${tip.above ? '-100%' : '0'})`,
            }}
          >
            <div className="rounded-[6px] border border-line-strong/80 bg-paper-raised p-3.5 shadow-sheet">
              <div className="flex items-center justify-between gap-3">
                <span className="mono-label text-ink-faint">
                  证据 {String(index).padStart(2, '0')} · {SOURCE_TYPE_LABEL[source.sourceType]}
                </span>
                <span className="text-[9px] text-seal">点击查看原句</span>
              </div>
              <p className="mt-1.5 font-display text-[12.5px] font-medium leading-snug text-ink">
                {source.title}
              </p>
              <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-soft">
                {source.readStatus === 'restricted'
                  ? source.restrictedNote
                  : source.original || source.translation}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

/* ── Stamp ──────────────────────────────────────────────────── */

export function Stamp({
  label = '已归档',
  meta = 'ARCHIVED',
  size = 'md',
  className,
}: {
  label?: string
  meta?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dims = size === 'lg' ? 'h-[104px] w-[104px]' : size === 'sm' ? 'h-[58px] w-[58px]' : 'h-[76px] w-[76px]'
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative grid shrink-0 place-items-center rounded-[2px] border-[1.5px] border-seal/55 text-seal/80',
        'after:absolute after:inset-[3px] after:rounded-[1px] after:border after:border-seal/25',
        dims,
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <span
          className={cn(
            'font-display font-semibold tracking-[0.16em]',
            size === 'lg' ? 'text-[15px]' : size === 'sm' ? 'text-[10px]' : 'text-[12px]',
          )}
        >
          {label}
        </span>
        <span className="font-mono text-[7px] tracking-[0.18em] opacity-70">{meta}</span>
      </div>
    </div>
  )
}

/* ── Misc ───────────────────────────────────────────────────── */

export function IconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-grid h-9 w-9 place-items-center rounded-full border border-line bg-paper-raised/60 text-ink-soft transition-colors hover:border-line-strong hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function CloseButton({ onClick, label = '关闭' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-grid h-9 w-9 place-items-center rounded-full border border-line bg-paper-raised/70 text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
    >
      <X size={16} />
    </button>
  )
}

export function EmptyRule({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
