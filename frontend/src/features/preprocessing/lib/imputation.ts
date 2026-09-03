import type { CategoricalImputeStrategy, NumericImputeStrategy } from '../types/preprocessing'

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Most frequent value, ties broken by first occurrence. */
export function mostFrequent(values: string[]): string {
  if (values.length === 0) return ''
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best = values[0]
  let bestCount = 0
  for (const v of values) {
    const count = counts.get(v) ?? 0
    if (count > bestCount) {
      best = v
      bestCount = count
    }
  }
  return best
}

export function computeNumericFillValue(present: number[], strategy: NumericImputeStrategy): number {
  return strategy === 'mean' ? mean(present) : median(present)
}

export function computeCategoricalFillValue(present: string[], _strategy: CategoricalImputeStrategy): string {
  return mostFrequent(present)
}

/** Fills missing numeric slots (null) with the given strategy's fill value.
 *  Never mutates the input array. */
export function imputeNumericColumn(values: (number | null)[], strategy: NumericImputeStrategy): number[] {
  const present = values.filter((v): v is number => v !== null)
  const fillValue = computeNumericFillValue(present, strategy)
  return values.map((v) => (v === null ? fillValue : v))
}

/** Fills missing categorical slots (null) with the given strategy's fill
 *  value. Never mutates the input array. */
export function imputeCategoricalColumn(values: (string | null)[], strategy: CategoricalImputeStrategy): string[] {
  const present = values.filter((v): v is string => v !== null)
  const fillValue = computeCategoricalFillValue(present, strategy)
  return values.map((v) => (v === null ? fillValue : v))
}
