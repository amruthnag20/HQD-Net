import { describe, expect, it } from 'vitest'
import { countEncodedColumns, oneHotEncode, ordinalEncode } from './encoding'

describe('oneHotEncode', () => {
  it('creates one binary column per distinct category', () => {
    const result = oneHotEncode('smoking_status', ['smoker', 'non-smoker', 'smoker', 'former'])
    expect(result).toHaveLength(3)
    expect(result.map((c) => c.name).sort()).toEqual([
      'smoking_status__former',
      'smoking_status__non-smoker',
      'smoking_status__smoker',
    ])
  })

  it('marks membership correctly per row', () => {
    const result = oneHotEncode('sex', ['m', 'f', 'm'])
    const male = result.find((c) => c.name === 'sex__m')
    expect(male?.values).toEqual([1, 0, 1])
  })
})

describe('ordinalEncode', () => {
  it('produces a single integer-coded column', () => {
    const result = ordinalEncode('sex', ['m', 'f', 'm'])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('sex__ordinal')
  })

  it('maps categories to a stable sorted index', () => {
    const result = ordinalEncode('grade', ['b', 'a', 'c', 'a'])
    // sorted categories: a=0, b=1, c=2
    expect(result[0].values).toEqual([1, 0, 2, 0])
  })
})

describe('countEncodedColumns', () => {
  it('counts distinct categories for one-hot', () => {
    expect(countEncodedColumns(['a', 'b', 'a', 'c'], 'one-hot')).toBe(3)
  })
  it('is always 1 for ordinal', () => {
    expect(countEncodedColumns(['a', 'b', 'a', 'c'], 'ordinal')).toBe(1)
  })
})
