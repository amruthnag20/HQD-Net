import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { formatProbabilityPercent } from '../lib/clinicalEngine'
import { ClinicalSection, ClinicalEmptyState } from './ClinicalSection'
import { ProvenanceBadge } from './ProvenanceBadge'
import type { InterpretationSource } from '../types/clinicalInterpretation'

const SOURCE_LABEL: Record<InterpretationSource, string> = {
  backend: 'Backend generated',
  'demo-fixture': 'DEMO / DEVELOPMENT DATA',
  unavailable: 'Unavailable',
  pending: 'Pending',
}

const NARRATIVE_SECTIONS: { key: keyof ReturnType<typeof useSections>; title: string }[] = [
  { key: 'summary', title: 'Summary' },
  { key: 'keyFindings', title: 'Key Findings' },
  { key: 'riskInterpretation', title: 'Risk Interpretation' },
  { key: 'evidenceContext', title: 'Evidence Context' },
  { key: 'recommendedNextSteps', title: 'Recommended Next Steps' },
]

function useSections() {
  return useClinicalInterpretation().interpretation.narrative
}

/**
 * Clinical interpretation text (Phase 6, Section 14–16). Renders ONLY the structured
 * sections the backend supplied — never invents missing prose. The generation source
 * is always labelled; demo content is explicitly marked.
 */
export function InterpretationNarrative() {
  const { interpretation } = useClinicalInterpretation()
  const narrative = interpretation.narrative
  const source = interpretation.metadata.source
  const present = NARRATIVE_SECTIONS.filter((s) => {
    const v = narrative[s.key]
    return v != null && v.trim().length > 0
  })
  const conf = interpretation.interpretationConfidence

  return (
    <ClinicalSection
      id="interpretation"
      title="Clinical Interpretation"
      provenance="ai-interpretation"
      actions={
        <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-xs text-muted">
          {SOURCE_LABEL[source]}
        </span>
      }
    >
      {source === 'demo-fixture' && (
        <div className="mb-3">
          <ProvenanceBadge provenance="demo-data" />
        </div>
      )}

      {present.length === 0 ? (
        <ClinicalEmptyState message="Clinical language generation unavailable. Interpretation text will appear here once the medical-knowledge backend is connected." />
      ) : (
        <div className="flex flex-col gap-3">
          {present.map((s) => (
            <div key={s.key}>
              <h3 className="text-xs text-muted">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-secondary">{narrative[s.key]}</p>
            </div>
          ))}

          {conf != null && Number.isFinite(conf) && (
            <p className="mt-1 font-mono text-[11px] text-muted">
              Interpretation confidence: {formatProbabilityPercent(conf, 0)} — a measure of the
              language layer's certainty, distinct from model probability and evidence strength.
            </p>
          )}
        </div>
      )}
    </ClinicalSection>
  )
}
