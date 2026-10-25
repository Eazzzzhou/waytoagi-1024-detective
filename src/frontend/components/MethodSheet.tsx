import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Check, HelpCircle, Link2, ShieldCheck } from 'lucide-react'
import { CloseButton, RelationTag, SourceTypeTag } from './ui'

export function MethodSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            aria-label="关闭方法说明"
            onClick={onClose}
            className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="method-title"
            initial={{ y: 30, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-[88vh] w-full max-w-[860px] overflow-y-auto rounded-t-2xl border border-line-strong/70 bg-paper-raised p-6 shadow-sheet sm:rounded-xl sm:p-9"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="mono-label text-seal">METHOD / 调查方法</p>
                <h2 id="method-title" className="mt-3 font-display text-[27px] font-semibold leading-tight">
                  只展示能核实的东西。
                </h2>
                <p className="mt-3 max-w-[560px] text-[13.5px] leading-[1.85] text-ink-soft">
                  材料、原句关系、发现路径，分开记录。
                </p>
              </div>
              <span ref={closeRef}>
                <CloseButton onClick={onClose} />
              </span>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <div className="border-t border-line pt-4">
                <p className="mono-label text-ink-faint">材料来源</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <SourceTypeTag type="official" />
                  <SourceTypeTag type="user" />
                  <SourceTypeTag type="third-party" />
                </div>
                <p className="mt-3 text-[12px] leading-[1.8] text-ink-soft">
                  官方、使用者、第三方分开。
                </p>
              </div>

              <div className="border-t border-line pt-4">
                <p className="mono-label text-ink-faint">与原句的关系</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <RelationTag relation="supports" />
                  <RelationTag relation="conflicts" />
                  <RelationTag relation="unclear" />
                </div>
                <p className="mt-3 text-[12px] leading-[1.8] text-ink-soft">
                  关系都附原句；不够就写尚不能判断。
                </p>
              </div>

              <div className="border-t border-line pt-4">
                <p className="mono-label text-ink-faint">数量与时间</p>
                <ul className="mt-3 space-y-2 text-[12px] leading-[1.7] text-ink-soft">
                  <li className="flex gap-2">
                    <Link2 size={13} className="mt-0.5 shrink-0 text-ink-faint" />
                    找到的链接 ≠ 读到的页面。
                  </li>
                  <li className="flex gap-2">
                    <ShieldCheck size={13} className="mt-0.5 shrink-0 text-ink-faint" />
                    独立来源先合并同源。
                  </li>
                  <li className="flex gap-2">
                    <Check size={13} className="mt-0.5 shrink-0 text-ink-faint" />
                    发布时间与获取时间分列。
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-line bg-paper/70 p-5">
              <p className="flex items-center gap-2 text-[12px] font-medium text-ink">
                <AlertTriangle size={14} className="text-unclear" />
                不展示模型思考
              </p>
              <p className="mt-2 text-[12px] leading-[1.85] text-ink-soft">
                只记录搜索、读取、补查与失败。无数据时不显示百分比。
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[11px] text-ink-faint">
              <span className="font-mono">OFFICIAL ≠ USER REPORT ≠ AI SUMMARY</span>
              <span className="inline-flex items-center gap-1.5">
                <HelpCircle size={12} />
                例子里的数字为设计样稿，正式演示前替换为真实调查
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
