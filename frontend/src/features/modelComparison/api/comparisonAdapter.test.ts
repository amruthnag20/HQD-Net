import { describe, expect, it } from 'vitest'
import {
  buildLiveComparisonResult,
  DETERMINISTIC_FIXTURES,
} from './comparisonAdapter'
import type { ClassicalModelResult } from '@/features/classicalMl/types/classicalMl'
import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import type { NativeQuantumPredictResponse } from '@/features/quantumMl/api/quantumApi'

describe('comparisonAdapter', () => {
  it('handles null models gracefully without crashing', () => {
    const result = buildLiveComparisonResult(null, null, null)
    expect(result.status).toBe('idle')
    expect(result.agreement).toBe('unavailable')
    expect(result.classical).toBeNull()
    expect(result.quantum).toBeNull()
    expect(result.difference).toBeNull()
  })

  it('detects domain incompatibility between demo classical and native quantum', () => {
    const mockClassical: ClassicalModelResult = {
      status: 'trained',
      modelType: 'logistic-regression',
      featureCount: 4,
      featureNames: ['age', 'glucose', 'bmi', 'blood_pressure'],
      targetColumn: 'diagnosis',
      positiveClass: '1',
      negativeClass: '0',
      predictions: [
        { rowIndex: 0, actualClass: '0', predictedClass: '0', predictedProbability: 0.28, correct: true },
      ],
      metrics: {
        accuracy: 0.8,
        precision: 0.8,
        recall: 0.8,
        f1: 0.8,
        rocAuc: 0.9,
        evaluationMethod: 'leave-one-out-cross-validation',
        foldCount: 10,
      },
      modelMetadata: { trainedAt: 'now', iterations: 100, learningRate: 0.1, rowsUsed: 10, rowsExcludedMissingLabel: 0 },
      errorMessage: null,
    }

    const mockQuantum: NativeQuantumPredictResponse = {
      status: 'complete',
      model: {
        name: 'DressedVQC',
        checkpoint: 'quantum_core/vqc_model_weights.pth',
        wires: 10,
        layers: 2,
        feature_map: 'AngleEmbedding(rotation=Y)',
        ansatz: 'StronglyEntanglingLayers',
      },
      input: {
        source: 'clinical_data_synthetic.csv',
        patient_id: 'PAT_1000',
        feature_count: 10,
        feature_names: ['biomarker_04', 'biomarker_01', 'biomarker_00'],
        standardized_vector: [-0.228, -0.055, 0.526],
      },
      prediction: {
        class_index: 0,
        class_label: 'Normal',
        probabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
      },
      quantum_telemetry: {
        device: 'default.qubit',
        wires: 10,
        precision: 'float64',
      },
    }

    const mockProcessed: Partial<ProcessedDataset> = {
      datasetName: 'sampleDataset.ts',
      targetColumn: 'diagnosis',
      processedRows: 10,
      processedFeatureCount: 4,
    }

    const comparison = buildLiveComparisonResult(
      mockClassical,
      mockQuantum,
      mockProcessed as ProcessedDataset,
      0
    )

    expect(comparison.status).toBe('incompatible-domains')
    expect(comparison.agreement).toBe('not-comparable')
    expect(comparison.inputCompatibility.isCompatible).toBe(false)
    expect(comparison.inputCompatibility.status).toBe('incompatible-domains')
    expect(comparison.classical?.predictionLabel).toBe('Normal')
    expect(comparison.quantum?.predictionLabel).toBe('Normal')
    expect(comparison.difference?.summaryText).toContain('cannot be clinically interpreted')
  })

  it('provides deterministic demo fixtures without Math.random', () => {
    const agreeFixture = DETERMINISTIC_FIXTURES.COMPATIBLE_AGREEMENT
    expect(agreeFixture.status).toBe('compatible')
    expect(agreeFixture.agreement).toBe('agree')
    expect(agreeFixture.priority).toBe('low')
    expect(agreeFixture.classical?.probabilities?.Normal).toBe(0.721)
    expect(agreeFixture.quantum?.probabilities?.Normal).toBe(0.7195)

    const disagreeFixture = DETERMINISTIC_FIXTURES.COMPATIBLE_DISAGREEMENT
    expect(disagreeFixture.status).toBe('compatible')
    expect(disagreeFixture.agreement).toBe('disagree')
    expect(disagreeFixture.priority).toBe('review-required')
  })
})
