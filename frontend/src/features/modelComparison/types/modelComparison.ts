/**
 * Phase 4 — Model Comparison Types.
 * Strictly typed interfaces for comparing Classical ML vs Quantum ML model outputs,
 * evaluation metrics, computational profiles, and domain compatibility.
 */

export type ComparisonStatus =
  | 'idle'
  | 'loading'
  | 'incompatible-domains'
  | 'compatible'
  | 'classical-only'
  | 'quantum-only'
  | 'unavailable'
  | 'error'

export type AgreementStatus =
  | 'agree'
  | 'disagree'
  | 'not-comparable'
  | 'pending'
  | 'unavailable'

export type ReviewPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'review-required'
  | 'undetermined'

export type ModelMetricsSummary = {
  accuracy: number | null
  precision: number | null
  recall: number | null
  f1: number | null
  rocAuc: number | null
  evaluationMethod?: string
  foldCount?: number
}

export type ComputationalMetadata = {
  architecture: string
  framework: string
  executionEnvironment: string
  numericPrecision: string
  qubits?: number
  layers?: number
  ansatz?: string
  device?: string
  iterations?: number
  learningRate?: number
}

export type ModelOutputSummary = {
  modelName: string
  modelType: string
  executionStatus: string
  predictionLabel: string | null // e.g. "Normal" | "High Risk"
  confidencePercent: number | null // 0..100
  probabilities: {
    Normal: number // 0..1
    'High Risk': number // 0..1
  } | null
  featureCount: number
  featureNames: string[]
  inputDomain: string
  metrics: ModelMetricsSummary | null
  computationalMetadata: ComputationalMetadata
}

export type InputCompatibilityInfo = {
  isCompatible: boolean
  status: 'compatible' | 'incompatible-domains' | 'unverified'
  reason: string
  classicalDomain: string
  quantumDomain: string
  featureOverlapCount: number
}

export type DifferenceSummary = {
  predictedClassMatches: boolean | null
  normalProbabilityDelta: number | null // signed difference (classical - quantum)
  probabilityGapPercentagePoints: number | null // absolute gap in percentage points
  confidenceDelta: number | null
  summaryText: string
}

export type ModelComparisonResult = {
  status: ComparisonStatus
  agreement: AgreementStatus
  priority: ReviewPriority
  patientId: string
  targetColumn: string | null
  datasetSource: string
  inputCompatibility: InputCompatibilityInfo
  classical: ModelOutputSummary | null
  quantum: ModelOutputSummary | null
  difference: DifferenceSummary | null
  generatedAt: string
  isDemoFixture?: boolean
  fixtureName?: string
}
