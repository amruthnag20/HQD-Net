import { describe, expect, it } from 'vitest'
import type { ColumnProfile } from '@/features/ingestion/types/dataset'
import { buildFeatureDecisions } from './featureDecisions'

function profile(overrides: Partial<ColumnProfile> & { name: string }): ColumnProfile {
  return {
    dtype: 'numeric',
    missingCount: 0,
    missingPercent: 0,
    uniqueCount: 10,
    isConstant: false,
    isLikelyIdentifier: false,
    sampleValues: [],
    ...overrides,
  }
}

const COLUMNS: ColumnProfile[] = [
  profile({ name: 'age', dtype: 'numeric', missingCount: 0 }),
  profile({ name: 'bmi', dtype: 'numeric', missingCount: 3 }),
  profile({ name: 'smoking_status', dtype: 'categorical' }),
  profile({ name: 'patient_id', dtype: 'categorical', isLikelyIdentifier: true }),
  profile({ name: 'lab_site', dtype: 'categorical', isConstant: true }),
  profile({ name: 'notes', dtype: 'empty' }),
  profile({ name: 'diagnosis', dtype: 'categorical' }),
]

describe('buildFeatureDecisions', () => {
  it('excludes the target column', () => {
    const decisions = buildFeatureDecisions(COLUMNS, 'diagnosis', {})
    expect(decisions.find((d) => d.name === 'diagnosis')).toBeUndefined()
  })

  it('marks a clean numeric column ready and a missing one for imputation', () => {
    const decisions = buildFeatureDecisions(COLUMNS, 'diagnosis', {})
    expect(decisions.find((d) => d.name === 'age')?.status).toBe('ready')
    expect(decisions.find((d) => d.name === 'bmi')?.status).toBe('impute')
  })

  it('marks categorical columns for encoding', () => {
    const decisions = buildFeatureDecisions(COLUMNS, 'diagnosis', {})
    expect(decisions.find((d) => d.name === 'smoking_status')?.status).toBe('encode')
  })

  it('excludes identifiers and constants by default but allows override', () => {
    const decisions = buildFeatureDecisions(COLUMNS, 'diagnosis', {})
    expect(decisions.find((d) => d.name === 'patient_id')?.included).toBe(false)
    expect(decisions.find((d) => d.name === 'lab_site')?.included).toBe(false)

    const overridden = buildFeatureDecisions(COLUMNS, 'diagnosis', { patient_id: true })
    expect(overridden.find((d) => d.name === 'patient_id')?.included).toBe(true)
  })

  it('never allows an empty column to be included', () => {
    const decisions = buildFeatureDecisions(COLUMNS, 'diagnosis', { notes: true })
    const notes = decisions.find((d) => d.name === 'notes')
    expect(notes?.included).toBe(false)
    expect(notes?.overridable).toBe(false)
  })

  it('lets a manual override exclude an otherwise-normal feature', () => {
    const decisions = buildFeatureDecisions(COLUMNS, 'diagnosis', { age: false })
    expect(decisions.find((d) => d.name === 'age')?.included).toBe(false)
  })
})
