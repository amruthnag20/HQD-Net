import { describe, expect, it } from 'vitest'
import { parseCsv } from '../lib/csvParser'
import { buildDatasetState } from '../lib/datasetAnalysis'
import { SAMPLE_DATASET_CSV, SAMPLE_DATASET_FILENAME } from './sampleDataset'

/** Exercises the exact CSV the "Load sample dataset" button feeds through
 *  the real ingestion pipeline — the closest proxy available to actually
 *  clicking the demo button end-to-end. */
describe('sample dataset end-to-end', () => {
  it('parses and profiles as expected, and suggests the right target', () => {
    const parsed = parseCsv(SAMPLE_DATASET_CSV)
    const file = new File([SAMPLE_DATASET_CSV], SAMPLE_DATASET_FILENAME, { type: 'text/csv' })
    const state = buildDatasetState({ file, parsed, targetColumn: null })

    expect(state.rowCount).toBe(10)
    expect(state.columnCount).toBe(8)
    expect(state.suggestedTargetColumn).toBe('diagnosis')
    expect(state.identifierColumns).toEqual(['patient_id'])
    expect(state.emptyColumns).toEqual(['notes'])
    expect(state.numericColumns).toEqual(expect.arrayContaining(['age', 'bmi', 'glucose', 'blood_pressure']))
    expect(state.categoricalColumns).toContain('smoker')
    expect(state.validationStatus).toBe('valid-with-warnings') // no target selected yet + an empty column

    const withTarget = buildDatasetState({ file, parsed, targetColumn: 'diagnosis' })
    expect(withTarget.targetType).toBe('binary')
    expect(withTarget.targetClasses).toEqual(['0', '1'])
    expect(withTarget.validationChecks.some((c) => c.id === 'target-valid')).toBe(true)
    expect(withTarget.validationStatus).toBe('valid-with-warnings') // the empty "notes" column remains a warning
  })
})
