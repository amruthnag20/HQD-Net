import { describe, expect, it } from 'vitest'
import { computeVariance, pearsonCorrelation, selectByCorrelationFilter, selectByVarianceThreshold } from './featureSelection'

describe('computeVariance', () => {
  it('is zero for a constant column', () => {
    expect(computeVariance([4, 4, 4])).toBe(0)
  })
  it('is positive for a varying column', () => {
    expect(computeVariance([1, 2, 3, 4])).toBeGreaterThan(0)
  })
})

describe('selectByVarianceThreshold', () => {
  it('keeps everything when the threshold is 0', () => {
    const columns = [{ name: 'a', values: [1, 1, 1] }]
    expect(selectByVarianceThreshold(columns, 0)).toEqual([])
  })

  it('drops columns at or below the threshold', () => {
    const columns = [
      { name: 'near-constant', values: [1, 1, 1.01] },
      { name: 'varying', values: [1, 50, 100] },
    ]
    const dropped = selectByVarianceThreshold(columns, 0.01)
    expect(dropped).toContain('near-constant')
    expect(dropped).not.toContain('varying')
  })
})

describe('pearsonCorrelation', () => {
  it('is 1 for perfectly correlated columns', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 5)
  })
  it('is -1 for perfectly anti-correlated columns', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 5)
  })
  it('is 0 when either column has no variance', () => {
    expect(pearsonCorrelation([1, 1, 1], [1, 2, 3])).toBe(0)
  })
})

describe('selectByCorrelationFilter', () => {
  it('drops the later of a highly correlated pair', () => {
    const columns = [
      { name: 'height_cm', values: [150, 160, 170, 180] },
      { name: 'height_mm', values: [1500, 1600, 1700, 1800] },
      { name: 'unrelated', values: [5, 1, 9, 2] },
    ]
    const dropped = selectByCorrelationFilter(columns, 0.95)
    expect(dropped).toEqual(['height_mm'])
  })

  it('disables the filter when the threshold is 1 or above', () => {
    const columns = [
      { name: 'a', values: [1, 2, 3] },
      { name: 'b', values: [1, 2, 3] },
    ]
    expect(selectByCorrelationFilter(columns, 1)).toEqual([])
  })
})
