/**
 * Phase 5 — Explainability Adapter.
 * Bridges existing Phase 3B.3 quantum result, Classical ML result,
 * and future /api/explainability backend response into a unified ExplainabilityResult.
 * All deterministic demo fixtures live here — never in components.
 */

import type { ClassicalModelResult } from '@/features/classicalMl/types/classicalMl'
import type { NativeQuantumPredictResponse } from '@/features/quantumMl/api/quantumApi'
import {
  rankFeatureContributions,
  validateExplanationPayload,
} from '../lib/explanationEngine'
import type {
  ExplainabilityResult,
  FeatureAttribution,
  PreprocessingTraceStep,
} from '../types/explainability'

/** Expected future contract (backend has not yet implemented this endpoint). */
export type BackendExplainabilityResponse = {
  status: string
  sample_id: string
  model: string
  feature_attributions: Array<{
    feature_name: string
    raw_value: number | null
    standardized_value: number | null
    contribution: number | null
    sensitivity: number | null
    unit: string | null
  }>
  selected_class: string
  jacobian: Array<{ feature_name: string; gradient: number }> | null
  global_importance: Array<{ feature_name: string; mean_absolute_contribution: number }> | null
  explanation_method: string
  execution_ms: number | null
}

/**
 * Tries to call a future /api/explainability endpoint.
 * Returns null gracefully when the endpoint does not exist yet.
 * DO NOT implement backend logic here.
 */
export async function fetchBackendExplainability(
  rowIndex: number,
  model: 'quantum' | 'classical',
  baseUrl = 'http://localhost:8000'
): Promise<BackendExplainabilityResponse | null> {
  try {
    const res = await fetch(`${baseUrl}/api/explainability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ row_index: rowIndex, model }),
    })
    if (!res.ok) return null
    return (await res.json()) as BackendExplainabilityResponse
  } catch {
    return null
  }
}

/** STANDARD PREPROCESSING TRACE for classical demo data */
const CLASSICAL_PREPROCESSING_TRACE: PreprocessingTraceStep[] = [
  { stage: 'Raw Input', description: 'Clinical demo features: age, bmi, glucose, blood_pressure, smoker', applied: true },
  { stage: 'Missing Value Handling', description: 'Column-median imputation', applied: true },
  { stage: 'Feature Selection', description: 'All 5 features retained (small dataset)', applied: true },
  { stage: 'Standard Scaling', description: 'z-score normalization (μ=0, σ=1)', applied: true },
  { stage: 'Model Input', description: '5-dimensional standardized feature vector', applied: true },
]

/** STANDARD PREPROCESSING TRACE for native VQC data */
const QUANTUM_PREPROCESSING_TRACE: PreprocessingTraceStep[] = [
  { stage: 'Raw Input', description: 'clinical_data_synthetic.csv — 500 rows × 24 biomarkers', applied: true },
  { stage: 'Missing Value Handling', description: 'Median imputation across 500-row training set', applied: true },
  { stage: 'Random Forest Feature Selection', description: 'Top 10 features selected by Gini importance', applied: true },
  { stage: 'StandardScaler', description: 'Fitted on full 500-row training set; applied per row', applied: true },
  { stage: 'AngleEmbedding', description: 'θᵢ = π · tanh(zᵢ) → embedded to 10-qubit rotation angles', applied: true },
  { stage: 'Quantum Circuit', description: '2 × StronglyEntanglingLayers + Pauli-Z measurement', applied: true },
  { stage: 'Classical Head', description: '10 → 16 → 2 Dense + Softmax', applied: true },
]

/**
 * Builds a live ExplainabilityResult from existing Phase 3B.3 quantum result.
 * Prediction is real. Attributions are UNAVAILABLE until backend QuXAI endpoint ships.
 */
export function buildQuantumExplanationFromVqcResult(
  vqcResult: NativeQuantumPredictResponse,
  backendAttributions: BackendExplainabilityResponse | null = null
): ExplainabilityResult {
  const { prediction, input, model, quantum_telemetry } = vqcResult

  const featureAttributions: FeatureAttribution[] | null = backendAttributions
    ? rankFeatureContributions(
        backendAttributions.feature_attributions.map((f, i) => ({
          featureName: f.feature_name,
          rank: i + 1,
          rawValue: null,
          standardizedValue: f.standardized_value,
          contribution: f.contribution,
          magnitude: f.contribution !== null ? Math.abs(f.contribution) : null,
          direction: null,
          sensitivity: f.sensitivity,
          unit: f.unit,
        }))
      )
    : null

  const result: ExplainabilityResult = {
    status: backendAttributions ? 'available' : 'unavailable',
    scope: 'local',
    model: 'quantum',
    sampleId: input.patient_id,
    datasetName: input.source,
    targetColumn: 'diagnosis',
    selectedClass: prediction.class_label,
    predictionLabel: prediction.class_label,
    probabilities: prediction.probabilities,
    featureAttributions,
    sensitivityCurve: null,
    jacobian: backendAttributions?.jacobian
      ? backendAttributions.jacobian.map((j) => ({ featureName: j.feature_name, gradient: j.gradient }))
      : null,
    globalImportance: null,
    preprocessingTrace: QUANTUM_PREPROCESSING_TRACE,
    computationalMetadata: {
      model: model.name,
      modelType: 'quantum',
      executionEnvironment: 'Python FastAPI (:8000)',
      qubits: model.wires,
      layers: model.layers,
      device: quantum_telemetry.device,
      precision: quantum_telemetry.precision,
      featureCount: input.feature_count,
      featureNames: input.feature_names,
      inputDomain: input.source,
      checkpoint: model.checkpoint,
      explanationMethod: backendAttributions?.explanation_method ?? null,
      executionMs: backendAttributions?.execution_ms ?? null,
    },
    explanationWarnings: [],
    generatedAt: new Date().toISOString(),
    isDemoFixture: false,
    fixtureName: null,
    backendExplanationAvailable: Boolean(backendAttributions),
  }

  result.explanationWarnings = validateExplanationPayload(result)
  return result
}

/**
 * Builds a live ExplainabilityResult from Phase 3A classical ML result.
 */
export function buildClassicalExplanationFromResult(
  classicalResult: ClassicalModelResult,
  rowIndex = 0
): ExplainabilityResult | null {
  if (classicalResult.status !== 'trained' || !classicalResult.predictions) return null

  const rowPred = classicalResult.predictions[rowIndex] ?? classicalResult.predictions[0]
  if (!rowPred) return null

  const predProb = rowPred.predictedProbability
  const normalProb = 1 - predProb
  const highRiskProb = predProb
  const predLabel = normalProb >= highRiskProb ? 'Normal' : 'High Risk'

  const result: ExplainabilityResult = {
    status: 'unavailable',
    scope: 'local',
    model: 'classical',
    sampleId: `PAT_${1000 + rowIndex}`,
    datasetName: 'clinical_demo',
    targetColumn: classicalResult.targetColumn,
    selectedClass: predLabel,
    predictionLabel: predLabel,
    probabilities: { Normal: normalProb, 'High Risk': highRiskProb },
    featureAttributions: null,
    sensitivityCurve: null,
    jacobian: null,
    globalImportance: null,
    preprocessingTrace: CLASSICAL_PREPROCESSING_TRACE,
    computationalMetadata: {
      model: 'Logistic Regression',
      modelType: 'classical',
      executionEnvironment: 'Client Browser (Vite)',
      qubits: null,
      layers: null,
      device: null,
      precision: 'float64',
      featureCount: classicalResult.featureCount,
      featureNames: classicalResult.featureNames,
      inputDomain: 'clinical_demo.csv',
      checkpoint: null,
      explanationMethod: null,
      executionMs: null,
    },
    explanationWarnings: ['Feature-level attributions unavailable. No frontend explainability endpoint exists for Classical ML yet.'],
    generatedAt: new Date().toISOString(),
    isDemoFixture: false,
    fixtureName: null,
    backendExplanationAvailable: false,
  }

  return result
}

/** ──────────────────────────────────────────────────────────
 *  DETERMINISTIC DEVELOPMENT FIXTURES
 *  Clearly labelled, no Math.random(), frozen values
 * ────────────────────────────────────────────────────────── */

export const EXPLAINABILITY_FIXTURES: Record<string, ExplainabilityResult> = {
  QUANTUM_LOCAL_EXPLANATION: {
    status: 'available',
    scope: 'local',
    model: 'quantum',
    sampleId: 'PAT_1000',
    datasetName: 'clinical_data_synthetic.csv',
    targetColumn: 'diagnosis',
    selectedClass: 'Normal',
    predictionLabel: 'Normal',
    probabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
    isDemoFixture: true,
    fixtureName: 'Quantum Local — Normal (Complete Attribution)',
    backendExplanationAvailable: true,
    featureAttributions: [
      { featureName: 'biomarker_04', rank: 1, rawValue: null, standardizedValue: -0.229, contribution: 0.182, magnitude: 0.182, direction: 'positive', sensitivity: 0.31, unit: null },
      { featureName: 'biomarker_01', rank: 2, rawValue: null, standardizedValue: -0.055, contribution: 0.127, magnitude: 0.127, direction: 'positive', sensitivity: 0.21, unit: null },
      { featureName: 'biomarker_15', rank: 3, rawValue: null, standardizedValue: -0.573, contribution: 0.094, magnitude: 0.094, direction: 'positive', sensitivity: 0.16, unit: null },
      { featureName: 'biomarker_18', rank: 4, rawValue: null, standardizedValue: -0.956, contribution: -0.071, magnitude: 0.071, direction: 'negative', sensitivity: -0.11, unit: null },
      { featureName: 'biomarker_22', rank: 5, rawValue: null, standardizedValue: 0.100, contribution: 0.059, magnitude: 0.059, direction: 'positive', sensitivity: 0.09, unit: null },
      { featureName: 'biomarker_00', rank: 6, rawValue: null, standardizedValue: 0.527, contribution: 0.048, magnitude: 0.048, direction: 'positive', sensitivity: 0.08, unit: null },
      { featureName: 'biomarker_02', rank: 7, rawValue: null, standardizedValue: 0.677, contribution: -0.039, magnitude: 0.039, direction: 'negative', sensitivity: -0.06, unit: null },
      { featureName: 'biomarker_17', rank: 8, rawValue: null, standardizedValue: 0.301, contribution: 0.031, magnitude: 0.031, direction: 'positive', sensitivity: 0.05, unit: null },
      { featureName: 'biomarker_03', rank: 9, rawValue: null, standardizedValue: 1.450, contribution: -0.022, magnitude: 0.022, direction: 'negative', sensitivity: -0.04, unit: null },
      { featureName: 'biomarker_12', rank: 10, rawValue: null, standardizedValue: 0.136, contribution: 0.016, magnitude: 0.016, direction: 'positive', sensitivity: 0.02, unit: null },
    ],
    jacobian: [
      { featureName: 'biomarker_04', gradient: 0.31 },
      { featureName: 'biomarker_01', gradient: 0.21 },
      { featureName: 'biomarker_15', gradient: 0.16 },
      { featureName: 'biomarker_18', gradient: -0.11 },
      { featureName: 'biomarker_22', gradient: 0.09 },
    ],
    sensitivityCurve: null,
    globalImportance: null,
    preprocessingTrace: QUANTUM_PREPROCESSING_TRACE,
    computationalMetadata: {
      model: 'DressedVQC',
      modelType: 'quantum',
      executionEnvironment: 'Python FastAPI (:8000)',
      qubits: 10,
      layers: 2,
      device: 'default.qubit',
      precision: 'float64',
      featureCount: 10,
      featureNames: ['biomarker_04', 'biomarker_01', 'biomarker_00', 'biomarker_02', 'biomarker_03', 'biomarker_15', 'biomarker_18', 'biomarker_22', 'biomarker_17', 'biomarker_12'],
      inputDomain: 'clinical_data_synthetic.csv',
      checkpoint: 'quantum_core/vqc_model_weights.pth',
      explanationMethod: 'Parameter-Shift Sensitivity (QuXAI)',
      executionMs: 1240,
    },
    explanationWarnings: [],
    generatedAt: '2026-09-03T01:00:00.000Z',
  },

  CLASSICAL_LOCAL_EXPLANATION: {
    status: 'unavailable',
    scope: 'local',
    model: 'classical',
    sampleId: 'PAT_1000',
    datasetName: 'clinical_demo',
    targetColumn: 'diagnosis',
    selectedClass: 'Normal',
    predictionLabel: 'Normal',
    probabilities: { Normal: 0.72, 'High Risk': 0.28 },
    isDemoFixture: true,
    fixtureName: 'Classical Local — Attribution Unavailable',
    backendExplanationAvailable: false,
    featureAttributions: null,
    sensitivityCurve: null,
    jacobian: null,
    globalImportance: null,
    preprocessingTrace: CLASSICAL_PREPROCESSING_TRACE,
    computationalMetadata: {
      model: 'Logistic Regression',
      modelType: 'classical',
      executionEnvironment: 'Client Browser',
      qubits: null, layers: null, device: null, precision: 'float64',
      featureCount: 5,
      featureNames: ['age', 'bmi', 'glucose', 'blood_pressure', 'smoker'],
      inputDomain: 'clinical_demo.csv',
      checkpoint: null,
      explanationMethod: null,
      executionMs: null,
    },
    explanationWarnings: ['Feature-level attributions unavailable. Backend QuXAI endpoint not yet implemented.'],
    generatedAt: '2026-09-03T01:00:00.000Z',
  },

  PARTIAL_EXPLANATION: {
    status: 'partial',
    scope: 'local',
    model: 'quantum',
    sampleId: 'PAT_1001',
    datasetName: 'clinical_data_synthetic.csv',
    targetColumn: 'diagnosis',
    selectedClass: 'High Risk',
    predictionLabel: 'High Risk',
    probabilities: { Normal: 0.422, 'High Risk': 0.578 },
    isDemoFixture: true,
    fixtureName: 'Quantum Local — Partial Attribution (5/10 features)',
    backendExplanationAvailable: true,
    featureAttributions: [
      { featureName: 'biomarker_04', rank: 1, rawValue: null, standardizedValue: 0.88, contribution: -0.21, magnitude: 0.21, direction: 'negative', sensitivity: -0.28, unit: null },
      { featureName: 'biomarker_01', rank: 2, rawValue: null, standardizedValue: 1.15, contribution: -0.14, magnitude: 0.14, direction: 'negative', sensitivity: -0.19, unit: null },
      { featureName: 'biomarker_15', rank: 3, rawValue: null, standardizedValue: 0.44, contribution: -0.09, magnitude: 0.09, direction: 'negative', sensitivity: -0.12, unit: null },
      { featureName: 'biomarker_18', rank: 4, rawValue: null, standardizedValue: 1.22, contribution: -0.07, magnitude: 0.07, direction: 'negative', sensitivity: -0.09, unit: null },
      { featureName: 'biomarker_22', rank: 5, rawValue: null, standardizedValue: 0.67, contribution: -0.04, magnitude: 0.04, direction: 'negative', sensitivity: -0.05, unit: null },
      { featureName: 'biomarker_00', rank: null, rawValue: null, standardizedValue: null, contribution: null, magnitude: null, direction: null, sensitivity: null, unit: null },
      { featureName: 'biomarker_02', rank: null, rawValue: null, standardizedValue: null, contribution: null, magnitude: null, direction: null, sensitivity: null, unit: null },
      { featureName: 'biomarker_17', rank: null, rawValue: null, standardizedValue: null, contribution: null, magnitude: null, direction: null, sensitivity: null, unit: null },
      { featureName: 'biomarker_03', rank: null, rawValue: null, standardizedValue: null, contribution: null, magnitude: null, direction: null, sensitivity: null, unit: null },
      { featureName: 'biomarker_12', rank: null, rawValue: null, standardizedValue: null, contribution: null, magnitude: null, direction: null, sensitivity: null, unit: null },
    ],
    sensitivityCurve: null,
    jacobian: null,
    globalImportance: null,
    preprocessingTrace: QUANTUM_PREPROCESSING_TRACE,
    computationalMetadata: {
      model: 'DressedVQC', modelType: 'quantum', executionEnvironment: 'Python FastAPI (:8000)',
      qubits: 10, layers: 2, device: 'default.qubit', precision: 'float64',
      featureCount: 10,
      featureNames: ['biomarker_04', 'biomarker_01', 'biomarker_00', 'biomarker_02', 'biomarker_03', 'biomarker_15', 'biomarker_18', 'biomarker_22', 'biomarker_17', 'biomarker_12'],
      inputDomain: 'clinical_data_synthetic.csv',
      checkpoint: 'quantum_core/vqc_model_weights.pth',
      explanationMethod: 'Partial Parameter-Shift (5 of 10 completed)',
      executionMs: 820,
    },
    explanationWarnings: ['Attribution computation incomplete. 5 of 10 features returned explanation signals.'],
    generatedAt: '2026-09-03T01:00:00.000Z',
  },

  GLOBAL_EXPLANATION: {
    status: 'available',
    scope: 'global',
    model: 'quantum',
    sampleId: 'COHORT-500',
    datasetName: 'clinical_data_synthetic.csv',
    targetColumn: 'diagnosis',
    selectedClass: 'High Risk',
    predictionLabel: null,
    probabilities: null,
    isDemoFixture: true,
    fixtureName: 'Quantum Global — Feature Importance (500-row cohort)',
    backendExplanationAvailable: true,
    featureAttributions: null,
    sensitivityCurve: null,
    jacobian: null,
    globalImportance: [
      { featureName: 'biomarker_04', meanAbsoluteContribution: 0.178, rank: 1 },
      { featureName: 'biomarker_01', meanAbsoluteContribution: 0.142, rank: 2 },
      { featureName: 'biomarker_15', meanAbsoluteContribution: 0.109, rank: 3 },
      { featureName: 'biomarker_18', meanAbsoluteContribution: 0.088, rank: 4 },
      { featureName: 'biomarker_22', meanAbsoluteContribution: 0.074, rank: 5 },
      { featureName: 'biomarker_00', meanAbsoluteContribution: 0.063, rank: 6 },
      { featureName: 'biomarker_02', meanAbsoluteContribution: 0.051, rank: 7 },
      { featureName: 'biomarker_17', meanAbsoluteContribution: 0.042, rank: 8 },
      { featureName: 'biomarker_03', meanAbsoluteContribution: 0.031, rank: 9 },
      { featureName: 'biomarker_12', meanAbsoluteContribution: 0.022, rank: 10 },
    ],
    preprocessingTrace: QUANTUM_PREPROCESSING_TRACE,
    computationalMetadata: {
      model: 'DressedVQC', modelType: 'quantum', executionEnvironment: 'Python FastAPI (:8000)',
      qubits: 10, layers: 2, device: 'default.qubit', precision: 'float64',
      featureCount: 10,
      featureNames: ['biomarker_04', 'biomarker_01', 'biomarker_00', 'biomarker_02', 'biomarker_03', 'biomarker_15', 'biomarker_18', 'biomarker_22', 'biomarker_17', 'biomarker_12'],
      inputDomain: 'clinical_data_synthetic.csv',
      checkpoint: 'quantum_core/vqc_model_weights.pth',
      explanationMethod: 'Mean Absolute Sensitivity (500-row cohort)',
      executionMs: 14200,
    },
    explanationWarnings: [],
    generatedAt: '2026-09-03T01:00:00.000Z',
  },

  UNAVAILABLE: {
    status: 'unavailable',
    scope: 'local',
    model: 'quantum',
    sampleId: 'PAT_1000',
    datasetName: 'clinical_data_synthetic.csv',
    targetColumn: 'diagnosis',
    selectedClass: 'Normal',
    predictionLabel: 'Normal',
    probabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
    isDemoFixture: true,
    fixtureName: 'Quantum — Prediction Available, Explanation Unavailable',
    backendExplanationAvailable: false,
    featureAttributions: null,
    sensitivityCurve: null,
    jacobian: null,
    globalImportance: null,
    preprocessingTrace: QUANTUM_PREPROCESSING_TRACE,
    computationalMetadata: null,
    explanationWarnings: ['No explainability endpoint is available at this time. Prediction data is real; attribution data requires backend QuXAI implementation.'],
    generatedAt: '2026-09-03T01:00:00.000Z',
  },
}
