/** Detects unusual numeric values so they can be surfaced to the user —
 *  never silently averaged away, and never blocking. Uses the standard
 *  1.5×IQR rule: an explainable, parameter-light method appropriate for a
 *  frontend prototype (no fabricated anomaly score). */

function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0
  const pos = (sortedValues.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const next = sortedValues[base + 1]
  return next !== undefined ? sortedValues[base] + rest * (next - sortedValues[base]) : sortedValues[base]
}

export type OutlierReport = {
  count: number
  lowerBound: number
  upperBound: number
}

export function detectOutliersIQR(values: number[], multiplier = 1.5): OutlierReport {
  if (values.length === 0) return { count: 0, lowerBound: 0, upperBound: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const iqr = q3 - q1
  const lowerBound = q1 - multiplier * iqr
  const upperBound = q3 + multiplier * iqr
  const count = values.filter((v) => v < lowerBound || v > upperBound).length
  return { count, lowerBound, upperBound }
}
