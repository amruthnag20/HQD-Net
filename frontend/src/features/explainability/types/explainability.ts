/**
 * Phase 5 — Explainability / QuXAI Types.
 * Strict, nullable TypeScript interfaces for all explanation data payloads.
 * Every field except featureName is nullable — the backend may omit it.
 */

export type ExplanationStatus =
  | 'not_started'
  | 'loading'
  | 'available'
  | 'partial'
  | 'unavailable'
  | 'error'

export type ContributionDirection = 'positive' | 'negative' | 'neutral'

export type ExplanationScope = 'local' | 'global'

export type ExplanationModel = 'classical' | 'quantum'

/** Per-feature attribution record. Only featureName is required. */
export type FeatureAttribution = {
  featureName: string
  rank: number | null
  rawValue: number | null
  standardizedValue: number | null
  contribution: number | null        // signed — positive toward selectedClass
  magnitude: number | null           // abs(contribution)
  direction: ContributionDirection | null
  sensitivity: number | null         // dP/dx
  unit: string | null
}

/** A single sensitivity sweep point (feature value → probability). */
export type SensitivityPoint = {
  featureValue: number
  probability: number
}

/** Jacobian row: dP/d(feature_i). */
export type JacobianEntry = {
  featureName: string
  gradient: number | null
}

/** Global feature importance across evaluation cohort. */
export type GlobalFeatureImportance = {
  featureName: string
  meanAbsoluteContribution: number | null
  rank: number | null
}

export type PreprocessingTraceStep = {
  stage: string
  description: string
  applied: boolean
}

export type ExplainabilityComputationalMetadata = {
  model: string
  modelType: ExplanationModel
  executionEnvironment: string
  qubits: number | null
  layers: number | null
  device: string | null
  precision: string | null
  featureCount: number
  featureNames: string[]
  inputDomain: string
  checkpoint: string | null
  explanationMethod: string | null
  executionMs: number | null
}

/** Top-level explanation result. */
export type ExplainabilityResult = {
  status: ExplanationStatus
  scope: ExplanationScope
  model: ExplanationModel
  sampleId: string
  datasetName: string
  targetColumn: string | null
  selectedClass: string | null          // class the contributions are toward
  predictionLabel: string | null
  probabilities: {
    Normal: number
    'High Risk': number
  } | null
  featureAttributions: FeatureAttribution[] | null
  sensitivityCurve: SensitivityPoint[] | null    // null when backend hasn't provided it
  jacobian: JacobianEntry[] | null               // null when unavailable
  globalImportance: GlobalFeatureImportance[] | null
  preprocessingTrace: PreprocessingTraceStep[] | null
  computationalMetadata: ExplainabilityComputationalMetadata | null
  explanationWarnings: string[]
  generatedAt: string | null
  isDemoFixture: boolean
  fixtureName: string | null
  /** Backend-facing: whether a real /api/explainability endpoint was consulted */
  backendExplanationAvailable: boolean
}
