import { cn } from '@/lib/utils/cn'
import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { formatContribution, strengthLabel } from '../lib/clinicalEngine'
import { ClinicalSection, ClinicalEmptyState } from './ClinicalSection'
import { ProvenanceBadge } from './ProvenanceBadge'

/**
 * Risk factors (Phase 6, Section 12). Classification as a clinical risk factor is a
 * backend responsibility — never inferred from attribution magnitude. When the
 * backend supplies none, a clear "classification unavailable" state is shown.
 */
export function RiskFactorList() {
  const { interpretation } = useClinicalInterpretation()
  const riskFactors = interpretation.riskFactors

  return (
    <ClinicalSection id="risk-factors" title="Risk Factors">
      {riskFactors.length === 0 ? (
        <ClinicalEmptyState message="Clinical risk-factor classification unavailable. Risk factors are supplied by the medical knowledge layer, not inferred from model attribution." />
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {riskFactors.map((r) => (
            <li key={r.id} className="rounded-lg border border-line-subtle bg-surface p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">{r.name}</p>
                <ProvenanceBadge provenance={r.provenance} />
              </div>
              {r.value && <p className="mt-0.5 text-sm text-secondary">{r.value}</p>}
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">
                {r.contribution != null && (
                  <div className="flex gap-1">
                    <dt className="text-muted">Model contribution:</dt>
                    <dd
                      className={cn(
                        'font-mono font-medium',
                        r.contribution >= 0 ? 'text-success' : 'text-danger',
                      )}
                    >
                      {formatContribution(r.contribution)}
                    </dd>
                  </div>
                )}
                <div className="flex gap-1">
                  <dt className="text-muted">Evidence strength:</dt>
                  <dd>{strengthLabel(r.evidenceStrength)}</dd>
                </div>
              </dl>
              {r.status && <p className="mt-1.5 text-xs text-muted">{r.status}</p>}
            </li>
          ))}
        </ul>
      )}
    </ClinicalSection>
  )
}
