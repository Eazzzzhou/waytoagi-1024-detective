'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { LiveWorkspace } from './components/LiveWorkspace'

// The demo corpus and its scenario renderer are separate from the live workspace.
// Loading this module must never put the pre-baked case data into the live entry chunk.
const DemoApp = dynamic(() => import('./DemoApp'), {
  ssr: false,
  loading: () => <p className="p-8 text-sm text-ink-soft">正在载入演示样稿…</p>,
})

export default function App() {
  const [demo, setDemo] = useState(false)
  if (!demo) return <LiveWorkspace onDemo={() => setDemo(true)} />
  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-seal px-5 py-3 text-sm text-white">
        <span>演示样稿 · 以下为预置内容，不是本次调查结果</span>
        <button className="shrink-0 underline" onClick={() => setDemo(false)}>
          返回正式调查
        </button>
      </div>
      <DemoApp />
    </>
  )
}
