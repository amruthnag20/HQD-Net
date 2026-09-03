import { cn } from '@/lib/utils/cn'
import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { findingCategoryLabel, formatContribution } from '../lib/clinicalEngine'
import { ClinicalSection, ClinicalEmptyState } from './ClinicalSection'
import { ProvenanceBadge } from './ProvenanceBadge'

/**
 * Key clinical findings (Phase 6, Section 13). Each finding shows its category and
 * provenance so the reader can distinguish model-derived vs evidence-derived vs
 * clinically-interpreted signals. Selecting a finding cross-highlights related
 * evidence in the Medical Evidence section.
 */
export function FindingsList() {
  const { interpretation, selectedFindingId, setSelectedFindingId } = useClinicalInterpretation()
  const findings = interpretation.keyFindings

  return (
    <ClinicalSection id="findings" title="Key Clinical Findings">
      {findings.length === 0 ? (
        <ClinicalEmptyState message="No structured clinical findings are available for this analysis." />
      ) : (
        <ul className="flex flex-col gap-2">
          {findings.map((f) => {
            const selected = selectedFindingId === f.id
            const hasEvidence = f.relatedEvidenceIds.length > 0
            return (
              <li key={f.id}>
                <button
                  onClick={() => setSelectedFindingId(selected ? null : f.id)}
                  aria-pressed={selected}
                  className={cn(
                    'focus-ring w-full rounded-lg border p-3 text-left transition-colors',
                    selected
                      ? 'border-accent bg-accent/5'
                      : 'border-line-subtle bg-surface hover:border-accent/50',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-surface-subtle px-1.5 py-0.5 text-xs text-secondary">
                      {findingCategoryLabel(f.category)}
                    </span>
                    <ProvenanceBadge provenance={f.provenance} />
                    {f.contribution != null && (
                      <span
                        className={cn(
                          'font-mono text-[11px] font-medium',
                          f.contribution >= 0 ? 'text-success' : 'text-danger',
                        )}
                      >
                        {formatContribution(f.contribution)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-primary">{f.label}</p>
                  {f.description && <p className="mt-0.5 text-xs text-muted">{f.description}</p>}
                  {hasEvidence && (
                    <p className="mt-1.5 text-xs font-medium text-accent">
                      {f.relatedEvidenceIds.length} related evidence item
                      {f.relatedEvidenceIds.length === 1 ? '' : 's'}
                      {selected ? ' — highlighted below' : ' — click to highlight'}
                    </p>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </ClinicalSection>
  )
}
