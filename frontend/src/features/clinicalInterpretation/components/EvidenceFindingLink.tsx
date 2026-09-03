import { ArrowRight } from 'lucide-react'
import { formatContribution } from '../lib/clinicalEngine'
import { ClinicalSection, ClinicalEmptyState } from './ClinicalSection'
import type { ClinicalFinding, MedicalEvidence } from '../types/clinicalInterpretation'

/**
 * Reusable Evidence ↔ Finding relationship map (Phase 6, Section 11 & 51). Shows,
 * for each finding, the related evidence items — making the chain MODEL OUTPUT →
 * EXPLAINABILITY → MEDICAL EVIDENCE explicit. Reused (compact) by the report.
 */
export function EvidenceFindingLink({
  findings,
  evidence,
  compact = false,
}: {
  findings: ClinicalFinding[]
  evidence: MedicalEvidence[]
  compact?: boolean
}) {
  const linked = findings.filter((f) => f.relatedEvidenceIds.length > 0)

  const body =
    linked.length === 0 ? (
      <ClinicalEmptyState message="No evidence-to-finding relationships are available for this analysis." />
    ) : (
      <ul className="flex flex-col gap-2.5">
        {linked.map((f) => {
          const related = evidence.filter((e) => f.relatedEvidenceIds.includes(e.id))
          return (
            <li
              key={f.id}
              className="grid items-center gap-2 rounded-lg border border-line-subtle bg-surface p-3 sm:grid-cols-[1fr_auto_1.4fr]"
            >
              <div className="min-w-0">
                <p className="text-xs text-muted">Model Finding</p>
                <p className="truncate text-sm font-medium text-primary">{f.label}</p>
                {f.contribution != null && (
                  <p className="font-mono text-[11px] text-secondary">
                    Model contribution {formatContribution(f.contribution)}
                  </p>
                )}
              </div>
              <ArrowRight className="hidden size-4 shrink-0 text-muted sm:block" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted">
                  Related Evidence
                </p>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {related.map((e) => (
                    <span
                      key={e.id}
                      className="rounded bg-success-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-success"
                    >
                      {e.citationLabel}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    )

  if (compact) return body

  return (
    <ClinicalSection
      id="evidence-links"
      title="Evidence ↔ Finding Connections"
      eyebrow="Model output → Explainability → Medical evidence"
    >
      {body}
    </ClinicalSection>
  )
}
