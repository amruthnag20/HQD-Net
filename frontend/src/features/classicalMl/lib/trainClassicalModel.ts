import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import { runLeaveOneOutCV } from './leaveOneOut'
import { assessTrainability } from './assessTrainability'
import type { ClassicalModelResult, ClassicalRowPrediction } from '../types/classicalMl'

const LEARNING_RATE = 0.1
const ITERATIONS = 300
const L2 = 0.1

function emptyResult(
  processed: ProcessedDataset,
  status: ClassicalModelResult['status'],
  errorMessage: string | null,
): ClassicalModelResult {
  return {
    status,
    modelType: null,
    featureCount: processed.processedFeatureCount,
    featureNames: processed.processedColumnNames,
    targetColumn: processed.targetColumn,
    positiveClass: null,
    negativeClass: null,
    predictions: null,
    metrics: null,
    modelMetadata: null,
    errorMessage,
  }
}

/** Trains and leave-one-out-evaluates a binary logistic regression directly
 *  on Phase 2's ProcessedDataset.featureMatrix/targetValues — never
 *  reconstructs preprocessing, never touches the raw dataset. Rows whose
 *  label cell was missing are excluded from training/evaluation only (the
 *  shared featureMatrix itself stays target-agnostic). Returns a
 *  non-trained result with a clear status instead of throwing when the
 *  dataset isn't trainable — that's a legitimate model state, not a bug. */
export function trainClassicalModel(processed: ProcessedDataset): ClassicalModelResult {
  const assessment = assessTrainability(processed)
  if (assessment.status !== 'ready') {
    return emptyResult(processed, assessment.status, assessment.message)
  }

  if (!processed.targetValues || !processed.targetClasses) {
    return emptyResult(processed, 'error', 'Model-ready dataset is missing its target values.')
  }

  const [negativeClass, positiveClass] = processed.targetClasses

  const trainableIndices = processed.targetValues
    .map((v, i) => ({ v, i }))
    .filter((row) => row.v === negativeClass || row.v === positiveClass)
    .map((row) => row.i)

  const X = trainableIndices.map((i) => processed.featureMatrix[i])
  const y = trainableIndices.map((i) => (processed.targetValues![i] === positiveClass ? 1 : 0))
  const rowsExcludedMissingLabel = processed.featureMatrix.length - trainableIndices.length

  try {
    const { predictions: loocvPredictions, metrics } = runLeaveOneOutCV(X, y, {
      learningRate: LEARNING_RATE,
      iterations: ITERATIONS,
      l2: L2,
    })

    const predictions: ClassicalRowPrediction[] = loocvPredictions.map((p) => ({
      rowIndex: p.rowIndex,
      actualClass: p.actual === 1 ? positiveClass : negativeClass,
      predictedClass: p.predictedClass === 1 ? positiveClass : negativeClass,
      predictedProbability: p.predictedProbability,
      correct: p.predictedClass === p.actual,
    }))

    return {
      status: 'trained',
      modelType: 'logistic-regression',
      featureCount: processed.processedFeatureCount,
      featureNames: processed.processedColumnNames,
      targetColumn: processed.targetColumn,
      positiveClass,
      negativeClass,
      predictions,
      metrics,
      modelMetadata: {
        trainedAt: new Date().toISOString(),
        iterations: ITERATIONS,
        learningRate: LEARNING_RATE,
        rowsUsed: X.length,
        rowsExcludedMissingLabel,
      },
      errorMessage: null,
    }
  } catch (err) {
    return emptyResult(processed, 'error', err instanceof Error ? err.message : 'Training failed unexpectedly.')
  }
}
