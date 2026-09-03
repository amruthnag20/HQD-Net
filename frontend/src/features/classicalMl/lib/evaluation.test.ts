import { describe, expect, it } from 'vitest'
import { computeAccuracy, computeConfusion, computeF1, computePrecision, computeRecall, computeRocAuc } from './evaluation'

describe('computeConfusion', () => {
  it('counts tp/fp/tn/fn correctly', () => {
    const actual = [1, 1, 0, 0, 1]
    const predicted = [1, 0, 0, 1, 1]
    expect(computeConfusion(actual, predicted)).toEqual({ tp: 2, fp: 1, tn: 1, fn: 1 })
  })
})

describe('computeAccuracy / computePrecision / computeRecall / computeF1', () => {
  it('matches hand-computed values for a known confusion matrix', () => {
    const c = { tp: 2, fp: 1, tn: 1, fn: 1 }
    expect(computeAccuracy(c)).toBeCloseTo(3 / 5, 5)
    expect(computePrecision(c)).toBeCloseTo(2 / 3, 5)
    expect(computeRecall(c)).toBeCloseTo(2 / 3, 5)
    expect(computeF1(computePrecision(c), computeRecall(c))).toBeCloseTo(2 / 3, 5)
  })

  it('never divides by zero — a metric with no denominator reads 0, not NaN', () => {
    const c = { tp: 0, fp: 0, tn: 5, fn: 0 }
    expect(computePrecision(c)).toBe(0)
    expect(computeRecall(c)).toBe(0)
    expect(computeF1(0, 0)).toBe(0)
  })
})

describe('computeRocAuc', () => {
  it('is 1 when every positive outscores every negative', () => {
    const actual = [0, 0, 1, 1]
    const proba = [0.1, 0.2, 0.8, 0.9]
    expect(computeRocAuc(actual, proba)).toBe(1)
  })

  it('is 0.5 for random/tied scores', () => {
    const actual = [0, 1]
    const proba = [0.5, 0.5]
    expect(computeRocAuc(actual, proba)).toBe(0.5)
  })

  it('is null when only one class is present', () => {
    expect(computeRocAuc([1, 1, 1], [0.2, 0.8, 0.5])).toBeNull()
    expect(computeRocAuc([0, 0], [0.2, 0.8])).toBeNull()
  })
})
