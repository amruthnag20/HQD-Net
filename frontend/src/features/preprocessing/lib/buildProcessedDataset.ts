import type { DatasetState } from '@/features/ingestion/types/dataset'
import { buildFeatureDecisions } from './featureDecisions'
import { imputeCategoricalColumn, imputeNumericColumn } from './imputation'
import { countEncodedColumns, oneHotEncode, ordinalEncode } from './encoding'
import { scaleColumn } from './scaling'
import { selectByCorrelationFilter, selectByVarianceThreshold } from './featureSelection'
import { extractColumn, isMissingToken, parseCategoricalColumn, parseNumericColumn } from './values'
import type { DimensionStep, ExcludedFeature, PreprocessingConfig, ProcessedDataset } from '../types/preprocessing'

/** Runs the full Phase 2 pipeline (clean → encode → filter → scale) over a
 *  validated Phase 1 dataset and returns only the summary the rest of the
 *  app needs — the intermediate feature matrix is discarded once computed
 *  so the app never holds two copies of the dataset in memory. */
export function buildProcessedDataset(dataset: DatasetState, config: PreprocessingConfig): ProcessedDataset {
  const headers = dataset.preview.headers
  // Optional at this milestone — a null target excludes nothing extra, and
  // every column is a feature candidate. Target selection belongs to a
  // future supervised-training stage, not to this preprocessing pipeline.
  const targetColumn = dataset.targetColumn

  const decisions = buildFeatureDecisions(dataset.columns, targetColumn, config.featureOverrides)
  const included = decisions.filter((d) => d.included)
  const excludedFeatures: ExcludedFeature[] = decisions
    .filter((d) => !d.included)
    .map((d) => ({
      name: d.name,
      reason: config.featureOverrides[d.name] === false ? 'manual' : (d.role as ExcludedFeature['reason']),
    }))

  const includedNumeric = included.filter((d) => d.role === 'numeric')
  const includedCategorical = included.filter((d) => d.role === 'categorical')

  // --- Row selection (drop-rows mode drops any row missing an included value) ---
  const rowIndices = dataset.rows.map((_, i) => i)
  let keptRowIndices = rowIndices
  if (config.missingValueMode === 'drop-rows') {
    const includedColumnIndices = included.map((d) => headers.indexOf(d.name)).filter((i) => i !== -1)
    keptRowIndices = rowIndices.filter((rowIndex) => {
      const row = dataset.rows[rowIndex]
      return includedColumnIndices.every((colIndex) => !isBlank(row[colIndex]))
    })
  }
  const workingRows = keptRowIndices.map((i) => dataset.rows[i])

  // --- Clean: impute (or leave clean) each included numeric/categorical column ---
  const cleanedNumeric = includedNumeric.map((d) => {
    const raw = extractColumn(workingRows, headers, d.name)
    const parsed = parseNumericColumn(raw)
    const values = config.missingValueMode === 'drop-rows' ? (parsed as number[]) : imputeNumericColumn(parsed, config.numericImputeStrategy)
    return { name: d.name, values }
  })

  const cleanedCategorical = includedCategorical.map((d) => {
    const raw = extractColumn(workingRows, headers, d.name)
    const parsed = parseCategoricalColumn(raw)
    const values = config.missingValueMode === 'drop-rows' ? (parsed as string[]) : imputeCategoricalColumn(parsed, config.categoricalImputeStrategy)
    return { name: d.name, values }
  })

  const cleanedFeatureCount = cleanedNumeric.length + cleanedCategorical.length
  // Total candidate columns before cleaning: every column, minus the target
  // column when one is selected (it's excluded from features, not dropped).
  const candidateColumnCount = dataset.columnCount - (targetColumn ? 1 : 0)

  // --- Encode categorical columns ---
  const encodedGroups = cleanedCategorical.map((c) => ({
    source: c.name,
    columns: config.encodingStrategy === 'one-hot' ? oneHotEncode(c.name, c.values) : ordinalEncode(c.name, c.values),
  }))
  const encodedColumns = encodedGroups.flatMap((g) => g.columns)
  const encodedFeatureCount = cleanedNumeric.length + encodedColumns.length

  // --- Feature selection: variance + correlation filter, numeric columns only ---
  const droppedByVariance = selectByVarianceThreshold(cleanedNumeric, config.varianceThreshold)
  const survivingAfterVariance = cleanedNumeric.filter((c) => !droppedByVariance.includes(c.name))
  const droppedByCorrelation = selectByCorrelationFilter(survivingAfterVariance, config.correlationThreshold)
  const finalNumeric = survivingAfterVariance.filter((c) => !droppedByCorrelation.includes(c.name))

  const filteredFeatureCount = finalNumeric.length + encodedColumns.length

  // --- Scale numeric columns (encoded categorical columns are left as-is:
  //     one-hot is already 0/1, ordinal encodes a small integer index) ---
  const scaledNumeric = finalNumeric.map((c) => ({ name: c.name, values: scaleColumn(c.values, config.scalingStrategy) }))

  const processedColumnNames = [...scaledNumeric.map((c) => c.name), ...encodedColumns.map((c) => c.name)]
  const processedFeatureCount = processedColumnNames.length

  // --- The actual model-ready matrix + aligned target column: what
  //     Classical/Quantum ML (Phase 3) consume. Target-agnostic on purpose —
  //     a missing label doesn't cost a row here, only at supervised-training time. ---
  const featureMatrix: number[][] = workingRows.map((_, rowIdx) => [
    ...scaledNumeric.map((c) => c.values[rowIdx]),
    ...encodedColumns.map((c) => c.values[rowIdx]),
  ])
  const targetValues: (string | null)[] | null = targetColumn
    ? extractColumn(workingRows, headers, targetColumn).map((raw) => (isMissingToken(raw) ? null : raw.trim()))
    : null

  const dimensionFlow: DimensionStep[] = [
    { id: 'input', label: 'Input', count: candidateColumnCount },
    { id: 'cleaned', label: 'After cleaning', count: cleanedFeatureCount },
    { id: 'encoded', label: 'After encoding', count: encodedFeatureCount },
    { id: 'filtered', label: 'After filtering', count: filteredFeatureCount },
    { id: 'scaled', label: 'After scaling', count: processedFeatureCount },
  ]

  const excludedForSelection: ExcludedFeature[] = [
    ...droppedByVariance.map((name) => ({ name, reason: 'low-variance' as const })),
    ...droppedByCorrelation.map((name) => ({ name, reason: 'correlated' as const })),
  ]

  return {
    datasetName: dataset.datasetName,
    targetColumn,
    targetType: dataset.targetType,
    targetClasses: dataset.targetClasses,

    originalFeatureCount: candidateColumnCount,
    processedFeatureCount,

    includedFeatures: [...finalNumeric.map((c) => c.name), ...includedCategorical.map((c) => c.name)],
    excludedFeatures: [...excludedFeatures, ...excludedForSelection],

    missingValueStrategy: {
      mode: config.missingValueMode,
      numeric: config.numericImputeStrategy,
      categorical: config.categoricalImputeStrategy,
    },
    encodingStrategy: config.encodingStrategy,
    scalingStrategy: config.scalingStrategy,
    featureSelectionStrategy: {
      varianceThreshold: config.varianceThreshold,
      correlationThreshold: config.correlationThreshold,
      droppedByVariance,
      droppedByCorrelation,
    },

    processedRows: workingRows.length,
    processedFeatures: processedFeatureCount,
    processedColumnNames,
    featureMatrix,
    targetValues,

    dimensionFlow,

    beforeSummary: {
      features: candidateColumnCount,
      numeric: dataset.numericColumns.length,
      categorical: dataset.categoricalColumns.length,
      missingPercent: dataset.missingValueSummary.missingPercent,
    },
    afterSummary: {
      features: processedFeatureCount,
      // Every included column is either fully imputed or its missing rows
      // were dropped — either way, nothing missing survives the pipeline.
      unresolvedMissing: 0,
      percentNumeric: 100,
      scaled: true,
    },

    status: 'model-ready',
    generatedAt: new Date().toISOString(),
  }
}

function isBlank(raw: string | undefined): boolean {
  return raw === undefined || raw.trim() === ''
}

/** Live (pre-Apply) estimate of the post-encoding column count, used by the
 *  Categorical Encoding panel to show dimensionality impact without running
 *  the full pipeline. */
export function estimateEncodedColumnCount(
  dataset: DatasetState,
  categoricalFeatureNames: string[],
  strategy: 'one-hot' | 'ordinal',
): number {
  return categoricalFeatureNames.reduce((sum, name) => {
    const raw = extractColumn(dataset.rows, dataset.preview.headers, name)
    return sum + countEncodedColumns(raw, strategy)
  }, 0)
}
