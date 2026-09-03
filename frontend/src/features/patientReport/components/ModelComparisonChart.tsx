import type { ReportModelRow } from '../types/patientReport'

/**
 * Small bar comparison of the models that actually ran. Shows exactly the
 * rows the comparison adapter produced — never a fixed number of bars or
 * invented competitor models.
 */
export function ModelComparisonChart({ rows }: { rows: (ReportModelRow | null)[] }) {
  const present = rows.filter((r): r is ReportModelRow => r != null)

  if (present.length === 0) {
    return <p className="text-sm text-muted">Model comparison data is not available for this analysis.</p>
  }

  const values = present.map((r) => parseFloat(r.probabilityPercent) || 0)
  const max = Math.max(100, ...values)

  return (
    <div className="flex h-40 items-end justify-around gap-4 px-2">
      {present.map((r, i) => {
        const pct = values[i]
        const heightPct = max > 0 ? (pct / max) * 100 : 0
        return (
          <div key={r.modelName} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-sm font-semibold text-primary">{pct.toFixed(0)}%</span>
            <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-line-subtle">
              <div
                className={i === 0 ? 'w-full rounded-md bg-accent transition-all' : 'w-full rounded-md bg-baby transition-all'}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-center text-xs leading-tight text-muted">{r.modelName}</span>
          </div>
        )
      })}
    </div>
  )
}
