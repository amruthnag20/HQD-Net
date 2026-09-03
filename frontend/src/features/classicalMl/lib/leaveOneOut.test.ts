import { describe, expect, it } from 'vitest'
import { runLeaveOneOutCV } from './leaveOneOut'

describe('runLeaveOneOutCV', () => {
  it('produces exactly one held-out prediction per row', () => {
    const X = [[0], [0.2], [5], [5.2], [0.1], [4.9]]
    const y = [0, 0, 1, 1, 0, 1]
    const { predictions } = runLeaveOneOutCV(X, y, { iterations: 300 })
    expect(predictions).toHaveLength(X.length)
    expect(predictions.map((p) => p.rowIndex)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('reports near-perfect metrics on a cleanly separable toy dataset', () => {
    const X = [[0], [0.1], [0.2], [5], [5.1], [5.2]]
    const y = [0, 0, 0, 1, 1, 1]
    const { metrics } = runLeaveOneOutCV(X, y, { iterations: 400 })
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0.8)
    expect(metrics.evaluationMethod).toBe('leave-one-out-cross-validation')
    expect(metrics.foldCount).toBe(6)
  })

  it('never returns NaN metrics even on a small, noisy dataset', () => {
    const X = [[1], [2], [1], [2], [1], [2]]
    const y = [0, 1, 1, 0, 0, 1]
    const { metrics } = runLeaveOneOutCV(X, y)
    expect(Number.isFinite(metrics.accuracy)).toBe(true)
    expect(Number.isFinite(metrics.precision)).toBe(true)
    expect(Number.isFinite(metrics.recall)).toBe(true)
    expect(Number.isFinite(metrics.f1)).toBe(true)
  })
})
