export type SourceType = 'official' | 'user' | 'third-party'
export type Relation = 'supports' | 'conflicts' | 'unclear'
export type ActivityKind = 'plan' | 'search' | 'read' | 'rescan' | 'archive' | 'clarify'
export type ActivityStatus = 'ok' | 'restricted' | 'empty' | 'failed' | 'skipped'

export interface Evidence {
  id: string
  title: string
  site: string
  url: string
  sourceType: SourceType
  upstream?: string
  original: string
  originalLang: 'zh' | 'en'
  highlight?: string
  translation?: string
  author?: string
  published?: string
  retrieved: string
  version?: string
  plan?: string
  relation: Relation
  relationNote: string
  readStatus?: 'ok' | 'restricted'
  restrictedNote?: string
  mirrors?: { site: string; url: string }[]
  foundBy: { query: string; engine: string; activityId: string }
  summary?: string
}

export interface Activity {
  id: string
  kind: ActivityKind
  title: string
  detail?: string
  branch?: string
  engine?: string
  query?: string
  site?: string
  status?: ActivityStatus
  evidenceId?: string
  parents?: string[]
  delay: number
  currentLabel?: string
}

export interface CapabilityRow {
  dim: string
  judgement: string
  level: 'strong' | 'ok' | 'weak' | 'none'
  scope: string
  cite?: string
  relevant?: boolean
}

export interface Verdict {
  level: 'worth' | 'conditional' | 'avoid' | 'insufficient'
  label: string
  eyebrow: string
  summary: string
  conditions: { label: string; detail: string }[]
}

export interface ConflictItem {
  side: 'official' | 'independent' | 'media'
  sourceId: string
  excerpt: string
  condition: string
}

export interface Result {
  id: string
  kind: 'fact' | 'evaluation' | 'insufficient'
  caseNo: string
  question: string
  scope: { label: string; value: string }[]
  investigatedAt: string
  tldr: string
  answer: string[]
  facts?: {
    title: string
    columns: string[]
    rows: string[][]
    note?: string
  }
  conflict?: {
    summary: string
    items: ConflictItem[]
    reconcile: string
  }
  gaps: { title: string; body: string }[]
  counts: { value: string; label: string }[]
  sources: Evidence[]
  verdict?: Verdict
  conditions?: string[]
  capability?: { rows: CapabilityRow[]; note: string }
  followUps: { q: string; a: string; cites?: string[] }[]
  activities: Activity[]
  flags?: {
    partial?: boolean
    history?: boolean
    insufficient?: boolean
    conflict?: boolean
  }
  note?: string
}

export interface Scenario {
  id: string
  label: string
  demo: string
  kind: 'fact' | 'conflict' | 'usecase' | 'ambiguous' | 'insufficient' | 'failure'
  question: string
  result: Result | null
  activities: Activity[]
  clarifyAt?: number
  clarify?: {
    question: string
    options: { label: string; hint: string }[]
  }
  failAt?: number
  failure?: { reason: string; detail: string; attempts: string }
}

export type View =
  | { name: 'home' }
  | { name: 'investigating'; scenarioId: string; question: string }
  | { name: 'result'; scenarioId: string; question?: string | undefined; historyAt?: string | undefined; caseNo?: string | undefined }
  | { name: 'failure'; scenarioId: string; question: string }

export interface GraphNode {
  id: string
  label: string
  kind: 'question' | 'branch' | 'search' | 'read' | 'rescan' | 'conclusion'
  col: number
  row: number
  status?: ActivityStatus | 'running' | undefined
  meta?: string | undefined
  detail?: string | undefined
  evidenceId?: string | undefined
}

export interface GraphEdge {
  from: string
  to: string
  dashed?: boolean
}
