export function computeMinMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 }
  let min = values[0]
  let max = values[0]
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max }
}

export function computeMeanStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 }
  const m = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length
  return { mean: m, std: Math.sqrt(variance) }
}

/** z = (x - mean) / std. A zero-variance column maps to all zeros rather
 *  than dividing by zero. */
export function standardize(values: number[]): number[] {
  const { mean, std } = computeMeanStd(values)
  if (std === 0) return values.map(() => 0)
  return values.map((v) => (v - mean) / std)
}

/** x' = (x - min) / (max - min). A zero-range column maps to all zeros. */
export function minMaxScale(values: number[]): number[] {
  const { min, max } = computeMinMax(values)
  const range = max - min
  if (range === 0) return values.map(() => 0)
  return values.map((v) => (v - min) / range)
}

export function scaleColumn(values: number[], strategy: 'standardization' | 'min-max'): number[] {
  return strategy === 'min-max' ? minMaxScale(values) : standardize(values)
}
