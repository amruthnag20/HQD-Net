/**
 * Phase 7 — Patient Report Types.
 *
 * The report is a SUMMARY assembled from existing contexts (dataset, model
 * comparison, explainability, clinical interpretation). It does not perform new
 * reasoning and does not duplicate clinical logic — it re-presents already-derived
 * data in a self-contained, print-ready document.
 */

import type {
  ClinicalInterpretationResult,
  ClinicalPriority,
  ClinicalInterpretationStatus,
} from '@/features/clinicalInterpretation/types/clinicalInterpretation'

/** Overall report lifecycle status. Never labelled "FINAL" unless state supports it. */
export type ReportStatus = 'draft' | 'ready-for-review' | 'reviewed' | 'incomplete'

/** Clinician review status for the feedback loop. */
export type ReviewerStatus = 'pending' | 'reviewed' | 'needs-revision'

/** Per-finding review action a clinician can take. */
export type FindingReviewAction = 'confirm' | 'needs-review' | 'incorrect'

/** Availability of a report section for the completeness indicator. */
export type ReportSectionAvailability = 'complete' | 'partial' | 'pending' | 'unavailable'

/** Patient / sample information available from the dataset + context. */
export type ReportPatientInfo = {
  patientId: string
  datasetName: string
  age: string | null
  sex: string | null
  /** Additional demographic key/value pairs actually present in the data. */
  demographics: { label: string; value: string }[]
}

/** Fast-scan executive summary. */
export type ReportExecutiveSummary = {
  predictionLabel: string | null
  modelProbabilityPercent: string
  priority: ClinicalPriority
  keyFinding: string | null
  interpretationStatus: ClinicalInterpretationStatus
}

/** One model's row in the model-analysis summary. */
export type ReportModelRow = {
  modelName: string
  modelType: string
  predictionLabel: string | null
  probabilityPercent: string
  status: string
}

/** Model analysis summary derived from the Phase 4 comparison result. */
export type ReportModelAnalysis = {
  available: boolean
  classical: ReportModelRow | null
  quantum: ReportModelRow | null
  agreement: string
  compatibility: string
}

/** Explainability summary derived from the Phase 5 result. */
export type ReportExplainabilitySummary = {
  available: boolean
  method: string | null
  topFeatures: { featureName: string; contribution: number | null; direction: string | null }[]
  sensitivityAvailable: boolean
  quantumMetadata: { qubits: number | null; layers: number | null; device: string | null } | null
}

/** A single section's completeness entry. */
export type ReportCompletenessEntry = {
  key: string
  label: string
  status: ReportSectionAvailability
}

/** Clinician feedback captured for the current session (frontend-only). */
export type ClinicalFeedback = {
  reportId: string
  sampleId: string
  reviewerStatus: ReviewerStatus
  note: string
  selectedFindings: string[]
  createdAt: string | null
}

/**
 * The fully-assembled report. Consumes ClinicalInterpretationResult directly; does
 * not re-run any upstream computation.
 */
export type PatientReportData = {
  /** Backend report id when available; otherwise null (no fabricated persistent id). */
  reportId: string | null
  status: ReportStatus
  generatedAt: string | null
  isDemoFixture: boolean

  patientInfo: ReportPatientInfo
  executiveSummary: ReportExecutiveSummary
  modelAnalysis: ReportModelAnalysis
  explainability: ReportExplainabilitySummary

  /** The clinical interpretation this report documents. */
  clinical: ClinicalInterpretationResult

  feedback: ClinicalFeedback
  completeness: ReportCompletenessEntry[]
}
