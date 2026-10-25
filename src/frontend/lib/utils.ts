import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  official: '官方材料',
  user: '使用者报告',
  'third-party': '第三方材料',
}

export const RELATION_LABEL: Record<string, string> = {
  supports: '支持',
  conflicts: '冲突',
  unclear: '尚不能判断',
}

export const RELATION_TONE: Record<string, string> = {
  supports: 'border-support/30 bg-support-soft/70 text-support',
  conflicts: 'border-conflict/30 bg-conflict-soft/70 text-conflict',
  unclear: 'border-unclear/30 bg-unclear-soft/70 text-unclear',
}

export const SOURCE_TONE: Record<string, string> = {
  official: 'border-official/25 bg-official-soft/70 text-official',
  user: 'border-user/25 bg-user-soft/70 text-user',
  'third-party': 'border-third/25 bg-third-soft/70 text-third',
}

export const SOURCE_BAR: Record<string, string> = {
  official: 'bg-official',
  user: 'bg-user',
  'third-party': 'bg-third',
}

export function activityTime(start: string, index: number) {
  const [h = 0, m = 0] = start.split(':').map(Number)
  const total = h * 3600 + m * 60 + 6 + index * 4
  const hh = Math.floor(total / 3600) % 24
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return [hh, mm, ss].map((n) => String(n).padStart(2, '0')).join(':')
}

export function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function evidenceIndex(sources: EvidenceLike[], id: string) {
  const i = sources.findIndex((s) => s.id === id)
  return i === -1 ? null : i + 1
}

type EvidenceLike = { id: string }

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
