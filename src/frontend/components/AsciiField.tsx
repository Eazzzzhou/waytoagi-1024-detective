import { useEffect, useRef } from 'react'
import { cn } from '../lib/utils'

/**
 * Asciify "Swell"-style field: a slow grid of characters that swells near the pointer.
 * Canvas-based, no dependency, pauses when off-screen or hidden.
 */
export function AsciiField({
  className,
  opacity = 0.32,
  gap = 14,
  fontSize = 9,
  animate = true,
  dark = false,
}: {
  className?: string
  opacity?: number
  gap?: number
  fontSize?: number
  animate?: boolean
  dark?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    if (!canvas || !host) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 1
    let height = 1
    let raf = 0
    let last = 0
    let pointerX = -9999
    let pointerY = -9999
    let visible = true
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const rect = host.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height)
      const cols = Math.ceil(width / gap)
      const rows = Math.ceil(height / gap)
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = (col + 0.5) * gap
          const y = (row + 0.5) * gap
          const wave =
            (Math.sin(col * 0.42 + time * 0.0007) +
              Math.sin(row * 0.55 - time * 0.0005) +
              Math.sin((col + row) * 0.22 + time * 0.0003)) /
            3
          let alpha = 0.035 + Math.max(0, wave) * 0.13
          if (pointerX > -999) {
            const distance = Math.hypot(pointerX - x, pointerY - y)
            if (distance < 92) alpha += (1 - distance / 92) * 0.22
          }
          if (alpha < 0.04) continue
          const accent = (col * 7 + row * 11) % 41 === 0
          ctx.fillStyle = dark
            ? accent
              ? `rgba(199, 244, 100, ${alpha * 0.95})`
              : `rgba(255, 255, 255, ${alpha * 0.8})`
            : accent
              ? `rgba(26, 115, 232, ${alpha * 0.85})`
              : `rgba(11, 18, 32, ${alpha})`
          const char = (col * 7 + row * 13 + Math.floor(time / 900)) % 17 === 0 ? '+' : '.'
          ctx.fillText(char, x, y)
        }
      }
    }

    const loop = (time: number) => {
      raf = window.requestAnimationFrame(loop)
      if (!visible || document.hidden) return
      if (time - last < 33) return
      last = time
      draw(time)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      pointerX = event.clientX - rect.left
      pointerY = event.clientY - rect.top
    }
    const onPointerLeave = () => {
      pointerX = -9999
      pointerY = -9999
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()
    draw(0)

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false
      },
      { threshold: 0 },
    )
    observer.observe(host)

    if (!reduced && animate) {
      host.addEventListener('pointermove', onPointerMove)
      host.addEventListener('pointerleave', onPointerLeave)
      raf = window.requestAnimationFrame(loop)
    }

    return () => {
      window.cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      observer.disconnect()
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [gap, fontSize, animate, dark])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      style={{ opacity }}
    />
  )
}
