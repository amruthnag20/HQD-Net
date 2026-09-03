import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/features/ingestion/lib/csvParser'
import { buildDatasetState } from '@/features/ingestion/lib/datasetAnalysis'
import { buildProcessedDataset, estimateEncodedColumnCount } from './buildProcessedDataset'
import { DEFAULT_PREPROCESSING_CONFIG } from '../types/preprocessing'

function makeFile(csv: string, name = 'dataset.csv'): File {
  return new File([csv], name, { type: 'text/csv' })
}

const CLINICAL_CSV = [
  'patient_id,age,bmi,glucose,smoking_status,lab_site,notes,diagnosis',
  'PAT-1,52,27.4,118,smoker,LAB_A,,1',
  'PAT-2,47,,142,non-smoker,LAB_A,,1',
  'PAT-3,61,24.8,88,smoker,LAB_A,,0',
  'PAT-4,39,22.1,95,former,LAB_A,,0',
  'PAT-5,58,29.6,151,non-smoker,LAB_A,,1',
  'PAT-6,33,21.0,79,smoker,LAB_A,,0',
].join('\n')

function buildClinicalDataset() {
  const file = makeFile(CLINICAL_CSV)
  const parsed = parseCsv(CLINICAL_CSV)
  return buildDatasetState({ file, parsed, targetColumn: 'diagnosis' })
}

describe('buildProcessedDataset', () => {
  it('excludes the identifier and the constant column by default', () => {
    const dataset = buildClinicalDataset()
    const processed = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)

    expect(processed.includedFeatures).not.toContain('patient_id')
    expect(processed.includedFeatures).not.toContain('lab_site')
    expect(processed.excludedFeatures.map((f) => f.name)).toEqual(
      expect.arrayContaining(['patient_id', 'lab_site']),
    )
  })

  it('leaves no unresolved missing values after imputation', () => {
    const dataset = buildClinicalDataset()
    const processed = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)
    expect(processed.afterSummary.unresolvedMissing).toBe(0)
    expect(processed.processedRows).toBe(dataset.rowCount)
  })

  it('expands categorical columns via one-hot encoding', () => {
    const dataset = buildClinicalDataset()
    const processed = buildProcessedDataset(dataset, { ...DEFAULT_PREPROCESSING_CONFIG, encodingStrategy: 'one-hot' })
    // smoking_status has 3 categories (smoker/non-smoker/former)
    const smokingColumns = processed.processedColumnNames.filter((n) => n.startsWith('smoking_status__'))
    expect(smokingColumns).toHaveLength(3)
  })

  it('produces a single column per categorical feature under ordinal encoding', () => {
    const dataset = buildClinicalDataset()
    const processed = buildProcessedDataset(dataset, { ...DEFAULT_PREPROCESSING_CONFIG, encodingStrategy: 'ordinal' })
    const smokingColumns = processed.processedColumnNames.filter((n) => n.startsWith('smoking_status__'))
    expect(smokingColumns).toEqual(['smoking_status__ordinal'])
  })

  it('drops rows with missing included values under drop-rows mode', () => {
    const dataset = buildClinicalDataset()
    const processed = buildProcessedDataset(dataset, { ...DEFAULT_PREPROCESSING_CONFIG, missingValueMode: 'drop-rows' })
    // bmi is missing on PAT-2
    expect(processed.processedRows).toBe(dataset.rowCount - 1)
  })

  it('respects a manual feature exclusion override', () => {
    const dataset = buildClinicalDataset()
    const processed = buildProcessedDataset(dataset, {
      ...DEFAULT_PREPROCESSING_CONFIG,
      featureOverrides: { age: false },
    })
    expect(processed.includedFeatures).not.toContain('age')
    expect(processed.excludedFeatures.find((f) => f.name === 'age')?.reason).toBe('manual')
  })

  it('tracks a monotonic-shaped dimension flow with the final stage matching the output count', () => {
    const dataset = buildClinicalDataset()
    const processed = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)
    const scaledStep = processed.dimensionFlow.find((s) => s.id === 'scaled')
    expect(scaledStep?.count).toBe(processed.processedFeatureCount)
    expect(processed.dimensionFlow).toHaveLength(5)
  })

  it('reports 100% numeric output and marks the dataset model-ready', () => {
    const dataset = buildClinicalDataset()
    const processed = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)
    expect(processed.afterSummary.percentNumeric).toBe(100)
    expect(processed.status).toBe('model-ready')
  })

  it('excludes the identifier column whether or not a target is selected', () => {
    const dataset = buildClinicalDataset()
    const withoutTarget = buildProcessedDataset(
      { ...dataset, targetColumn: null, targetType: null, targetClasses: null },
      DEFAULT_PREPROCESSING_CONFIG,
    )
    expect(withoutTarget.includedFeatures).not.toContain('patient_id')

    const withTarget = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)
    expect(withTarget.includedFeatures).not.toContain('patient_id')
  })

  it('carves the selected target out of the candidate feature count, unlike the no-target case', () => {
    const dataset = buildClinicalDataset()
    const withTarget = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)
    const withoutTarget = buildProcessedDataset(
      { ...dataset, targetColumn: null, targetType: null, targetClasses: null },
      DEFAULT_PREPROCESSING_CONFIG,
    )
    expect(withoutTarget.originalFeatureCount).toBe(withTarget.originalFeatureCount + 1)
  })

  it('runs the full pipeline with no target selected — optional at this milestone', () => {
    const file = makeFile(CLINICAL_CSV)
    const parsed = parseCsv(CLINICAL_CSV)
    const dataset = buildDatasetState({ file, parsed, targetColumn: null })
    const processed = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)

    expect(processed.targetColumn).toBeNull()
    expect(processed.status).toBe('model-ready')
    // Every column except the excluded identifier/constant is a feature
    // candidate — none is carved out as a target.
    expect(processed.originalFeatureCount).toBe(dataset.columnCount)
  })

  it('produces a feature matrix shaped rows × processedColumnNames.length', () => {
    const dataset = buildClinicalDataset()
    const processed = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)
    expect(processed.featureMatrix).toHaveLength(processed.processedRows)
    for (const row of processed.featureMatrix) {
      expect(row).toHaveLength(processed.processedColumnNames.length)
      expect(row.every((v) => typeof v === 'number' && Number.isFinite(v))).toBe(true)
    }
  })

  it('aligns targetValues 1:1 with featureMatrix rows when a target is selected', () => {
    const dataset = buildClinicalDataset()
    const processed = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)
    expect(processed.targetValues).toHaveLength(processed.featureMatrix.length)
    expect(processed.targetValues).toEqual(['1', '1', '0', '0', '1', '0'])
  })

  it('leaves targetValues null when no target is selected', () => {
    const file = makeFile(CLINICAL_CSV)
    const parsed = parseCsv(CLINICAL_CSV)
    const dataset = buildDatasetState({ file, parsed, targetColumn: null })
    const processed = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)
    expect(processed.targetValues).toBeNull()
  })

  it('marks a row null in targetValues when its label cell is missing, without dropping the row', () => {
    const csvWithMissingLabel = [
      'age,glucose,diagnosis',
      '52,118,1',
      '47,142,',
      '61,88,0',
      '39,95,0',
    ].join('\n')
    const file = makeFile(csvWithMissingLabel)
    const parsed = parseCsv(csvWithMissingLabel)
    const dataset = buildDatasetState({ file, parsed, targetColumn: 'diagnosis' })
    const processed = buildProcessedDataset(dataset, DEFAULT_PREPROCESSING_CONFIG)

    expect(processed.featureMatrix).toHaveLength(4)
    expect(processed.targetValues).toEqual(['1', null, '0', '0'])
  })
})

describe('estimateEncodedColumnCount', () => {
  it('matches the actual one-hot expansion for a live preview', () => {
    const dataset = buildClinicalDataset()
    expect(estimateEncodedColumnCount(dataset, ['smoking_status'], 'one-hot')).toBe(3)
    expect(estimateEncodedColumnCount(dataset, ['smoking_status'], 'ordinal')).toBe(1)
  })
})
