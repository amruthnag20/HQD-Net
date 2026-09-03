import { describe, expect, it } from 'vitest'
import { computeMeanStd, computeMinMax, minMaxScale, scaleColumn, standardize } from './scaling'

describe('computeMinMax', () => {
  it('finds the min and max', () => {
    expect(computeMinMax([5, 1, 9, 3])).toEqual({ min: 1, max: 9 })
  })
})

describe('computeMeanStd', () => {
  it('computes population mean and standard deviation', () => {
    const { mean, std } = computeMeanStd([2, 4, 4, 4, 5, 5, 7, 9])
    expect(mean).toBe(5)
    expect(std).toBeCloseTo(2, 5)
  })
})

describe('standardize', () => {
  it('produces zero mean and unit variance', () => {
    const result = standardize([2, 4, 4, 4, 5, 5, 7, 9])
    const { mean, std } = computeMeanStd(result)
    expect(mean).toBeCloseTo(0, 5)
    expect(std).toBeCloseTo(1, 5)
  })

  it('maps a zero-variance column to all zeros instead of dividing by zero', () => {
    expect(standardize([7, 7, 7])).toEqual([0, 0, 0])
  })
})

describe('minMaxScale', () => {
  it('maps values into [0, 1]', () => {
    expect(minMaxScale([0, 5, 10])).toEqual([0, 0.5, 1])
  })

  it('maps a zero-range column to all zeros instead of dividing by zero', () => {
    expect(minMaxScale([3, 3, 3])).toEqual([0, 0, 0])
  })
})

describe('scaleColumn', () => {
  it('dispatches to the requested strategy', () => {
    expect(scaleColumn([0, 5, 10], 'min-max')).toEqual(minMaxScale([0, 5, 10]))
    expect(scaleColumn([0, 5, 10], 'standardization')).toEqual(standardize([0, 5, 10]))
  })
})
