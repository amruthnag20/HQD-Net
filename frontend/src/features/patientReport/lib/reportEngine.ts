/**
 * Phase 7 — Patient report pure utilities.
 *
 * Completeness inspection, report-status derivation, and a plain-text summary
 * builder for the copy action. No medical reasoning; completeness is a data-
 * availability indicator, NOT a medical confidence score.
 */

import type { ClinicalInterpretationResult } from '@/features/clinicalInterpretation/types/clinicalInterpretation'
import {
  formatProbabilityPercent,
  priorityLabel,
} from '@/features/clinicalInterpretation/lib/clinicalEngine'
import type {
  ClinicalFeedback,
  PatientReportData,
  ReportCompletenessEntry,
  ReportExplainabilitySummary,
  ReportModelAnalysis,
  ReportSectionAvailability,
  ReportStatus,
} from '../types/patientReport'

/**
 * Compute the report completeness checklist purely from actual section availability.
 * This is presentation state — never a medical confidence metric.
 */
export function calculateReportCompleteness(args: {
  clinical: ClinicalInterpretationResult
  modelAnalysis: ReportModelAnalysis
  explainability: ReportExplainabilitySummary
  feedback: ClinicalFeedback
}): ReportCompletenessEntry[] {
  const { clinical, modelAnalysis, explainability, feedback } = args

  const modelStatus: ReportSectionAvailability = modelAnalysis.available
    ? modelAnalysis.classical && modelAnalysis.quantum
      ? 'complete'
      : 'partial'
    : 'unavailable'

  const explainStatus: ReportSectionAvailability = explainability.available
    ? explainability.topFeatures.length > 0
      ? 'complete'
      : 'partial'
    : 'unavailable'

  const interpretationStatus: ReportSectionAvailability =
    clinical.status === 'available'
      ? 'complete'
      : clinical.status === 'partial'
        ? 'partial'
        : clinical.status === 'loading' || clinical.status === 'not_started'
          ? 'pending'
          : 'unavailable'

  const evidenceStatus: ReportSectionAvailability =
    clinical.evidence.length > 0 ? 'complete' : 'unavailable'

  const recommendationStatus: ReportSectionAvailability =
    clinical.recommendations.length > 0 ? 'complete' : 'unavailable'

  const feedbackStatus: ReportSectionAvailability =
    feedback.reviewerStatus === 'reviewed'
      ? 'complete'
      : feedback.reviewerStatus === 'needs-revision'
        ? 'partial'
        : 'pending'

  return [
    { key: 'model', label: 'Model Analysis', status: modelStatus },
    { key: 'explainability', label: 'Explainability', status: explainStatus },
    { key: 'interpretation', label: 'Clinical Interpretation', status: interpretationStatus },
    { key: 'evidence', label: 'Medical Evidence', status: evidenceStatus },
    { key: 'recommendations', label: 'Recommendations', status: recommendationStatus },
    { key: 'feedback', label: 'Clinical Review', status: feedbackStatus },
  ]
}

/**
 * Derive the report status from actual state. Only reaches 'reviewed' when a
 * clinician has reviewed; 'incomplete' when core sections are missing.
 */
export function getReportStatus(args: {
  clinical: ClinicalInterpretationResult
  completeness: ReportCompletenessEntry[]
  feedback: ClinicalFeedback
}): ReportStatus {
  const { clinical, completeness, feedback } = args

  if (feedback.reviewerStatus === 'reviewed') return 'reviewed'

  const coreMissing = completeness.some(
    (c) =>
      (c.key === 'model' || c.key === 'interpretation') &&
      (c.status === 'unavailable' || c.status === 'pending'),
  )
  if (coreMissing || clinical.status === 'not_started' || clinical.status === 'unavailable') {
    return 'incomplete'
  }
  if (feedback.reviewerStatus === 'needs-revision') return 'draft'
  return 'ready-for-review'
}

/** Whether the report has enough data to be meaningfully displayed. */
export function isReportRenderable(clinical: ClinicalInterpretationResult): boolean {
  return clinical.status !== 'not_started' && clinical.predictionLabel != null
}

export function reportStatusLabel(status: ReportStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'ready-for-review':
      return 'Ready for Review'
    case 'reviewed':
      return 'Reviewed'
    case 'incomplete':
      return 'Incomplete'
    default:
      return 'Draft'
  }
}

export function completenessLabel(status: ReportSectionAvailability): string {
  switch (status) {
    case 'complete':
      return 'Complete'
    case 'partial':
      return 'Partial'
    case 'pending':
      return 'Pending'
    case 'unavailable':
      return 'Not available'
    default:
      return 'Pending'
  }
}

/**
 * Build a plain-text report summary for the copy-to-clipboard action. Contains only
 * structured, user-visible information — no hidden metadata.
 */
export function buildReportSummaryText(report: PatientReportData): string {
  const lines: string[] = []
  lines.push('HQD-NET — PATIENT ANALYSIS REPORT')
  lines.push('')
  lines.push(`Patient / Sample: ${report.patientInfo.patientId}`)
  lines.push(`Dataset: ${report.patientInfo.datasetName}`)
  if (report.generatedAt) lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Report status: ${reportStatusLabel(report.status)}`)
  lines.push('')
  lines.push('EXECUTIVE SUMMARY')
  lines.push(`  Prediction: ${report.executiveSummary.predictionLabel ?? '—'}`)
  lines.push(`  Model probability: ${report.executiveSummary.modelProbabilityPercent}`)
  lines.push(`  Review priority: ${priorityLabel(report.executiveSummary.priority)}`)
  if (report.executiveSummary.keyFinding) {
    lines.push(`  Key finding: ${report.executiveSummary.keyFinding}`)
  }
  lines.push('')

  if (report.clinical.narrative.summary) {
    lines.push('CLINICAL INTERPRETATION')
    lines.push(`  ${report.clinical.narrative.summary}`)
    lines.push('')
  }

  if (report.clinical.recommendations.length > 0) {
    lines.push('RECOMMENDATIONS')
    for (const rec of report.clinical.recommendations) {
      lines.push(`  - ${rec.title}`)
    }
    lines.push('')
  }

  if (report.clinical.isDemoFixture) {
    lines.push('NOTE: This report contains DEMO / DEVELOPMENT content for UI verification.')
    lines.push('')
  }

  lines.push(
    'Disclaimer: AI-generated analysis is intended to support clinical review and does not replace professional medical judgment.',
  )
  return lines.join('\n')
}

/** Format a probability pair's predicted-class percentage for the executive summary. */
export function executiveProbabilityPercent(
  clinical: ClinicalInterpretationResult,
): string {
  const probs = clinical.modelProbabilities
  if (!probs) return '—'
  const label = clinical.predictionLabel
  if (label === 'Normal') return formatProbabilityPercent(probs.Normal)
  if (label === 'High Risk') return formatProbabilityPercent(probs['High Risk'])
  // Fall back to the larger of the two.
  return formatProbabilityPercent(Math.max(probs.Normal, probs['High Risk']))
}
