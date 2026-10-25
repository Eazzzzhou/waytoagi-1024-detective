import { ArrowUpRight, Info, Plus } from 'lucide-react'
import { Seal } from './ui'

export function Header({
  onHome,
  onNew,
  onMethod,
}: {
  onHome: () => void
  onNew: () => void
  onMethod: () => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <button
          type="button"
          onClick={onHome}
          className="group flex items-center gap-2.5 rounded-sm"
          aria-label="案卷首页"
        >
          <span className="text-seal transition-transform duration-500 ease-out group-hover:-rotate-6">
            <Seal size={29} />
          </span>
          <span className="font-display text-[21px] font-semibold tracking-[0.1em]">案卷</span>
          <span className="mt-[3px] hidden font-mono text-[9px] tracking-[0.26em] text-ink-faint sm:inline">
            DOSSIER
          </span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onMethod}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-ink-soft transition-colors hover:bg-paper-deep/60 hover:text-ink"
          >
            <Info size={14} />
            <span className="hidden sm:inline">方法</span>
          </button>
          <span className="hidden h-4 w-px bg-line sm:block" />
          <button
            type="button"
            onClick={onNew}
            className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-seal px-3.5 text-[12.5px] text-white transition-colors hover:bg-seal-deep"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">新调查</span>
            <ArrowUpRight
              size={12}
              className="opacity-70 transition-all group-hover:-translate-y-px group-hover:translate-x-px group-hover:opacity-100"
            />
          </button>
        </div>
      </div>
    </header>
  )
}
