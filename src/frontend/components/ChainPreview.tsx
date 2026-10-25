import { cn } from '../lib/utils'
import { AsciiField } from './AsciiField'

const branches = [
  { label: '官方口径', y: 22 },
  { label: '独立实测', y: 92 },
  { label: '社区反馈', y: 162 },
]

const sources = [
  { y: 25, tone: 'bg-[#4ADE80]' },
  { y: 95, tone: 'bg-[#F87171]' },
  { y: 165, tone: 'bg-[#FBBF24]' },
]

export function ChainPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[12px] border border-white/10 bg-[#080B0F] text-white shadow-[0_24px_60px_-40px_rgba(0,0,0,0.75)]',
        className,
      )}
      role="img"
      aria-label="链路示意：说法经过分支与原句，汇成结论"
    >
      <AsciiField dark opacity={0.5} gap={13} fontSize={8} />

      <div className="relative p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.2em] text-white/40">链路</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#C7F464] soft-pulse" />
        </div>

        <div className="relative mx-auto mt-2" style={{ width: 320, height: 238 }}>
          <svg
            viewBox="0 0 320 238"
            width={320}
            height={238}
            aria-hidden="true"
            className="absolute inset-0"
          >
            {branches.map((branch) => (
              <path
                key={`root-${branch.label}`}
                d={`M 82 118 C 94 118, 92 ${branch.y + 15}, 104 ${branch.y + 15}`}
                fill="none"
                stroke="rgba(199,244,100,0.55)"
                strokeWidth={1}
                strokeDasharray="3 4"
              />
            ))}
            {branches.map((branch, index) => (
              <path
                key={`source-${branch.label}`}
                d={`M 192 ${branch.y + 15} C 204 ${branch.y + 15}, 206 ${sources[index]!.y + 14}, 216 ${sources[index]!.y + 14}`}
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth={1}
              />
            ))}
            {sources.map((source) => (
              <path
                key={`conclusion-${source.y}`}
                d={`M 268 ${source.y + 14} C 302 ${source.y + 30}, 300 188, 250 198`}
                fill="none"
                stroke="rgba(199,244,100,0.4)"
                strokeWidth={1}
                strokeDasharray="3 4"
              />
            ))}
            <circle cx="250" cy="198" r="2.2" fill="#C7F464" />
          </svg>

          <div
            className="absolute flex h-[40px] items-center justify-center rounded-[6px] border border-[#C7F464]/35 bg-[#C7F464]/10 px-2"
            style={{ left: 2, top: 98, width: 80 }}
          >
            <span className="font-display text-[12px] font-medium text-[#C7F464]">说法</span>
          </div>

          {branches.map((branch) => (
            <div
              key={branch.label}
              className="absolute flex h-[30px] items-center rounded-[6px] border border-white/10 bg-white/[0.05] px-2.5"
              style={{ left: 104, top: branch.y, width: 88 }}
            >
              <span className="truncate text-[10px] text-white/65">{branch.label}</span>
            </div>
          ))}

          {sources.map((source) => (
            <div
              key={source.y}
              className="absolute flex h-[28px] items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.06] px-2"
              style={{ left: 216, top: source.y, width: 52 }}
            >
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', source.tone)} />
              <span className="font-mono text-[8.5px] text-white/40">原句</span>
            </div>
          ))}

          <div
            className="absolute flex h-[34px] items-center justify-center gap-1.5 rounded-[6px] border border-[#C7F464]/30 bg-[#C7F464]/10 px-2.5"
            style={{ left: 196, top: 198, width: 92 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#C7F464]" />
            <span className="font-display text-[11px] font-medium text-[#C7F464]">结论</span>
          </div>
        </div>
      </div>
    </div>
  )
}
