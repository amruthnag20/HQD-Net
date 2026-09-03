/** Phase 3A — Classical ML branch. Consumes the shared ProcessedDataset
 *  Phase 2 produces (featureMatrix + targetValues) — nothing here reaches
 *  back into the raw dataset or re-runs preprocessing. Frontend-only: no
 *  backend model exists yet, so this trains and evaluates a small,
 *  explainable model (logistic regression) entirely in the browser rather
 *  than faking numbers a backend would eventually supply. */

export type ClassicalModelStatus =
  | 'idle'
  /** No target column was selected during ingestion — expected and
   *  non-blocking, not an error. Supervised training needs a label. */
  | 'label-required'
  /** A target exists but this milestone's model can't use it (not binary,
   *  or too few labeled examples per class). Also not an error. */
  | 'unsupported-target'
  | 'ready'
  | 'training'
  | 'trained'
  | 'error'

/** The only model actually implemented — never presented alongside
 *  decorative, unimplemented alternatives. */
export type ClassicalModelType = 'logistic-regression'

export type ClassicalMetrics = {
  accuracy: number
  precision: number
  recall: number
  f1: number
  /** Null when AUC can't be computed (e.g. a fold aggregate missing one class). */
  rocAuc: number | null
  evaluationMethod: 'leave-one-out-cross-validation'
  foldCount: number
}

export type ClassicalRowPrediction = {
  /** Index within the trainable (non-missing-label) row set, not the
   *  original dataset row index. */
  rowIndex: number
  actualClass: string
  predictedClass: string
  predictedProbability: number
  correct: boolean
}

export type ClassicalModelMetadata = {
  trainedAt: string
  iterations: number
  learningRate: number
  rowsUsed: number
  rowsExcludedMissingLabel: number
}

/** Nullable fields throughout — a field is null because the information
 *  genuinely isn't available yet, never filled with a placeholder value. */
export type ClassicalModelResult = {
  status: ClassicalModelStatus
  modelType: ClassicalModelType | null
  featureCount: number
  featureNames: string[]
  targetColumn: string | null
  positiveClass: string | null
  negativeClass: string | null
  predictions: ClassicalRowPrediction[] | null
  metrics: ClassicalMetrics | null
  modelMetadata: ClassicalModelMetadata | null
  errorMessage: string | null
}
