import { createContext } from 'react'
import type { PatientReportData, FindingReviewAction, ReviewerStatus } from '../types/patientReport'

export type PatientReportContextValue = {
  report: PatientReportData
  /** Dev inspector — mirrors the clinical fixture key. */
  activeFixtureKey: string
  setActiveFixtureKey: (key: string) => void
  // Session-only feedback actions (no backend persistence).
  setReviewerStatus: (status: ReviewerStatus) => void
  setNote: (note: string) => void
  toggleFinding: (findingId: string, action?: FindingReviewAction) => void
  copySummary: () => Promise<boolean>
}

export const PatientReportContext = createContext<PatientReportContextValue | null>(null)
