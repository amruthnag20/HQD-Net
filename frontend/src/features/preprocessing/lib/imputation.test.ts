import { describe, expect, it } from 'vitest'
import {
  computeCategoricalFillValue,
  computeNumericFillValue,
  imputeCategoricalColumn,
  imputeNumericColumn,
  mean,
  median,
  mostFrequent,
} from './imputation'

describe('median', () => {
  it('averages the two middle values for an even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
  it('picks the middle value for an odd-length array', () => {
    expect(median([5, 1, 3])).toBe(3)
  })
  it('is unaffected by input order', () => {
    expect(median([10, 1, 2])).toBe(median([1, 2, 10]))
  })
})

describe('mean', () => {
  it('computes the arithmetic mean', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('mostFrequent', () => {
  it('returns the most common value', () => {
    expect(mostFrequent(['a', 'b', 'a', 'a', 'c'])).toBe('a')
  })
  it('breaks ties by first occurrence', () => {
    expect(mostFrequent(['b', 'a', 'b', 'a'])).toBe('b')
  })
})

describe('computeNumericFillValue / computeCategoricalFillValue', () => {
  it('uses median or mean per strategy', () => {
    expect(computeNumericFillValue([1, 2, 3, 100], 'median')).toBe(2.5)
    expect(computeNumericFillValue([1, 2, 3, 4], 'mean')).toBe(2.5)
  })
  it('uses most-frequent for categorical', () => {
    expect(computeCategoricalFillValue(['x', 'x', 'y'], 'most-frequent')).toBe('x')
  })
})

describe('imputeNumericColumn', () => {
  it('fills nulls with the strategy fill value and leaves present values untouched', () => {
    const result = imputeNumericColumn([1, null, 3, null, 5], 'median')
    expect(result).toEqual([1, 3, 3, 3, 5])
  })
  it('does not mutate the input array', () => {
    const input = [1, null, 3]
    imputeNumericColumn(input, 'mean')
    expect(input).toEqual([1, null, 3])
  })
})

describe('imputeCategoricalColumn', () => {
  it('fills nulls with the most frequent present value', () => {
    const result = imputeCategoricalColumn(['smoker', null, 'non-smoker', 'smoker'], 'most-frequent')
    expect(result).toEqual(['smoker', 'smoker', 'non-smoker', 'smoker'])
  })
})
