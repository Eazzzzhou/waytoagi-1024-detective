import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import { cn } from '../lib/utils'

/**
 * FoldText, adapted from React Bits (reactbits.dev/text-animations/fold-text).
 * Keeps the line-fold + crease mechanics, mount-only, with reduced-motion support.
 */
export function FoldText({
  text,
  className,
  delay = 0,
  duration = 0.95,
  stagger = 0.09,
}: {
  text: string
  className?: string
  delay?: number
  duration?: number
  stagger?: number
}) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const lines = text.split('\n')

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const pieces = Array.from(root.querySelectorAll<HTMLElement>('.fold-piece'))
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      gsap.set(pieces, { opacity: 1, rotateX: 0 })
      return
    }
    const timeline = gsap.timeline({ delay })
    timeline.fromTo(
      pieces,
      { rotateX: -92, opacity: 0 },
      { rotateX: 0, opacity: 1, duration, stagger, ease: 'power3.out' },
    )
    return () => {
      timeline.kill()
    }
  }, [text, delay, duration, stagger])

  return (
    <span ref={rootRef} className={cn('fold-text', className)}>
      {lines.map((line, index) => (
        <span className="fold-line" key={`${line}-${index}`}>
          <span
            className="fold-piece"
            data-fold-text={line}
            style={{ '--fold-delay': `${delay + index * stagger}s` } as CSSProperties}
          >
            {line || '\u00A0'}
          </span>
        </span>
      ))}
    </span>
  )
}
