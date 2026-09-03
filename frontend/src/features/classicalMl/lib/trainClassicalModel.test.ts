import { describe, expect, it } from 'vitest'
import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import { trainClassicalModel } from './trainClassicalModel'

function baseProcessed(overrides: Partial<ProcessedDataset> = {}): ProcessedDataset {
  return {
    datasetName: 'demo.csv',
    targetColumn: 'diagnosis',
    targetType: 'binary',
    targetClasses: ['no', 'yes'],
    originalFeatureCount: 1,
    processedFeatureCount: 1,
    includedFeatures: ['score'],
    excludedFeatures: [],
    missingValueStrategy: { mode: 'impute', numeric: 'median', categorical: 'most-frequent' },
    encodingStrategy: 'one-hot',
    scalingStrategy: 'standardization',
    featureSelectionStrategy: { varianceThreshold: 0, correlationThreshold: 0.95, droppedByVariance: [], droppedByCorrelation: [] },
    processedRows: 6,
    processedFeatures: 1,
    processedColumnNames: ['score'],
    featureMatrix: [[0], [0.1], [0.2], [5], [5.1], [5.2]],
    targetValues: ['no', 'no', 'no', 'yes', 'yes', 'yes'],
    dimensionFlow: [],
    beforeSummary: { features: 1, numeric: 1, categorical: 0, missingPercent: 0 },
    afterSummary: { features: 1, unresolvedMissing: 0, percentNumeric: 100, scaled: true },
    status: 'model-ready',
    generatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('trainClassicalModel', () => {
  it('trains and evaluates on a trainable dataset', () => {
    const result = trainClassicalModel(baseProcessed())
    expect(result.status).toBe('trained')
    expect(result.modelType).toBe('logistic-regression')
    expect(result.positiveClass).toBe('yes')
    expect(result.negativeClass).toBe('no')
    expect(result.predictions).toHaveLength(6)
    expect(result.metrics).not.toBeNull()
    expect(result.metrics?.accuracy).toBeGreaterThanOrEqual(0.8)
  })

  it('preserves the real feature names from ProcessedDataset', () => {
    const result = trainClassicalModel(baseProcessed())
    expect(result.featureNames).toEqual(['score'])
    expect(result.featureCount).toBe(1)
  })

  it('never fabricates metrics or predictions for a non-trainable dataset', () => {
    const result = trainClassicalModel(baseProcessed({ targetColumn: null, targetType: null, targetClasses: null, targetValues: null }))
    expect(result.status).toBe('label-required')
    expect(result.modelType).toBeNull()
    expect(result.predictions).toBeNull()
    expect(result.metrics).toBeNull()
    expect(result.positiveClass).toBeNull()
    expect(result.negativeClass).toBeNull()
    // Feature visibility still works even without a trainable target.
    expect(result.featureNames).toEqual(['score'])
  })

  it('excludes rows with a missing label from training and reports the count', () => {
    const processed = baseProcessed({
      featureMatrix: [[0], [0.1], [0.2], [5], [5.1], [5.2], [2.5]],
      targetValues: ['no', 'no', 'no', 'yes', 'yes', 'yes', null],
    })
    const result = trainClassicalModel(processed)
    expect(result.status).toBe('trained')
    expect(result.predictions).toHaveLength(6)
    expect(result.modelMetadata?.rowsUsed).toBe(6)
    expect(result.modelMetadata?.rowsExcludedMissingLabel).toBe(1)
  })

  it('marks each prediction correct/incorrect against its real held-out label', () => {
    const result = trainClassicalModel(baseProcessed())
    for (const p of result.predictions ?? []) {
      expect(p.correct).toBe(p.actualClass === p.predictedClass)
    }
  })
})
