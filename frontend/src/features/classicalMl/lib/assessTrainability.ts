import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import type { ClassicalModelStatus } from '../types/classicalMl'

/** Below this, leave-one-out evaluation of a class is too thin to be
 *  meaningful — not a hard ML requirement, just a floor for an honest demo. */
export const MIN_ROWS_PER_CLASS = 2

export type TrainabilityAssessment = {
  status: Extract<ClassicalModelStatus, 'label-required' | 'unsupported-target' | 'ready'>
  message: string | null
}

function countLabeledRows(targetValues: (string | null)[], classes: [string, string]): [number, number] {
  let negCount = 0
  let posCount = 0
  for (const v of targetValues) {
    if (v === classes[0]) negCount++
    else if (v === classes[1]) posCount++
  }
  return [negCount, posCount]
}

/** Decides whether the current Phase 2 output can be trained on, without
 *  running any computation — used to render the model status before the
 *  user presses Train, and to gate the Train action itself. */
export function assessTrainability(processed: ProcessedDataset): TrainabilityAssessment {
  if (!processed.targetColumn) {
    return {
      status: 'label-required',
      message: 'No target column selected. Supervised training needs a labeled dataset — target selection is optional during Data Ingestion; select one there to enable training.',
    }
  }

  if (processed.targetType !== 'binary' || !processed.targetClasses || processed.targetClasses.length !== 2) {
    return {
      status: 'unsupported-target',
      message: `This milestone's classical model supports binary classification only. Target "${processed.targetColumn}" is ${processed.targetType ?? 'not usable'}.`,
    }
  }

  if (processed.processedFeatureCount === 0) {
    return { status: 'unsupported-target', message: 'No model-ready features are available to train on.' }
  }

  if (!processed.targetValues || processed.featureMatrix.length === 0) {
    return { status: 'unsupported-target', message: 'No labeled rows are available after preprocessing.' }
  }

  const [negClass, posClass] = processed.targetClasses as [string, string]
  const [negCount, posCount] = countLabeledRows(processed.targetValues, [negClass, posClass])

  if (negCount < MIN_ROWS_PER_CLASS || posCount < MIN_ROWS_PER_CLASS) {
    return {
      status: 'unsupported-target',
      message: `Not enough labeled examples per class to train and evaluate (need at least ${MIN_ROWS_PER_CLASS} per class — found ${negCount} "${negClass}" and ${posCount} "${posClass}").`,
    }
  }

  return { status: 'ready', message: null }
}
