import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/features/ingestion/lib/csvParser'
import { buildDatasetState } from '@/features/ingestion/lib/datasetAnalysis'
import { SAMPLE_DATASET_CSV, SAMPLE_DATASET_FILENAME } from '@/features/ingestion/data/sampleDataset'
import { buildProcessedDataset } from '@/features/preprocessing/lib/buildProcessedDataset'
import { DEFAULT_PREPROCESSING_CONFIG } from '@/features/preprocessing/types/preprocessing'
import { assessTrainability } from './assessTrainability'
import { trainClassicalModel } from './trainClassicalModel'

/** Exercises the real end-to-end path the app itself takes — the demo CSV
 *  through Phase 1 ingestion, Phase 2 preprocessing, and Phase 3A classical
 *  training — with no synthetic fixtures. The closest proxy available to
 *  actually loading the sample dataset and pressing Train in the browser. */
describe('classical ML on the actual demo dataset', () => {
  function buildProcessed(targetColumn: string | null) {
    const file = new File([SAMPLE_DATASET_CSV], SAMPLE_DATASET_FILENAME, { type: 'text/csv' })
    const parsed = parseCsv(SAMPLE_DATASET_CSV)
    const dataset = buildDatasetState({ file, parsed, targetColumn })
    return buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)
  }

  it('is label-required with no target selected — never fabricates a model', () => {
    const processed = buildProcessed(null)
    expect(assessTrainability(processed).status).toBe('label-required')

    const result = trainClassicalModel(processed)
    expect(result.status).toBe('label-required')
    expect(result.metrics).toBeNull()
    expect(result.predictions).toBeNull()
    // patient_id was correctly excluded during Phase 2 — never a feature.
    expect(result.featureNames).not.toContain('patient_id')
  })

  it('trains and evaluates for real once the legitimate "diagnosis" target is selected', () => {
    const processed = buildProcessed('diagnosis')
    expect(assessTrainability(processed).status).toBe('ready')

    const result = trainClassicalModel(processed)
    expect(result.status).toBe('trained')
    expect(result.modelType).toBe('logistic-regression')
    expect(result.metrics?.evaluationMethod).toBe('leave-one-out-cross-validation')
    expect(result.metrics?.foldCount).toBe(10)
    expect(result.predictions).toHaveLength(10)
    // Every metric is a real, finite number derived from held-out folds.
    expect(Number.isFinite(result.metrics?.accuracy)).toBe(true)
    expect(result.featureNames).not.toContain('patient_id')
    expect(result.featureNames).not.toContain('notes')
  })
})
