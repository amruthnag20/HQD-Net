/**
 * Comparison Adapter (Phase 4).
 * Bridges real Classical ML state, real Quantum VQC execution state,
 * and deterministic development fixtures into a unified ModelComparisonResult.
 */

import type { ClassicalModelResult } from '@/features/classicalMl/types/classicalMl'
import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import type { NativeQuantumPredictResponse } from '@/features/quantumMl/api/quantumApi'
import {
  calculateDifference,
  checkDomainCompatibility,
  determineAgreement,
  determineComparisonStatus,
  determineReviewPriority,
} from '../lib/comparisonEngine'
import type {
  ModelComparisonResult,
  ModelOutputSummary,
} from '../types/modelComparison'

/**
 * Fetches a backend-generated Classical vs Quantum model comparison by calling
 * POST /api/clinical-analysis and extracting the `model_comparison` block.
 *
 * The backend computes:
 *  - Classical: Random Forest CVD (models/classical/random_forest/random_forest_cvd.pkl)
 *               trained on 12-D raw clinical features. Patient probability is RUNTIME.
 *  - Quantum:   10-Qubit Dressed VQC (quantum_core/vqc_model_weights.pth)
 *               trained on 10-D PCA-projected latent vector. Patient probability is RUNTIME.
 *
 * Benchmark metrics (RF accuracy=73.24%, ROC-AUC=0.8010) are held-out performance stats
 * reported inside `classical.metrics`, NOT this patient's risk score.
 *
 * Returns null if the backend is unavailable or the response is malformed.
 */
export async function fetchBackendModelComparison(
  tabularFilePath: string = 'clinical_data_synthetic.csv',
  baseUrl = 'http://localhost:8000'
): Promise<ModelComparisonResult | null> {
  try {
    const res = await fetch(`${baseUrl}/api/clinical-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ tabular_file_path: tabularFilePath, backend_choice: 'VQC' }),
    })
    if (!res.ok) return null
    const payload = await res.json()
    if (payload.status !== 'success') return null

    // The backend returns `model_comparison` shaped as ModelComparisonResult.
    const mc = payload.model_comparison
    if (!mc || !mc.classical || !mc.quantum) return null

    // Ensure required fields that the backend may omit
    if (!mc.generatedAt) {
      mc.generatedAt = new Date().toISOString()
    }
    // Normalize foldCount: backend sends null, TS type expects number|undefined
    if (mc.classical?.metrics && mc.classical.metrics.foldCount === null) {
      mc.classical.metrics.foldCount = undefined
    }
    if (mc.quantum?.metrics && mc.quantum.metrics.foldCount === null) {
      mc.quantum.metrics.foldCount = undefined
    }

    return mc as ModelComparisonResult
  } catch {
    return null
  }
}


/**
 * Builds live comparison result from real runtime context.
 */
export function buildLiveComparisonResult(
  classicalResult: ClassicalModelResult | null,
  quantumNativeResult: NativeQuantumPredictResponse | null,
  processedDataset: ProcessedDataset | null,
  selectedRowIndex: number = 0
): ModelComparisonResult {
  const patientId = processedDataset ? `PAT_${1000 + selectedRowIndex}` : 'PAT_1000'
  const targetCol = processedDataset?.targetColumn ?? 'diagnosis'

  // 1. Classical Model Summary from Phase 3A
  let classicalSummary: ModelOutputSummary | null = null
  if (classicalResult && classicalResult.status === 'trained') {
    const rowPred = classicalResult.predictions?.[selectedRowIndex] ?? classicalResult.predictions?.[0]
    const predProb = rowPred?.predictedProbability ?? 0.5
    // Logistic regression prob is P(positiveClass)
    const normalProb = 1 - predProb
    const highRiskProb = predProb
    const isNormal = normalProb >= highRiskProb

    classicalSummary = {
      modelName: 'Logistic Regression',
      modelType: 'logistic-regression',
      executionStatus: 'trained',
      predictionLabel: isNormal ? 'Normal' : 'High Risk',
      confidencePercent: Number((Math.max(normalProb, highRiskProb) * 100).toFixed(1)),
      probabilities: {
        Normal: normalProb,
        'High Risk': highRiskProb,
      },
      featureCount: classicalResult.featureCount,
      featureNames: classicalResult.featureNames,
      inputDomain: processedDataset?.datasetName ?? 'clinical_demo.csv',
      metrics: classicalResult.metrics
        ? {
            accuracy: classicalResult.metrics.accuracy,
            precision: classicalResult.metrics.precision,
            recall: classicalResult.metrics.recall,
            f1: classicalResult.metrics.f1,
            rocAuc: classicalResult.metrics.rocAuc,
            evaluationMethod: classicalResult.metrics.evaluationMethod,
            foldCount: classicalResult.metrics.foldCount,
          }
        : null,
      computationalMetadata: {
        architecture: 'L2-Penalized Logistic Classifier',
        framework: 'TypeScript / In-Browser Math Engine',
        executionEnvironment: 'Client Browser (Vite)',
        numericPrecision: 'float64',
        iterations: classicalResult.modelMetadata?.iterations ?? 100,
        learningRate: classicalResult.modelMetadata?.learningRate ?? 0.1,
      },
    }
  }

  // 2. Quantum Model Summary from Phase 3B.2 / 3B.3
  let quantumSummary: ModelOutputSummary | null = null
  if (quantumNativeResult && quantumNativeResult.status === 'complete') {
    const normalProb = quantumNativeResult.prediction.probabilities.Normal
    const highRiskProb = quantumNativeResult.prediction.probabilities['High Risk']

    quantumSummary = {
      modelName: 'DressedVQC',
      modelType: 'dressed-vqc',
      executionStatus: 'complete',
      predictionLabel: quantumNativeResult.prediction.class_label,
      confidencePercent: Number((Math.max(normalProb, highRiskProb) * 100).toFixed(1)),
      probabilities: {
        Normal: normalProb,
        'High Risk': highRiskProb,
      },
      featureCount: quantumNativeResult.input.feature_count,
      featureNames: quantumNativeResult.input.feature_names,
      inputDomain: quantumNativeResult.input.source,
      metrics: null, // Model-level test metrics not in single-row predict payload
      computationalMetadata: {
        architecture: '10-Qubit Variational Quantum Classifier (2 Strongly Entangling Layers)',
        framework: 'PennyLane 0.45.1 + PyTorch 2.13',
        executionEnvironment: 'Python FastAPI Standalone Service (:8000)',
        numericPrecision: quantumNativeResult.quantum_telemetry.precision,
        qubits: quantumNativeResult.model.wires,
        layers: quantumNativeResult.model.layers,
        ansatz: quantumNativeResult.model.ansatz,
        device: quantumNativeResult.quantum_telemetry.device,
      },
    }
  }

  // 3. Domain Compatibility Check
  const classicalFeats = classicalSummary?.featureNames ?? []
  const quantumFeats = quantumSummary?.featureNames ?? []
  const classicalDomain = classicalSummary?.inputDomain ?? 'None'
  const quantumDomain = quantumSummary?.inputDomain ?? 'None'

  const inputCompatibility = checkDomainCompatibility(
    classicalFeats,
    quantumFeats,
    classicalDomain,
    quantumDomain
  )

  const agreement = determineAgreement(
    classicalSummary?.predictionLabel ?? null,
    quantumSummary?.predictionLabel ?? null,
    inputCompatibility.isCompatible
  )

  const difference = calculateDifference(
    classicalSummary,
    quantumSummary,
    inputCompatibility.isCompatible
  )

  const priority = determineReviewPriority(agreement, classicalSummary, quantumSummary)

  const status = determineComparisonStatus(
    Boolean(classicalSummary),
    Boolean(quantumSummary),
    inputCompatibility.isCompatible,
    false,
    false
  )

  return {
    status,
    agreement,
    priority,
    patientId: quantumNativeResult?.input.patient_id ?? patientId,
    targetColumn: targetCol,
    datasetSource: processedDataset?.datasetName ?? 'biomedical_dataset.csv',
    inputCompatibility,
    classical: classicalSummary,
    quantum: quantumSummary,
    difference,
    generatedAt: new Date().toISOString(),
    isDemoFixture: false,
  }
}

/**
 * Deterministic Demo Fixtures for Development and UI Verification.
 * Used exclusively to test all visual states without generating random numbers.
 */
export const DETERMINISTIC_FIXTURES: Record<string, ModelComparisonResult> = {
  COMPATIBLE_AGREEMENT: {
    status: 'compatible',
    agreement: 'agree',
    priority: 'low',
    patientId: 'PAT_1000',
    targetColumn: 'diagnosis',
    datasetSource: 'standard_biomarker_benchmark.csv',
    isDemoFixture: true,
    fixtureName: 'Synthetic Benchmark: Agreement (Normal)',
    inputCompatibility: {
      isCompatible: true,
      status: 'compatible',
      reason: 'Both models evaluated on aligned 10-dimensional standardized biomarker vectors.',
      classicalDomain: 'standard_biomarker_benchmark.csv',
      quantumDomain: 'standard_biomarker_benchmark.csv',
      featureOverlapCount: 10,
    },
    classical: {
      modelName: 'Logistic Regression',
      modelType: 'logistic-regression',
      executionStatus: 'trained',
      predictionLabel: 'Normal',
      confidencePercent: 72.1,
      probabilities: { Normal: 0.721, 'High Risk': 0.279 },
      featureCount: 10,
      featureNames: ['biomarker_04', 'biomarker_01', 'biomarker_00', 'biomarker_02', 'biomarker_03'],
      inputDomain: 'standard_biomarker_benchmark.csv',
      metrics: { accuracy: 0.85, precision: 0.83, recall: 0.88, f1: 0.85, rocAuc: 0.91, evaluationMethod: 'leave-one-out-cross-validation', foldCount: 50 },
      computationalMetadata: {
        architecture: 'L2-Penalized Logistic Classifier',
        framework: 'TypeScript / Browser Engine',
        executionEnvironment: 'Client Browser',
        numericPrecision: 'float64',
      },
    },
    quantum: {
      modelName: 'DressedVQC',
      modelType: 'dressed-vqc',
      executionStatus: 'complete',
      predictionLabel: 'Normal',
      confidencePercent: 71.95,
      probabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
      featureCount: 10,
      featureNames: ['biomarker_04', 'biomarker_01', 'biomarker_00', 'biomarker_02', 'biomarker_03'],
      inputDomain: 'standard_biomarker_benchmark.csv',
      metrics: { accuracy: 0.86, precision: 0.85, recall: 0.87, f1: 0.86, rocAuc: 0.92, evaluationMethod: '5-fold Cross Validation', foldCount: 5 },
      computationalMetadata: {
        architecture: '10-Qubit Dressed VQC (2 Strongly Entangling Layers)',
        framework: 'PennyLane 0.45.1 + PyTorch 2.13',
        executionEnvironment: 'Python FastAPI Standalone Service (:8000)',
        numericPrecision: 'float64',
        qubits: 10,
        layers: 2,
        device: 'default.qubit',
      },
    },
    difference: {
      predictedClassMatches: true,
      normalProbabilityDelta: 0.0015,
      probabilityGapPercentagePoints: 0.15,
      confidenceDelta: 0.15,
      summaryText: "Models agree on 'Normal' classification with a 0.2 percentage point probability difference.",
    },
    generatedAt: '2026-09-03T01:00:00.000Z',
  },

  COMPATIBLE_DISAGREEMENT: {
    status: 'compatible',
    agreement: 'disagree',
    priority: 'review-required',
    patientId: 'PAT_1042',
    targetColumn: 'diagnosis',
    datasetSource: 'standard_biomarker_benchmark.csv',
    isDemoFixture: true,
    fixtureName: 'Borderline Case: Model Disagreement',
    inputCompatibility: {
      isCompatible: true,
      status: 'compatible',
      reason: 'Both models evaluated on aligned 10-dimensional standardized biomarker vectors.',
      classicalDomain: 'standard_biomarker_benchmark.csv',
      quantumDomain: 'standard_biomarker_benchmark.csv',
      featureOverlapCount: 10,
    },
    classical: {
      modelName: 'Logistic Regression',
      modelType: 'logistic-regression',
      executionStatus: 'trained',
      predictionLabel: 'Normal',
      confidencePercent: 53.4,
      probabilities: { Normal: 0.534, 'High Risk': 0.466 },
      featureCount: 10,
      featureNames: ['biomarker_04', 'biomarker_01', 'biomarker_00'],
      inputDomain: 'standard_biomarker_benchmark.csv',
      metrics: { accuracy: 0.85, precision: 0.83, recall: 0.88, f1: 0.85, rocAuc: 0.91 },
      computationalMetadata: { architecture: 'Linear', framework: 'JS', executionEnvironment: 'Browser', numericPrecision: 'float64' },
    },
    quantum: {
      modelName: 'DressedVQC',
      modelType: 'dressed-vqc',
      executionStatus: 'complete',
      predictionLabel: 'High Risk',
      confidencePercent: 57.8,
      probabilities: { Normal: 0.422, 'High Risk': 0.578 },
      featureCount: 10,
      featureNames: ['biomarker_04', 'biomarker_01', 'biomarker_00'],
      inputDomain: 'standard_biomarker_benchmark.csv',
      metrics: { accuracy: 0.86, precision: 0.85, recall: 0.87, f1: 0.86, rocAuc: 0.92 },
      computationalMetadata: { architecture: 'DressedVQC', framework: 'PennyLane', executionEnvironment: 'Python :8000', numericPrecision: 'float64', qubits: 10, layers: 2, device: 'default.qubit' },
    },
    difference: {
      predictedClassMatches: false,
      normalProbabilityDelta: 0.112,
      probabilityGapPercentagePoints: 11.2,
      confidenceDelta: -4.4,
      summaryText: "Model divergence: Classical predicts 'Normal' (53.4%) while Quantum predicts 'High Risk' (57.8%). Clinical review recommended.",
    },
    generatedAt: '2026-09-03T01:00:00.000Z',
  },

  CLASSICAL_ONLY: {
    status: 'classical-only',
    agreement: 'pending',
    priority: 'undetermined',
    patientId: 'PAT_1000',
    targetColumn: 'diagnosis',
    datasetSource: 'sampleDataset.ts',
    isDemoFixture: true,
    fixtureName: 'Classical Only (Quantum Pending)',
    inputCompatibility: {
      isCompatible: false,
      status: 'unverified',
      reason: 'Quantum model execution has not been initiated.',
      classicalDomain: 'sampleDataset.ts',
      quantumDomain: 'None',
      featureOverlapCount: 0,
    },
    classical: {
      modelName: 'Logistic Regression',
      modelType: 'logistic-regression',
      executionStatus: 'trained',
      predictionLabel: 'Normal',
      confidencePercent: 70.0,
      probabilities: { Normal: 0.7, 'High Risk': 0.3 },
      featureCount: 4,
      featureNames: ['age', 'bmi', 'glucose', 'blood_pressure'],
      inputDomain: 'sampleDataset.ts',
      metrics: { accuracy: 0.8, precision: 0.75, recall: 0.85, f1: 0.8, rocAuc: 0.88 },
      computationalMetadata: { architecture: 'Linear', framework: 'JS', executionEnvironment: 'Browser', numericPrecision: 'float64' },
    },
    quantum: null,
    difference: null,
    generatedAt: '2026-09-03T01:00:00.000Z',
  },
}
