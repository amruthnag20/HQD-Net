import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ClinicalContext } from '@/features/clinicalInterpretation/context/clinical-context'
import { ExplainabilityContext } from '@/features/explainability/context/explainability-context'
import { ModelComparisonContext } from '@/features/modelComparison/context/modelComparison-context'
import { assemblePatientReport, emptyFeedback } from '../api/patientReportAdapter'
import { buildReportSummaryText } from '../lib/reportEngine'
import { PatientReportContext, type PatientReportContextValue } from './patientReport-context'
import type { ClinicalFeedback, FindingReviewAction, ReviewerStatus } from '../types/patientReport'

/**
 * Assembles the Patient Report from the shared ClinicalContext plus the upstream
 * explainability / comparison results. Feedback and report-status are held as
 * session-only state (frontend-only; no backend persistence). The clinical fixture
 * selection is proxied through the ClinicalContext so both pages stay in sync.
 */
export function PatientReportProvider({ children }: { children: ReactNode }) {
  const clinicalCtx = useContext(ClinicalContext)
  const explainabilityCtx = useContext(ExplainabilityContext)
  const comparisonCtx = useContext(ModelComparisonContext)

  const clinical = clinicalCtx?.interpretation
  const sampleId = clinical?.sampleId ?? '—'

  // Session-scoped feedback. reportId is a transient in-session identifier only
  // (never a fabricated persistent id) — reset when the sample changes.
  const [feedback, setFeedback] = useState<ClinicalFeedback>(() =>
    emptyFeedback('', sampleId),
  )

  const setReviewerStatus = useCallback((status: ReviewerStatus) => {
    setFeedback((f) => ({ ...f, reviewerStatus: status, createdAt: new Date().toISOString() }))
  }, [])

  const setNote = useCallback((note: string) => {
    setFeedback((f) => ({ ...f, note }))
  }, [])

  const toggleFinding = useCallback((findingId: string, _action?: FindingReviewAction) => {
    void _action
    setFeedback((f) => {
      const has = f.selectedFindings.includes(findingId)
      return {
        ...f,
        selectedFindings: has
          ? f.selectedFindings.filter((id) => id !== findingId)
          : [...f.selectedFindings, findingId],
      }
    })
  }, [])

  const report = useMemo(() => {
    if (!clinical) {
      throw new Error('PatientReportProvider requires a ClinicalInterpretationProvider ancestor')
    }
    return assemblePatientReport({
      clinical,
      comparison: comparisonCtx?.comparisonResult ?? null,
      explanation: explainabilityCtx?.result ?? null,
      feedback: { ...feedback, sampleId },
      reportId: null,
    })
  }, [clinical, comparisonCtx?.comparisonResult, explainabilityCtx?.result, feedback, sampleId])

  const copySummary = useCallback(async (): Promise<boolean> => {
    try {
      const text = buildReportSummaryText(report)
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [report])

  const value = useMemo(
    (): PatientReportContextValue => ({
      report,
      activeFixtureKey: clinicalCtx?.activeFixtureKey ?? 'live',
      setActiveFixtureKey: clinicalCtx?.setActiveFixtureKey ?? (() => {}),
      setReviewerStatus,
      setNote,
      toggleFinding,
      copySummary,
    }),
    [report, clinicalCtx?.activeFixtureKey, clinicalCtx?.setActiveFixtureKey, setReviewerStatus, setNote, toggleFinding, copySummary],
  )

  return <PatientReportContext.Provider value={value}>{children}</PatientReportContext.Provider>
}
