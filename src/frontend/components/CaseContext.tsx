import { createContext, useContext } from 'react'
import type { Evidence } from '../types'

export interface CaseApi {
  sources: Evidence[]
  openEvidence: (id: string, trigger?: HTMLElement | null) => void
  hovered: string | null
  setHovered: (id: string | null) => void
  openGraph: () => void
}

export const CaseContext = createContext<CaseApi>({
  sources: [],
  openEvidence: () => {},
  hovered: null,
  setHovered: () => {},
  openGraph: () => {},
})

export function useCase() {
  return useContext(CaseContext)
}
