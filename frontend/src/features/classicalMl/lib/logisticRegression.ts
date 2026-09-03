/** Binary logistic regression trained by batch gradient descent, with L2
 *  (ridge) regularization. Regularization matters here specifically because
 *  a small demo dataset can easily have more one-hot-encoded features than
 *  rows once a fold is held out — without it, unregularized gradient
 *  descent on separable, high-dimensional data diverges toward infinite
 *  weights instead of converging to a sane decision boundary. */

export type LogisticRegressionModel = {
  weights: number[]
  bias: number
  iterations: number
  learningRate: number
}

export type LogisticRegressionOptions = {
  learningRate?: number
  iterations?: number
  l2?: number
}

const DEFAULT_LEARNING_RATE = 0.1
const DEFAULT_ITERATIONS = 300
const DEFAULT_L2 = 0.1

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z))
}

function dot(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

export function trainLogisticRegression(
  X: number[][],
  y: number[],
  options: LogisticRegressionOptions = {},
): LogisticRegressionModel {
  const learningRate = options.learningRate ?? DEFAULT_LEARNING_RATE
  const iterations = options.iterations ?? DEFAULT_ITERATIONS
  const l2 = options.l2 ?? DEFAULT_L2

  const n = X.length
  const d = n > 0 ? X[0].length : 0
  let weights = new Array<number>(d).fill(0)
  let bias = 0

  for (let iter = 0; iter < iterations; iter++) {
    const gradW = new Array<number>(d).fill(0)
    let gradB = 0

    for (let i = 0; i < n; i++) {
      const prediction = sigmoid(dot(weights, X[i]) + bias)
      const error = prediction - y[i]
      for (let j = 0; j < d; j++) gradW[j] += error * X[i][j]
      gradB += error
    }

    weights = weights.map((w, j) => w - learningRate * (gradW[j] / n + l2 * w))
    bias -= learningRate * (gradB / n)
  }

  return { weights, bias, iterations, learningRate }
}

export function predictProbability(model: LogisticRegressionModel, x: number[]): number {
  return sigmoid(dot(model.weights, x) + model.bias)
}
