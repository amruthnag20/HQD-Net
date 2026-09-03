import { usePatientReport } from '../hooks/usePatientReport'
import { formatContribution } from '@/features/clinicalInterpretation/lib/clinicalEngine'

/**
 * Explainability summary — a concise report version of Phase 5. Summarizes rather
 * than reproducing the interactive workspace.
 */
export function ExplainabilitySummary() {
  const { report } = usePatientReport()
  const e = report.explainability

  if (!e.available) {
    return <p className="text-sm text-muted">Explainability data is not available for this analysis.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">Method</dt>
          <dd className="text-sm text-secondary">{e.method ?? 'Not specified'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Sensitivity</dt>
          <dd className="text-sm text-secondary">
            {e.sensitivityAvailable ? 'Available' : 'Not available'}
          </dd>
        </div>
      </dl>

      {e.quantumMetadata && (
        <p className="font-mono text-xs text-muted">
          Quantum: {e.quantumMetadata.qubits ?? '—'} qubits · {e.quantumMetadata.layers ?? '—'} layers ·{' '}
          {e.quantumMetadata.device ?? '—'}
        </p>
      )}

      <div>
        <p className="mb-1.5 text-xs text-muted">
          Top Contributing Features
        </p>
        <ul className="divide-y divide-line-subtle rounded-lg border border-line-subtle">
          {e.topFeatures.map((f) => (
            <li key={f.featureName} className="flex items-center justify-between px-3 py-1.5">
              <span className="text-sm text-primary">{f.featureName}</span>
              <span className="flex items-center gap-2">
                {f.direction && (
                  <span className="text-xs text-muted">
                    {f.direction}
                  </span>
                )}
                <span
                  className={
                    f.contribution != null && f.contribution >= 0
                      ? 'font-mono text-xs font-medium text-success'
                      : 'font-mono text-xs font-medium text-danger'
                  }
                >
                  {formatContribution(f.contribution)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
