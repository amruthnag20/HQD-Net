/** Phase 1 — Data Ingestion Foundation: the validated-dataset contract that
 *  Phase 2 (classical preprocessing) will eventually consume. Nothing in
 *  this phase transforms the data — only inspects and validates it. */

export type ColumnDType = 'numeric' | 'categorical' | 'empty'

export type ColumnProfile = {
  name: string
  dtype: ColumnDType
  missingCount: number
  missingPercent: number
  uniqueCount: number
  /** True when every non-missing value is identical — no signal. */
  isConstant: boolean
  /** True when the column looks like a record identifier (near-unique
   *  values and/or an id-like name) rather than a clinical feature. */
  isLikelyIdentifier: boolean
  /** A handful of raw sample values, for the preview/summary UI. */
  sampleValues: string[]
}

export type TargetType = 'binary' | 'multiclass' | 'continuous' | null

export type ValidationSeverity = 'error' | 'warning' | 'success'

export type ValidationCheck = {
  id: string
  severity: ValidationSeverity
  message: string
}

export type ValidationStatus = 'invalid' | 'valid-with-warnings' | 'valid'

export type DatasetPreview = {
  /** Column headers, in original CSV order. */
  headers: string[]
  /** Every parsed data row (capped upstream for very large files) — the
   *  preview UI itself paginates over this rather than rendering it all. */
  rows: string[][]
  /** True if `rows` was truncated relative to the CSV's real row count. */
  truncated: boolean
}

export type MissingValueSummary = {
  totalCells: number
  missingCells: number
  missingPercent: number
  /** Columns whose missingness is high enough to call out individually. */
  worstColumns: { name: string; missingPercent: number }[]
}

export type DatasetState = {
  file: File
  datasetName: string
  rowCount: number
  columnCount: number
  columns: ColumnProfile[]
  numericColumns: string[]
  categoricalColumns: string[]
  identifierColumns: string[]
  emptyColumns: string[]
  constantColumns: string[]
  duplicateColumnNames: string[]
  targetColumn: string | null
  /** A detected candidate, offered as a suggestion — never auto-applied. */
  suggestedTargetColumn: string | null
  targetType: TargetType
  targetClasses: string[] | null
  missingValueSummary: MissingValueSummary
  validationChecks: ValidationCheck[]
  validationStatus: ValidationStatus
  preview: DatasetPreview
}

/** What Phase 2 actually needs handed forward — the file plus the
 *  ingestion decisions made about it, not the whole inspection report. */
export type ValidatedDatasetHandoff = {
  file: File
  datasetName: string
  targetColumn: string
  rowCount: number
  columnCount: number
}
