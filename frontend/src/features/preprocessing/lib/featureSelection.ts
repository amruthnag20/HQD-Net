import { computeMeanStd } from './scaling'

export type NamedColumn = { name: string; values: number[] }

/** Population variance — matches the std computed in scaling.ts. */
export function computeVariance(values: number[]): number {
  return computeMeanStd(values).std ** 2
}

/** Drops numeric columns whose raw-scale variance falls at or below the
 *  threshold. Threshold 0 keeps everything (already-constant columns are
 *  excluded earlier, during identifier/constant detection). */
export function selectByVarianceThreshold(columns: NamedColumn[], threshold: number): string[] {
  if (threshold <= 0) return []
  return columns.filter((c) => computeVariance(c.values) <= threshold).map((c) => c.name)
}

export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0
  const { mean: meanA, std: stdA } = computeMeanStd(a.slice(0, n))
  const { mean: meanB, std: stdB } = computeMeanStd(b.slice(0, n))
  if (stdA === 0 || stdB === 0) return 0
  let covariance = 0
  for (let i = 0; i < n; i++) covariance += (a[i] - meanA) * (b[i] - meanB)
  covariance /= n
  return covariance / (stdA * stdB)
}

/** For each pair of numeric columns whose |correlation| exceeds the
 *  threshold, drops the later column (in input order) as redundant. A
 *  column already dropped by an earlier pair is not re-evaluated.
 *  Threshold 1 (or above) disables the filter. */
export function selectByCorrelationFilter(columns: NamedColumn[], threshold: number): string[] {
  if (threshold >= 1) return []
  const dropped = new Set<string>()
  for (let i = 0; i < columns.length; i++) {
    if (dropped.has(columns[i].name)) continue
    for (let j = i + 1; j < columns.length; j++) {
      if (dropped.has(columns[j].name)) continue
      const corr = pearsonCorrelation(columns[i].values, columns[j].values)
      if (Math.abs(corr) > threshold) dropped.add(columns[j].name)
    }
  }
  return Array.from(dropped)
}
