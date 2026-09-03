/** Same missing-token vocabulary Phase 1 ingestion uses for column
 *  profiling — kept local rather than imported so Phase 2 doesn't reach
 *  into Phase 1's private parsing internals. */
const MISSING_TOKENS = new Set(['', 'na', 'n/a', 'null', 'none', 'nan', '-', '?'])

export function isMissingToken(raw: string): boolean {
  return MISSING_TOKENS.has(raw.trim().toLowerCase())
}

/** Extracts one column's raw values across all rows, by header index. */
export function extractColumn(rows: string[][], headers: string[], name: string): string[] {
  const index = headers.indexOf(name)
  if (index === -1) return []
  return rows.map((row) => row[index] ?? '')
}

/** Parses a raw column into numeric slots — missing tokens and anything
 *  non-numeric become null so imputation can fill them in. */
export function parseNumericColumn(raw: string[]): (number | null)[] {
  return raw.map((v) => {
    if (isMissingToken(v)) return null
    const n = Number(v.trim())
    return Number.isFinite(n) ? n : null
  })
}

/** Parses a raw column into categorical slots — missing tokens become
 *  null, everything else is trimmed and kept as-is. */
export function parseCategoricalColumn(raw: string[]): (string | null)[] {
  return raw.map((v) => (isMissingToken(v) ? null : v.trim()))
}
