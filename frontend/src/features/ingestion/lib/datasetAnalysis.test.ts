import { describe, expect, it } from 'vitest'
import { parseCsv } from './csvParser'
import {
  buildDatasetState,
  computeMissingValueSummary,
  computeTargetClasses,
  computeTargetType,
  profileColumns,
  suggestTargetColumn,
} from './datasetAnalysis'

function makeFile(csv: string, name = 'dataset.csv'): File {
  return new File([csv], name, { type: 'text/csv' })
}

const CLINICAL_CSV = [
  'patient_id,age,bmi,glucose,notes,diagnosis',
  'PAT-1,52,27.4,118,,1',
  'PAT-2,47,31.2,142,,1',
  'PAT-3,61,24.8,,,0',
  'PAT-4,39,22.1,88,,0',
  'PAT-5,58,29.6,151,,1',
].join('\n')

describe('profileColumns', () => {
  it('detects numeric vs categorical vs empty columns', () => {
    const { headers, rows } = parseCsv(CLINICAL_CSV)
    const columns = profileColumns(headers, rows)

    const byName = Object.fromEntries(columns.map((c) => [c.name, c]))
    expect(byName.age.dtype).toBe('numeric')
    expect(byName.glucose.dtype).toBe('numeric')
    expect(byName.glucose.missingCount).toBe(1)
    expect(byName.notes.dtype).toBe('empty')
    expect(byName.diagnosis.dtype).toBe('numeric')
  })

  it('flags an all-unique, id-named column as a likely identifier', () => {
    const { headers, rows } = parseCsv(CLINICAL_CSV)
    const columns = profileColumns(headers, rows)
    const id = columns.find((c) => c.name === 'patient_id')
    expect(id?.isLikelyIdentifier).toBe(true)
  })

  it('flags a column with a single repeated value as constant', () => {
    const csv = 'a,site\n1,LAB_A\n2,LAB_A\n3,LAB_A\n'
    const { headers, rows } = parseCsv(csv)
    const columns = profileColumns(headers, rows)
    expect(columns.find((c) => c.name === 'site')?.isConstant).toBe(true)
    expect(columns.find((c) => c.name === 'a')?.isConstant).toBe(false)
  })
})

describe('suggestTargetColumn', () => {
  it('prefers a clinically-named label column over other candidates', () => {
    const { headers, rows } = parseCsv(CLINICAL_CSV)
    const columns = profileColumns(headers, rows)
    expect(suggestTargetColumn(columns)).toBe('diagnosis')
  })

  it('never suggests an identifier column', () => {
    const { headers, rows } = parseCsv(CLINICAL_CSV)
    const columns = profileColumns(headers, rows)
    expect(suggestTargetColumn(columns)).not.toBe('patient_id')
  })

  it('falls back to a low-cardinality column when no name matches', () => {
    const csv = 'id,measurement,group\n1,10.2,A\n2,11.5,B\n3,9.8,A\n4,12.1,B\n'
    const { headers, rows } = parseCsv(csv)
    const columns = profileColumns(headers, rows)
    expect(suggestTargetColumn(columns)).toBe('group')
  })
})

describe('computeTargetType / computeTargetClasses', () => {
  it('classifies a two-value numeric column as binary', () => {
    const { headers, rows } = parseCsv(CLINICAL_CSV)
    const columns = profileColumns(headers, rows)
    const diagnosis = columns.find((c) => c.name === 'diagnosis')!
    expect(computeTargetType(diagnosis)).toBe('binary')
    expect(computeTargetClasses(headers, rows, 'diagnosis')).toEqual(['0', '1'])
  })

  it('classifies a high-cardinality numeric column as continuous', () => {
    const csv = 'x,score\n1,10.1\n2,22.7\n3,31.9\n4,44.2\n5,58.6\n6,63.3\n7,71.4\n8,82.9\n9,91.1\n10,99.9\n11,12.3\n12,15.6\n13,19.9\n14,23.4\n15,29.9\n16,33.3\n17,38.8\n18,42.2\n19,47.7\n20,51.1\n21,55.5\n'
    const { headers, rows } = parseCsv(csv)
    const columns = profileColumns(headers, rows)
    const score = columns.find((c) => c.name === 'score')!
    expect(computeTargetType(score)).toBe('continuous')
  })
})

describe('computeMissingValueSummary', () => {
  it('computes overall missing-cell percentage and worst columns', () => {
    const { headers, rows } = parseCsv(CLINICAL_CSV)
    const columns = profileColumns(headers, rows)
    const summary = computeMissingValueSummary(columns, rows.length)
    expect(summary.missingCells).toBeGreaterThan(0)
    expect(summary.worstColumns[0].name).toBe('notes')
    expect(summary.worstColumns[0].missingPercent).toBe(100)
  })
})

describe('buildDatasetState', () => {
  it('produces a valid-with-warnings status for a clean dataset with an empty column', () => {
    const parsed = parseCsv(CLINICAL_CSV)
    const state = buildDatasetState({ file: makeFile(CLINICAL_CSV), parsed, targetColumn: 'diagnosis' })

    expect(state.rowCount).toBe(5)
    expect(state.columnCount).toBe(6)
    expect(state.targetColumn).toBe('diagnosis')
    expect(state.targetType).toBe('binary')
    expect(state.emptyColumns).toEqual(['notes'])
    expect(state.identifierColumns).toEqual(['patient_id'])
    expect(state.validationStatus).not.toBe('invalid')
  })

  it('flags a constant target column as invalid', () => {
    const csv = 'a,label\n1,X\n2,X\n3,X\n'
    const parsed = parseCsv(csv)
    const state = buildDatasetState({ file: makeFile(csv), parsed, targetColumn: 'label' })
    expect(state.validationStatus).toBe('invalid')
    expect(state.validationChecks.some((c) => c.id === 'target-constant')).toBe(true)
  })

  it('flags an identifier column selected as target as invalid', () => {
    const parsed = parseCsv(CLINICAL_CSV)
    const state = buildDatasetState({ file: makeFile(CLINICAL_CSV), parsed, targetColumn: 'patient_id' })
    expect(state.validationStatus).toBe('invalid')
    expect(state.validationChecks.some((c) => c.id === 'target-identifier')).toBe(true)
  })

  it('warns (does not block) when no target has been selected yet', () => {
    const parsed = parseCsv(CLINICAL_CSV)
    const state = buildDatasetState({ file: makeFile(CLINICAL_CSV), parsed, targetColumn: null })
    expect(state.validationStatus).not.toBe('invalid')
    expect(state.validationChecks.some((c) => c.id === 'target-missing')).toBe(true)
  })

  it('flags duplicate column names as an error', () => {
    const csv = 'age,age,diagnosis\n1,2,0\n'
    const parsed = parseCsv(csv)
    const state = buildDatasetState({ file: makeFile(csv), parsed, targetColumn: null })
    expect(state.validationStatus).toBe('invalid')
    expect(state.duplicateColumnNames).toEqual(['age'])
  })

  it('flags a completely empty dataset (headers only, no rows) as invalid', () => {
    const csv = 'age,bmi,diagnosis\n'
    const parsed = parseCsv(csv)
    const state = buildDatasetState({ file: makeFile(csv), parsed, targetColumn: null })
    expect(state.rowCount).toBe(0)
    expect(state.validationStatus).toBe('invalid')
  })

  it('caps the rendered preview without dropping true row counts', () => {
    const header = 'a,b\n'
    const bigCsv = header + Array.from({ length: 600 }, (_, i) => `${i},${i * 2}`).join('\n')
    const parsed = parseCsv(bigCsv)
    const state = buildDatasetState({ file: makeFile(bigCsv), parsed, targetColumn: null })
    expect(state.rowCount).toBe(600)
    expect(state.preview.truncated).toBe(true)
    expect(state.preview.rows.length).toBeLessThan(600)
  })
})
