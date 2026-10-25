import { useEffect, useRef } from 'react'

/** Keep the complete, selectable heading as HTML; Asciify is only its entrance. */
export function DecodeHeadline() {
  const headlineRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const element = headlineRef.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let disposed = false
    let destroy: (() => void) | undefined

    // Sample the browser's final Chinese glyph positions, including both lines.
    void Promise.all([import('asciify-engine/kit'), document.fonts.ready])
      .then(([{ decode }]) => {
        if (disposed) return
        const animation = decode(element, {
          duration: 800,
          settle: 'text',
          trigger: 'visible',
          replayOnHover: true,
          lazy: false,
          ink: '--color-ink',
          look: { cellSize: 6, hover: 'none' },
        })
        destroy = () => animation.destroy()
      })
      .catch(() => {
        // Loading or GPU failure must leave the original heading readable.
      })

    return () => {
      disposed = true
      destroy?.()
    }
  }, [])

  return (
    <h1
      ref={headlineRef}
      className="mt-7 pb-2 font-display text-[clamp(2.55rem,7.4vw,4.5rem)] font-semibold leading-[1.12] tracking-[-0.015em]"
    >
      <span className="block">让每句结论，</span>
      <span className="inline-block">都回到出处。</span>
    </h1>
  )
}
