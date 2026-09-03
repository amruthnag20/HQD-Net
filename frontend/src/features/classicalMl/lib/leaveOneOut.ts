import { predictProbability, trainLogisticRegression, type LogisticRegressionOptions } from './logisticRegression'
import { computeAccuracy, computeConfusion, computeF1, computePrecision, computeRecall, computeRocAuc } from './evaluation'
import type { ClassicalMetrics } from '../types/classicalMl'

export type LoocvPrediction = {
  rowIndex: number
  actual: number
  predictedClass: number
  predictedProbability: number
}

export type LoocvResult = {
  predictions: LoocvPrediction[]
  metrics: ClassicalMetrics
}

/** Leave-one-out cross-validation — the honest choice for a dataset this
 *  small: a held-out train/test split would leave almost nothing to
 *  evaluate on, while LOOCV uses every row as its own held-out test case
 *  exactly once. Every reported metric comes from a genuinely-held-out
 *  prediction, never from re-scoring the training set. */
export function runLeaveOneOutCV(X: number[][], y: number[], options: LogisticRegressionOptions = {}): LoocvResult {
  const n = X.length
  const predictions: LoocvPrediction[] = []

  for (let i = 0; i < n; i++) {
    const trainX = X.filter((_, idx) => idx !== i)
    const trainY = y.filter((_, idx) => idx !== i)
    const model = trainLogisticRegression(trainX, trainY, options)
    const predictedProbability = predictProbability(model, X[i])
    predictions.push({
      rowIndex: i,
      actual: y[i],
      predictedProbability,
      predictedClass: predictedProbability >= 0.5 ? 1 : 0,
    })
  }

  const actual = predictions.map((p) => p.actual)
  const predictedClass = predictions.map((p) => p.predictedClass)
  const predictedProbability = predictions.map((p) => p.predictedProbability)

  const confusion = computeConfusion(actual, predictedClass)
  const precision = computePrecision(confusion)
  const recall = computeRecall(confusion)

  const metrics: ClassicalMetrics = {
    accuracy: computeAccuracy(confusion),
    precision,
    recall,
    f1: computeF1(precision, recall),
    rocAuc: computeRocAuc(actual, predictedProbability),
    evaluationMethod: 'leave-one-out-cross-validation',
    foldCount: n,
  }

  return { predictions, metrics }
}
