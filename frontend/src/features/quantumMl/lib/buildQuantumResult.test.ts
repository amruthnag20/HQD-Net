import { describe, expect, it } from 'vitest'
import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import { assessQuantumIntegration } from './assessQuantumIntegration'
import { buildQuantumResult } from './buildQuantumResult'
import { QUANTUM_CIRCUIT_METADATA, QUANTUM_INPUT_DIMENSION } from './quantumModelFacts'

function baseProcessed(overrides: Partial<ProcessedDataset> = {}): ProcessedDataset {
  return {
    datasetName: 'demo.csv',
    targetColumn: 'diagnosis',
    targetType: 'binary',
    targetClasses: ['0', '1'],
    originalFeatureCount: 4,
    processedFeatureCount: 4,
    includedFeatures: ['age', 'glucose', 'bmi', 'smoker'],
    excludedFeatures: [],
    missingValueStrategy: { mode: 'impute', numeric: 'median', categorical: 'most-frequent' },
    encodingStrategy: 'one-hot',
    scalingStrategy: 'standardization',
    featureSelectionStrategy: { varianceThreshold: 0, correlationThreshold: 0.95, droppedByVariance: [], droppedByCorrelation: [] },
    processedRows: 6,
    processedFeatures: 4,
    processedColumnNames: ['age', 'glucose', 'bmi', 'smoker__yes'],
    featureMatrix: [[0, 0, 0, 0], [1, 1, 1, 1]],
    targetValues: ['0', '1'],
    dimensionFlow: [],
    beforeSummary: { features: 4, numeric: 3, categorical: 1, missingPercent: 0 },
    afterSummary: { features: 4, unresolvedMissing: 0, percentNumeric: 100, scaled: true },
    status: 'model-ready',
    generatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('assessQuantumIntegration', () => {
  it('is integration-pending for a normal model-ready dataset', () => {
    expect(assessQuantumIntegration(baseProcessed()).status).toBe('integration-pending')
  })

  it('is input-incompatible when there are zero model-ready features', () => {
    expect(assessQuantumIntegration(baseProcessed({ processedFeatureCount: 0 })).status).toBe('input-incompatible')
  })

  it('is integration-pending whether or not a target was selected — inference needs no label', () => {
    const withoutTarget = baseProcessed({ targetColumn: null, targetType: null, targetClasses: null, targetValues: null })
    expect(assessQuantumIntegration(withoutTarget).status).toBe('integration-pending')
  })
})

describe('buildQuantumResult', () => {
  it('preserves the real feature names and count from ProcessedDataset — never re-derived', () => {
    const processed = baseProcessed()
    const result = buildQuantumResult(processed)
    expect(result.featureNames).toEqual(processed.processedColumnNames)
    expect(result.featureCount).toBe(processed.processedFeatureCount)
  })

  it('never fabricates a quantum input vector, prediction, probabilities, or metrics', () => {
    const result = buildQuantumResult(baseProcessed())
    expect(result.quantumInputVector).toBeNull()
    expect(result.prediction).toBeNull()
    expect(result.probabilities).toBeNull()
    expect(result.metrics).toBeNull()
  })

  it('reports the real quantum input dimension (10) regardless of the model-ready feature count', () => {
    const result = buildQuantumResult(baseProcessed({ processedFeatureCount: 36, processedColumnNames: new Array(36).fill('x') }))
    expect(result.quantumInputDimension).toBe(QUANTUM_INPUT_DIMENSION)
    expect(result.quantumInputDimension).toBe(10)
  })

  it('exposes real, audited circuit metadata rather than leaving it null', () => {
    const result = buildQuantumResult(baseProcessed())
    expect(result.quantumMetadata).toEqual(QUANTUM_CIRCUIT_METADATA)
    expect(result.quantumMetadata?.qubits).toBe(10)
    expect(result.quantumMetadata?.layers).toBe(2)
  })

  it('surfaces the real integration gaps found during the audit', () => {
    const result = buildQuantumResult(baseProcessed())
    expect(result.modelMetadata?.integrationGaps.length).toBeGreaterThan(0)
  })

  it('never reaches ready/executing/complete — nothing here can actually run the model', () => {
    const statuses = [
      buildQuantumResult(baseProcessed()).status,
      buildQuantumResult(baseProcessed({ processedFeatureCount: 0 })).status,
      buildQuantumResult(baseProcessed({ targetColumn: null, targetType: null, targetClasses: null, targetValues: null })).status,
    ]
    for (const status of statuses) {
      expect(['ready', 'executing', 'complete']).not.toContain(status)
    }
  })

  it('carries the target column through unchanged, without requiring one', () => {
    expect(buildQuantumResult(baseProcessed()).targetColumn).toBe('diagnosis')
    expect(buildQuantumResult(baseProcessed({ targetColumn: null, targetType: null, targetClasses: null, targetValues: null })).targetColumn).toBeNull()
  })
})
