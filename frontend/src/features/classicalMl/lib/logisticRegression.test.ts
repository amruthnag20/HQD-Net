import { describe, expect, it } from 'vitest'
import { predictProbability, trainLogisticRegression } from './logisticRegression'

describe('trainLogisticRegression', () => {
  it('learns a clean linear separation on trivially separable data', () => {
    // A single feature that perfectly predicts the label.
    const X = [[0], [0.1], [0.2], [5], [5.1], [5.2]]
    const y = [0, 0, 0, 1, 1, 1]
    const model = trainLogisticRegression(X, y, { iterations: 500 })

    expect(predictProbability(model, [0])).toBeLessThan(0.5)
    expect(predictProbability(model, [5.1])).toBeGreaterThan(0.5)
  })

  it('never produces NaN or infinite weights on an overparameterized fold', () => {
    // 3 rows, 5 features — more dimensions than examples, the exact shape a
    // leave-one-out fold can produce once one-hot encoding runs.
    const X = [
      [1, 0, 0, 1, 0.2],
      [0, 1, 0, 0, 0.8],
      [0, 0, 1, 1, 0.5],
    ]
    const y = [0, 1, 0]
    const model = trainLogisticRegression(X, y)

    expect(model.weights.every((w) => Number.isFinite(w))).toBe(true)
    expect(Number.isFinite(model.bias)).toBe(true)
  })

  it('predicts near 0.5 for an untrained (zero-iteration) model', () => {
    const model = trainLogisticRegression([[1, 2]], [1], { iterations: 0 })
    expect(predictProbability(model, [1, 2])).toBeCloseTo(0.5, 5)
  })
})
