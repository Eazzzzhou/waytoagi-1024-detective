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
        'chain-preview-stack',
        className,
      )}
      role="img"
      aria-label="链路示意：说法经过分支与原句，汇成结论"
    >
      <div className="chain-preview-card">
          <div className="chain-preview-image relative overflow-hidden bg-white text-ink">
        <AsciiField opacity={0.32} gap={13} fontSize={8} />

        <div className="relative p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] tracking-[0.2em] text-ink-faint">链路</span>
            <span className="h-1.5 w-1.5 rounded-full bg-support soft-pulse" />
          </div>

          <div className="relative mx-auto mt-2 aspect-[320/238] w-full max-w-[320px]">
            <svg
              viewBox="0 0 320 238"
              width={320}
              height={238}
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
            >
              {branches.map((branch) => (
                <path
                  key={`root-${branch.label}`}
                  d={`M 82 118 C 94 118, 92 ${branch.y + 15}, 104 ${branch.y + 15}`}
                  fill="none"
                  stroke="var(--color-support)"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
              ))}
              {branches.map((branch, index) => (
                <path
                  key={`source-${branch.label}`}
                  d={`M 192 ${branch.y + 15} C 204 ${branch.y + 15}, 206 ${sources[index]!.y + 14}, 216 ${sources[index]!.y + 14}`}
                  fill="none"
                  stroke="var(--color-line-strong)"
                  strokeWidth={1}
                />
              ))}
              {sources.map((source) => (
                <path
                  key={`conclusion-${source.y}`}
                  d={`M 268 ${source.y + 14} C 302 ${source.y + 30}, 300 188, 250 198`}
                  fill="none"
                  stroke="var(--color-support)"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
              ))}
              <circle cx="250" cy="198" r="2.2" fill="var(--color-support)" />
            </svg>

            <div
              className="absolute flex h-[40px] items-center justify-center rounded-[6px] border border-support/35 bg-support-soft px-2"
              style={{ left: '0.625%', top: '41.176%', width: '25%', height: '16.807%' }}
            >
              <span className="font-display text-[12px] font-medium text-support">说法</span>
            </div>

            {branches.map((branch) => (
              <div
                key={branch.label}
                className="absolute flex h-[30px] items-center rounded-[6px] border border-line-strong bg-paper px-2.5"
                style={{ left: '32.5%', top: `${branch.y / 238 * 100}%`, width: '27.5%', height: '12.605%' }}
              >
                <span className="truncate text-[10px] text-ink-soft">{branch.label}</span>
              </div>
            ))}

            {sources.map((source) => (
              <div
                key={source.y}
                className="absolute flex h-[28px] items-center gap-1 rounded-[6px] border border-line-strong bg-paper px-1"
                style={{ left: '67.5%', top: `${source.y / 238 * 100}%`, width: '16.25%', height: '11.765%' }}
              >
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', source.tone)} />
                <span className="font-mono text-[8.5px] text-ink-faint">原句</span>
              </div>
            ))}

            <div
              className="absolute flex h-[34px] items-center justify-center gap-1.5 rounded-[6px] border border-support/30 bg-support-soft px-2.5"
              style={{ left: '61.25%', top: '83.193%', width: '28.75%', height: '14.286%' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-support" />
              <span className="font-display text-[11px] font-medium text-support">结论</span>
            </div>
          </div>
        </div>
          </div>
      </div>
    </div>
  )
}
