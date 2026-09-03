import { useExplainability } from '../hooks/useExplainability'

/** Cohort-level feature influence — shown only in the "whole cohort" scope. */
export function GlobalExplanation() {
  const { result, scope } = useExplainability()
  if (scope !== 'global') return null

  const { globalImportance } = result

  if (!globalImportance || globalImportance.length === 0) {
    return (
      <section aria-label="Global feature influence" className="rounded-2xl border border-line-subtle bg-surface p-6">
        <h2 className="text-sm font-semibold text-primary">Global feature influence</h2>
        <p className="mt-2 text-sm text-muted">
          Global explainability requires cohort-level explanation data. Run a full evaluation to generate
          mean attribution scores.
        </p>
      </section>
    )
  }

  const maxMac = Math.max(...globalImportance.map((f) => f.meanAbsoluteContribution ?? 0))

  return (
    <section aria-label="Global feature influence" className="rounded-2xl border border-line-subtle bg-surface p-6">
      <h2 className="text-sm font-semibold text-primary">Global feature influence</h2>
      <p className="mt-0.5 mb-4 text-xs text-muted">
        Mean absolute attribution across the evaluation cohort — which features the model consistently
        responds to, not individual patient evidence.
      </p>

      <ul>
        {globalImportance.map((g) => {
          const barPct = maxMac > 0 && g.meanAbsoluteContribution != null ? (g.meanAbsoluteContribution / maxMac) * 100 : 0
          return (
            <li key={g.featureName} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-b-0">
              <span className="w-5 shrink-0 text-right text-xs text-muted">{g.rank ?? '—'}</span>
              <span className="w-32 shrink-0 truncate font-mono text-sm font-medium text-primary sm:w-40">
                {g.featureName}
              </span>
              <div className="flex flex-1 items-center gap-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-subtle">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${barPct}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-xs text-secondary">
                  {g.meanAbsoluteContribution !== null ? g.meanAbsoluteContribution.toFixed(3) : '—'}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
