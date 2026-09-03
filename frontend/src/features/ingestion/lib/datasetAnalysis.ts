import type {
  ColumnDType,
  ColumnProfile,
  DatasetState,
  MissingValueSummary,
  TargetType,
  ValidationCheck,
} from '../types/dataset'
import type { ParsedCsv } from './csvParser'

/** Hard reject above this — protects the tab from locking up on an
 *  unreasonable upload. Soft warning kicks in well before this. */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
export const LARGE_FILE_WARNING_BYTES = 8 * 1024 * 1024

/** How many parsed rows are retained for the preview grid. Validation and
 *  column profiling still run over the full dataset — only the rendered
 *  preview is bounded, so the DOM never has to hold a huge table. */
export const MAX_PREVIEW_ROWS = 500

const MISSING_TOKENS = new Set(['', 'na', 'n/a', 'null', 'none', 'nan', '-', '?'])

const IDENTIFIER_NAME_PATTERN = /^(id|uuid|guid|identifier|record[_-]?id|patient[_-]?id|.*_id)$/i
const TARGET_NAME_PATTERN = /^(diagnosis|target|label|class|outcome|result|status|disease|risk)$/i

function isMissing(raw: string): boolean {
  return MISSING_TOKENS.has(raw.trim().toLowerCase())
}

function looksNumeric(raw: string): boolean {
  const trimmed = raw.trim()
  if (trimmed === '') return false
  return Number.isFinite(Number(trimmed))
}

function column(rows: string[][], index: number): string[] {
  return rows.map((row) => row[index] ?? '')
}

/** Profiles one column: dtype, missingness, cardinality, and the flags the
 *  ingestion UI and target-selection logic need. Pure inspection — nothing
 *  here mutates or transforms the underlying values. */
function profileColumn(name: string, values: string[], rowCount: number): ColumnProfile {
  const missing = values.filter(isMissing)
  const present = values.filter((v) => !isMissing(v))
  const missingCount = missing.length
  const missingPercent = rowCount > 0 ? (missingCount / rowCount) * 100 : 0

  const uniqueValues = new Set(present.map((v) => v.trim()))
  const uniqueCount = uniqueValues.size

  let dtype: ColumnDType
  if (present.length === 0) {
    dtype = 'empty'
  } else {
    const numericRatio = present.filter(looksNumeric).length / present.length
    dtype = numericRatio >= 0.95 ? 'numeric' : 'categorical'
  }

  const isConstant = present.length > 0 && uniqueCount <= 1
  // The all-unique-values signal is only meaningful once there are enough
  // rows that a natural continuous measurement would be expected to repeat
  // at least once by chance — below that, name-matching is the only signal.
  const MIN_ROWS_FOR_UNIQUENESS_SIGNAL = 20
  const isLikelyIdentifier =
    IDENTIFIER_NAME_PATTERN.test(name.trim()) ||
    (rowCount >= MIN_ROWS_FOR_UNIQUENESS_SIGNAL && present.length === rowCount && uniqueCount === rowCount)

  return {
    name,
    dtype,
    missingCount,
    missingPercent,
    uniqueCount,
    isConstant,
    isLikelyIdentifier,
    sampleValues: present.slice(0, 5),
  }
}

export function profileColumns(headers: string[], rows: string[][]): ColumnProfile[] {
  return headers.map((name, index) => profileColumn(name, column(rows, index), rows.length))
}

/** Suggests a target column — never auto-selects one. Prefers a
 *  clinically-named label column; falls back to a low-cardinality column
 *  that isn't an identifier, empty, or constant. */
export function suggestTargetColumn(columns: ColumnProfile[]): string | null {
  const candidates = columns.filter((c) => !c.isLikelyIdentifier && !c.isConstant && c.dtype !== 'empty')

  const byName = candidates.find((c) => TARGET_NAME_PATTERN.test(c.name.trim()))
  if (byName) return byName.name

  const lowCardinality = candidates.filter((c) => c.uniqueCount >= 2 && c.uniqueCount <= 10)
  if (lowCardinality.length > 0) return lowCardinality[lowCardinality.length - 1].name

  return null
}

export function computeTargetType(profile: ColumnProfile): TargetType {
  if (profile.dtype === 'empty') return null
  if (profile.dtype === 'categorical') return profile.uniqueCount === 2 ? 'binary' : 'multiclass'
  // numeric
  if (profile.uniqueCount <= 2) return 'binary'
  if (profile.uniqueCount <= 20) return 'multiclass'
  return 'continuous'
}

export function computeTargetClasses(headers: string[], rows: string[][], targetColumn: string): string[] {
  const index = headers.indexOf(targetColumn)
  if (index === -1) return []
  const values = column(rows, index)
    .filter((v) => !isMissing(v))
    .map((v) => v.trim())
  return Array.from(new Set(values)).sort().slice(0, 30)
}

export function computeMissingValueSummary(columns: ColumnProfile[], rowCount: number): MissingValueSummary {
  const totalCells = columns.length * rowCount
  const missingCells = columns.reduce((sum, c) => sum + c.missingCount, 0)
  const missingPercent = totalCells > 0 ? (missingCells / totalCells) * 100 : 0

  const worstColumns = columns
    .filter((c) => c.missingPercent > 0)
    .sort((a, b) => b.missingPercent - a.missingPercent)
    .slice(0, 5)
    .map((c) => ({ name: c.name, missingPercent: c.missingPercent }))

  return { totalCells, missingCells, missingPercent, worstColumns }
}

function findDuplicateNames(headers: string[]): string[] {
  const seen = new Map<string, number>()
  for (const h of headers) seen.set(h, (seen.get(h) ?? 0) + 1)
  return Array.from(seen.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
}

/** Rows whose cell count doesn't match the header count — a common sign of
 *  a genuinely malformed CSV (unescaped commas, truncated export, etc.). */
function countRaggedRows(headers: string[], rows: string[][]): number {
  return rows.filter((row) => row.length !== headers.length).length
}

export type BuildDatasetStateInput = {
  file: File
  parsed: ParsedCsv
  targetColumn: string | null
}

/** The single entry point that turns a parsed CSV + a target selection into
 *  the full ingestion report: profiles, missingness, target info, and the
 *  ordered validation checklist the UI renders. */
export function buildDatasetState({ file, parsed, targetColumn }: BuildDatasetStateInput): DatasetState {
  const { headers, rows } = parsed
  const rowCount = rows.length
  const columnCount = headers.length

  const columns = profileColumns(headers, rows)
  const numericColumns = columns.filter((c) => c.dtype === 'numeric').map((c) => c.name)
  const categoricalColumns = columns.filter((c) => c.dtype === 'categorical').map((c) => c.name)
  const identifierColumns = columns.filter((c) => c.isLikelyIdentifier).map((c) => c.name)
  const emptyColumns = columns.filter((c) => c.dtype === 'empty').map((c) => c.name)
  const constantColumns = columns.filter((c) => c.isConstant).map((c) => c.name)
  const duplicateColumnNames = findDuplicateNames(headers)

  const suggestedTargetColumn = suggestTargetColumn(columns)
  const targetProfile = targetColumn ? columns.find((c) => c.name === targetColumn) ?? null : null
  const targetType = targetProfile ? computeTargetType(targetProfile) : null
  const targetClasses = targetColumn && targetType !== 'continuous' && targetType !== null
    ? computeTargetClasses(headers, rows, targetColumn)
    : null

  const missingValueSummary = computeMissingValueSummary(columns, rowCount)
  const raggedRowCount = countRaggedRows(headers, rows)

  const checks: ValidationCheck[] = []
  checks.push({ id: 'parsed', severity: 'success', message: 'CSV successfully parsed' })
  checks.push({ id: 'rows', severity: 'success', message: `${rowCount.toLocaleString()} rows detected` })
  checks.push({ id: 'columns', severity: 'success', message: `${columnCount.toLocaleString()} columns detected` })

  if (rowCount === 0) {
    checks.push({ id: 'no-rows', severity: 'error', message: 'The dataset has headers but no data rows.' })
  }

  if (duplicateColumnNames.length > 0) {
    checks.push({
      id: 'duplicate-columns',
      severity: 'error',
      message: `Duplicate column names found: ${duplicateColumnNames.join(', ')}`,
    })
  }

  if (raggedRowCount > 0) {
    const raggedRatio = rowCount > 0 ? raggedRowCount / rowCount : 1
    checks.push({
      id: 'ragged-rows',
      severity: raggedRatio > 0.1 ? 'error' : 'warning',
      message: `${raggedRowCount.toLocaleString()} row(s) have a different number of fields than the header row.`,
    })
  }

  if (identifierColumns.length > 0) {
    checks.push({
      id: 'identifiers-detected',
      severity: 'success',
      message: `Identifier column(s) detected and excluded from model features automatically: ${identifierColumns.join(', ')}.`,
    })
  }

  if (emptyColumns.length > 0) {
    checks.push({
      id: 'empty-columns',
      severity: 'warning',
      message: `${emptyColumns.length} column(s) contain no data and will be excluded automatically: ${emptyColumns.join(', ')}`,
    })
  }

  if (constantColumns.length > 0) {
    checks.push({
      id: 'constant-columns',
      severity: 'warning',
      message: `${constantColumns.length} column(s) have a single repeated value and will be excluded automatically: ${constantColumns.join(', ')}`,
    })
  }

  if (missingValueSummary.missingCells > 0) {
    checks.push({
      id: 'missing-values',
      severity: 'warning',
      message: `${missingValueSummary.missingPercent.toFixed(1)}% of cells contain missing values — handled during preprocessing.`,
    })
  }

  if (!targetColumn) {
    checks.push({
      id: 'target-missing',
      severity: 'success',
      message: 'No target column selected — optional here, used later for supervised model training.',
    })
  } else if (!targetProfile || targetProfile.dtype === 'empty') {
    checks.push({ id: 'target-invalid', severity: 'error', message: `Target column "${targetColumn}" has no data.` })
  } else if (targetProfile.isConstant) {
    checks.push({
      id: 'target-constant',
      severity: 'error',
      message: `Target column "${targetColumn}" has no meaningful variation (a single repeated value).`,
    })
  } else if (targetProfile.isLikelyIdentifier) {
    checks.push({
      id: 'target-identifier',
      severity: 'error',
      message: `Target column "${targetColumn}" looks like a record identifier, not a label.`,
    })
  } else {
    checks.push({ id: 'target-valid', severity: 'success', message: `Target column "${targetColumn}" selected.` })
  }

  if (file.size > LARGE_FILE_WARNING_BYTES) {
    checks.push({
      id: 'large-file',
      severity: 'warning',
      message: `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB — parsing and preview may take a moment.`,
    })
  }

  const hasErrors = checks.some((c) => c.severity === 'error')
  const hasWarnings = checks.some((c) => c.severity === 'warning')
  if (!hasErrors) {
    checks.push({
      id: 'structurally-valid',
      severity: 'success',
      message: 'Dataset is structurally valid.',
    })
  }

  const validationStatus = hasErrors ? 'invalid' : hasWarnings ? 'valid-with-warnings' : 'valid'

  const truncated = rows.length > MAX_PREVIEW_ROWS
  const previewRows = truncated ? rows.slice(0, MAX_PREVIEW_ROWS) : rows

  return {
    file,
    datasetName: file.name,
    rowCount,
    columnCount,
    rows,
    columns,
    numericColumns,
    categoricalColumns,
    identifierColumns,
    emptyColumns,
    constantColumns,
    duplicateColumnNames,
    targetColumn,
    suggestedTargetColumn,
    targetType,
    targetClasses,
    missingValueSummary,
    validationChecks: checks,
    validationStatus,
    preview: { headers, rows: previewRows, truncated },
  }
}
