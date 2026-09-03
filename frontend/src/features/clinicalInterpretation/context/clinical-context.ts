import { createContext } from 'react'
import type { ClinicalInterpretationResult } from '../types/clinicalInterpretation'

/**
 * Shared clinical context consumed by BOTH Phase 6 (Clinical Interpretation) and
 * Phase 7 (Patient Report). The report reads this context rather than
 * independently querying every upstream source.
 */
export type ClinicalContextValue = {
  interpretation: ClinicalInterpretationResult
  /** Dev inspector: 'live' or a fixture key. */
  activeFixtureKey: string
  setActiveFixtureKey: (key: string) => void
  isLoading: boolean
  error: string | null
  refresh: () => void
  /** Evidence ↔ finding cross-highlighting. */
  selectedFindingId: string | null
  setSelectedFindingId: (id: string | null) => void
  selectedEvidenceId: string | null
  setSelectedEvidenceId: (id: string | null) => void
}

export const ClinicalContext = createContext<ClinicalContextValue | null>(null)
