/**
 * Phase 7 — Patient report adapter.
 *
 * Assembles a {@link PatientReportData} from existing contexts. It re-presents
 * already-derived data (model comparison, explainability, clinical interpretation)
 * and computes completeness from actual availability. It does NOT duplicate clinical
 * reasoning or recompute comparison/explanation logic.
 */

import type { ClinicalInterpretationResult } from '@/features/clinicalInterpretation/types/clinicalInterpretation'
import type { ExplainabilityResult } from '@/features/explainability/types/explainability'
import type { ModelComparisonResult, ModelOutputSummary } from '@/features/modelComparison/types/modelComparison'
import { formatProbabilityPercent } from '@/features/clinicalInterpretation/lib/clinicalEngine'
import type {
  ClinicalFeedback,
  PatientReportData,
  ReportExplainabilitySummary,
  ReportModelAnalysis,
  ReportModelRow,
  ReportPatientInfo,
} from '../types/patientReport'
import {
  calculateReportCompleteness,
  executiveProbabilityPercent,
  getReportStatus,
} from '../lib/reportEngine'

/** A fresh, session-scoped feedback record. No backend persistence. */
export function emptyFeedback(reportId: string, sampleId: string): ClinicalFeedback {
  return {
    reportId,
    sampleId,
    reviewerStatus: 'pending',
    note: '',
    selectedFindings: [],
    createdAt: null,
  }
}

function modelRow(summary: ModelOutputSummary | null): ReportModelRow | null {
  if (!summary) return null
  return {
    modelName: summary.modelName,
    modelType: summary.modelType,
    predictionLabel: summary.predictionLabel,
    probabilityPercent:
      summary.confidencePercent != null && Number.isFinite(summary.confidencePercent)
        ? `${summary.confidencePercent.toFixed(2)}%`
        : '—',
    status: summary.executionStatus,
  }
}

function buildModelAnalysis(comparison: ModelComparisonResult | null): ReportModelAnalysis {
  if (!comparison || (comparison.classical == null && comparison.quantum == null)) {
    return {
      available: false,
      classical: null,
      quantum: null,
      agreement: 'Not available',
      compatibility: 'Not available',
    }
  }
  return {
    available: true,
    classical: modelRow(comparison.classical),
    quantum: modelRow(comparison.quantum),
    agreement: comparison.difference?.summaryText ?? comparison.agreement,
    compatibility: comparison.inputCompatibility?.reason ?? comparison.inputCompatibility?.status ?? '—',
  }
}

function buildExplainabilitySummary(
  explanation: ExplainabilityResult | null,
): ReportExplainabilitySummary {
  if (!explanation || explanation.status === 'not_started' || explanation.status === 'unavailable') {
    return {
      available: false,
      method: null,
      topFeatures: [],
      sensitivityAvailable: false,
      quantumMetadata: null,
    }
  }
  const meta = explanation.computationalMetadata
  const topFeatures = (explanation.featureAttributions ?? [])
    .filter((a) => a.contribution != null)
    .slice(0, 5)
    .map((a) => ({
      featureName: a.featureName,
      contribution: a.contribution,
      direction: a.direction,
    }))
  return {
    available: topFeatures.length > 0,
    method: meta?.explanationMethod ?? null,
    topFeatures,
    sensitivityAvailable:
      (explanation.sensitivityCurve?.length ?? 0) > 0 || (explanation.jacobian?.length ?? 0) > 0,
    quantumMetadata:
      meta?.modelType === 'quantum'
        ? { qubits: meta.qubits, layers: meta.layers, device: meta.device }
        : null,
  }
}

function buildPatientInfo(
  clinical: ClinicalInterpretationResult,
  overrides?: Partial<ReportPatientInfo>,
): ReportPatientInfo {
  return {
    patientId: clinical.sampleId,
    datasetName: clinical.datasetName,
    age: overrides?.age ?? null,
    sex: overrides?.sex ?? null,
    demographics: overrides?.demographics ?? [],
  }
}

/**
 * Assemble the full report from upstream results. `feedback` and `reportId` come
 * from the report provider (session state); nothing is fabricated.
 */
export function assemblePatientReport(args: {
  clinical: ClinicalInterpretationResult
  comparison: ModelComparisonResult | null
  explanation: ExplainabilityResult | null
  feedback: ClinicalFeedback
  reportId: string | null
  patientOverrides?: Partial<ReportPatientInfo>
}): PatientReportData {
  const { clinical, comparison, explanation, feedback, reportId, patientOverrides } = args

  const modelAnalysis = buildModelAnalysis(comparison)
  const explainability = buildExplainabilitySummary(explanation)
  const patientInfo = buildPatientInfo(clinical, patientOverrides)

  const primaryFinding = clinical.keyFindings.find((f) => f.category === 'primary') ?? clinical.keyFindings[0] ?? null

  const executiveSummary = {
    predictionLabel: clinical.predictionLabel,
    modelProbabilityPercent: executiveProbabilityPercent(clinical),
    priority: clinical.priority,
    keyFinding: primaryFinding?.label ?? null,
    interpretationStatus: clinical.status,
  }

  const completeness = calculateReportCompleteness({
    clinical,
    modelAnalysis,
    explainability,
    feedback,
  })

  const status = getReportStatus({ clinical, completeness, feedback })

  return {
    reportId,
    status,
    generatedAt: clinical.generatedAt,
    isDemoFixture: clinical.isDemoFixture,
    patientInfo,
    executiveSummary,
    modelAnalysis,
    explainability,
    clinical,
    feedback,
    completeness,
  }
}

// Re-export for convenience so consumers import formatting from one place.
export { formatProbabilityPercent }
