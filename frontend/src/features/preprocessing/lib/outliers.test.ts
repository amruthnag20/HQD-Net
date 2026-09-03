import { describe, expect, it } from 'vitest'
import { detectOutliersIQR } from './outliers'

describe('detectOutliersIQR', () => {
  it('finds no outliers in a tight, evenly-spread distribution', () => {
    const report = detectOutliersIQR([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
    expect(report.count).toBe(0)
  })

  it('flags a value far outside the interquartile range', () => {
    const report = detectOutliersIQR([10, 11, 12, 13, 14, 15, 16, 17, 18, 500])
    expect(report.count).toBe(1)
  })

  it('never fabricates bounds for an empty column', () => {
    expect(detectOutliersIQR([])).toEqual({ count: 0, lowerBound: 0, upperBound: 0 })
  })

  it('does not flag anything for a constant column', () => {
    const report = detectOutliersIQR([5, 5, 5, 5, 5])
    expect(report.count).toBe(0)
  })
})
