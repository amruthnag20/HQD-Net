import { describe, expect, it } from 'vitest'
import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import { assessTrainability } from './assessTrainability'

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
    featureMatrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 1, 0, 1], [1, 0, 1, 0], [0, 0, 1, 1], [1, 1, 0, 0]],
    targetValues: ['0', '1', '0', '1', '0', '1'],
    dimensionFlow: [],
    beforeSummary: { features: 4, numeric: 3, categorical: 1, missingPercent: 0 },
    afterSummary: { features: 4, unresolvedMissing: 0, percentNumeric: 100, scaled: true },
    status: 'model-ready',
    generatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('assessTrainability', () => {
  it('is ready with a binary target and enough labeled rows per class', () => {
    expect(assessTrainability(baseProcessed()).status).toBe('ready')
  })

  it('reports label-required when no target column was selected', () => {
    const result = assessTrainability(baseProcessed({ targetColumn: null, targetType: null, targetClasses: null, targetValues: null }))
    expect(result.status).toBe('label-required')
    expect(result.message).not.toBeNull()
  })

  it('reports unsupported-target for a continuous target', () => {
    const result = assessTrainability(baseProcessed({ targetType: 'continuous' }))
    expect(result.status).toBe('unsupported-target')
  })

  it('reports unsupported-target for a multiclass target', () => {
    const result = assessTrainability(baseProcessed({ targetType: 'multiclass', targetClasses: ['0', '1', '2'] }))
    expect(result.status).toBe('unsupported-target')
  })

  it('reports unsupported-target when a class has fewer than the minimum labeled rows', () => {
    const result = assessTrainability(baseProcessed({ targetValues: ['0', '1', '0', '0', '0', '0'] }))
    expect(result.status).toBe('unsupported-target')
  })

  it('reports unsupported-target when there are no model-ready features', () => {
    const result = assessTrainability(baseProcessed({ processedFeatureCount: 0 }))
    expect(result.status).toBe('unsupported-target')
  })
})
