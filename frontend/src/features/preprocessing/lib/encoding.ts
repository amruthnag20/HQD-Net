export type EncodedColumn = { name: string; values: number[] }

/** One binary (0/1) column per distinct category, sorted for deterministic
 *  output order. This is the dimensionality-expanding encoding the UI
 *  surfaces explicitly (section 9 of the Phase 2 spec). */
export function oneHotEncode(columnName: string, values: string[]): EncodedColumn[] {
  const categories = Array.from(new Set(values)).sort()
  return categories.map((category) => ({
    name: `${columnName}__${category}`,
    values: values.map((v) => (v === category ? 1 : 0)),
  }))
}

/** A single integer-coded column, categories sorted for a stable mapping.
 *  Does not imply a meaningful ordering unless the source data already had
 *  one — offered as an explicit lower-dimensionality alternative to one-hot. */
export function ordinalEncode(columnName: string, values: string[]): EncodedColumn[] {
  const categories = Array.from(new Set(values)).sort()
  const index = new Map(categories.map((c, i) => [c, i]))
  return [
    {
      name: `${columnName}__ordinal`,
      values: values.map((v) => index.get(v) ?? 0),
    },
  ]
}

export function countEncodedColumns(values: string[], strategy: 'one-hot' | 'ordinal'): number {
  if (strategy === 'ordinal') return 1
  return new Set(values).size
}
