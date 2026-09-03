/** Phase 2 — Classical Preprocessing: the frontend-only pipeline that turns
 *  a validated Phase 1 dataset into a shared, model-ready feature table for
 *  both future branches (classical ML and quantum ML). Nothing here talks
 *  to a backend — see classical_preprocessing/ (Python) for the eventual
 *  server-side implementation this frontend state is shaped to match. */

import type { TargetType } from '@/features/ingestion/types/dataset'

export type NumericImputeStrategy = 'median' | 'mean'
export type CategoricalImputeStrategy = 'most-frequent'
export type MissingValueMode = 'impute' | 'drop-rows'

export type EncodingStrategy = 'one-hot' | 'ordinal'
export type ScalingStrategy = 'standardization' | 'min-max'

export type FeatureRole = 'numeric' | 'categorical' | 'identifier' | 'constant' | 'empty'
export type FeatureStatus = 'ready' | 'impute' | 'encode' | 'exclude'

/** One row of the Feature Profile table — what will happen to this column
 *  and whether the user has overridden the default inclusion decision. */
export type FeatureDecision = {
  name: string
  role: FeatureRole
  status: FeatureStatus
  missingCount: number
  /** Identifier/constant columns default to false; everything else defaults
   *  to true. Only identifier/constant decisions can be overridden. */
  included: boolean
  /** Whether the user is allowed to flip `included` for this column. */
  overridable: boolean
}

export type PreprocessingConfig = {
  missingValueMode: MissingValueMode
  numericImputeStrategy: NumericImputeStrategy
  categoricalImputeStrategy: CategoricalImputeStrategy
  encodingStrategy: EncodingStrategy
  scalingStrategy: ScalingStrategy
  /** Raw-scale variance floor applied to numeric columns post-imputation,
   *  pre-scaling. 0 disables the filter (nothing extra is dropped). */
  varianceThreshold: number
  /** Absolute Pearson correlation above which the later of a pair of
   *  numeric columns is dropped as redundant. 1 disables the filter. */
  correlationThreshold: number
  /** Explicit include/exclude overrides keyed by column name — takes
   *  precedence over the role-based default for overridable columns. */
  featureOverrides: Record<string, boolean>
}

export const DEFAULT_PREPROCESSING_CONFIG: PreprocessingConfig = {
  missingValueMode: 'impute',
  numericImputeStrategy: 'median',
  categoricalImputeStrategy: 'most-frequent',
  encodingStrategy: 'one-hot',
  scalingStrategy: 'standardization',
  varianceThreshold: 0,
  correlationThreshold: 0.95,
  featureOverrides: {},
}

export type ExcludedFeature = {
  name: string
  reason: 'identifier' | 'constant' | 'empty' | 'manual' | 'low-variance' | 'correlated'
}

export type DimensionStep = {
  id: 'input' | 'cleaned' | 'encoded' | 'filtered' | 'scaled'
  label: string
  count: number
}

export type ProcessedDataset = {
  datasetName: string
  /** Null when no target was selected during ingestion — expected and
   *  non-blocking at this milestone; every column becomes a candidate
   *  feature. Populated once the future training stage requires a target. */
  targetColumn: string | null
  targetType: TargetType
  targetClasses: string[] | null

  originalFeatureCount: number
  processedFeatureCount: number

  includedFeatures: string[]
  excludedFeatures: ExcludedFeature[]

  missingValueStrategy: {
    mode: MissingValueMode
    numeric: NumericImputeStrategy
    categorical: CategoricalImputeStrategy
  }
  encodingStrategy: EncodingStrategy
  scalingStrategy: ScalingStrategy
  featureSelectionStrategy: {
    varianceThreshold: number
    correlationThreshold: number
    droppedByVariance: string[]
    droppedByCorrelation: string[]
  }

  processedRows: number
  processedFeatures: number
  /** Final model-ready column names, in output order. */
  processedColumnNames: string[]
  /** The actual model-ready numeric feature matrix — processedRows rows ×
   *  processedColumnNames.length columns, same order as processedColumnNames.
   *  This is the shared artifact both the classical-ML and quantum-ML
   *  branches (Phase 3A/3B) consume; everything else on this type is a
   *  summary describing it. */
  featureMatrix: number[][]
  /** Raw target label per row, aligned 1:1 with featureMatrix — null
   *  overall when no target was selected (optional at this milestone), or
   *  null for an individual row whose target cell was itself missing.
   *  Supervised consumers filter out null rows themselves; this array is
   *  target-agnostic on purpose so non-supervised consumers aren't short a
   *  row just because a label happened to be missing. */
  targetValues: (string | null)[] | null

  dimensionFlow: DimensionStep[]

  beforeSummary: {
    features: number
    numeric: number
    categorical: number
    missingPercent: number
  }
  afterSummary: {
    features: number
    unresolvedMissing: number
    percentNumeric: number
    scaled: boolean
  }

  status: 'model-ready'
  generatedAt: string
}
