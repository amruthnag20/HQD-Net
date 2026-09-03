import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { getEvidenceForFinding } from '../lib/clinicalEngine'
import { ClinicalSection, ClinicalEmptyState } from './ClinicalSection'
import { EvidenceCard } from './EvidenceCard'

/**
 * Medical evidence section (Phase 6, Section 8). Renders the evidence cards the
 * backend/RAG layer supplied, or a clean empty state. Cross-highlights cards that
 * relate to the currently-selected finding.
 */
export function EvidenceList() {
  const { interpretation, selectedFindingId, selectedEvidenceId, setSelectedEvidenceId } =
    useClinicalInterpretation()
  const evidence = interpretation.evidence

  const relatedIds =
    selectedFindingId != null
      ? new Set(getEvidenceForFinding(selectedFindingId, evidence).map((e) => e.id))
      : null

  return (
    <ClinicalSection id="evidence" title="Medical Evidence" provenance="medical-evidence">
      {evidence.length === 0 ? (
        <ClinicalEmptyState message="Medical evidence retrieval is not available for this analysis." />
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            Related evidence indicates association with model findings. It does not prove the model
            output is correct.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {evidence.map((e) => (
              <EvidenceCard
                key={e.id}
                evidence={e}
                highlighted={
                  (relatedIds != null && relatedIds.has(e.id)) || selectedEvidenceId === e.id
                }
                onHover={setSelectedEvidenceId}
              />
            ))}
          </div>
        </>
      )}
    </ClinicalSection>
  )
}
