export function Footer() {
  return (
    <footer className="mt-24 border-t border-line/70">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-6 py-8 text-[11px] text-ink-faint sm:px-8">
        <span className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-seal/60" />
          案卷 · 每句结论都应有出处
        </span>
        <span className="font-mono text-[9.5px] tracking-[0.12em]">
          OFFICIAL CLAIM ≠ USER REPORT ≠ AI SUMMARY
        </span>
      </div>
    </footer>
  )
}
