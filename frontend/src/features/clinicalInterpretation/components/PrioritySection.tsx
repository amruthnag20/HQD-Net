import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { formatProbabilityPercent, getEvidenceStatus } from '../lib/clinicalEngine'
import { ClinicalSection } from './ClinicalSection'
import { PriorityBadge } from './PriorityBadge'

/**
 * Review priority (Phase 6, Section 20) plus an explicit side-by-side of the four
 * distinct measures (Section 21 & 91): model probability, evidence strength,
 * interpretation confidence, and review priority. These are never merged into a
 * single "confidence score".
 */
export function PrioritySection() {
  const { interpretation } = useClinicalInterpretation()
  const probs = interpretation.modelProbabilities
  const predIsHigh = interpretation.predictionLabel === 'High Risk'
  const modelProb = probs ? formatProbabilityPercent(predIsHigh ? probs['High Risk'] : probs.Normal) : '—'
  const evidenceStatus = getEvidenceStatus(interpretation.evidence)
  const conf = interpretation.interpretationConfidence

  const metrics = [
    { label: 'Model probability', value: modelProb, hint: 'Model output' },
    {
      label: 'Evidence strength',
      value:
        evidenceStatus === 'unavailable'
          ? 'Not available'
          : `${interpretation.evidence.length} item${interpretation.evidence.length === 1 ? '' : 's'}`,
      hint: 'Medical evidence',
    },
    {
      label: 'Interpretation confidence',
      value: conf != null && Number.isFinite(conf) ? formatProbabilityPercent(conf, 0) : 'Not provided',
      hint: 'AI interpretation',
    },
  ]

  return (
    <ClinicalSection
      id="priority"
      title="Review Priority"
      actions={<PriorityBadge priority={interpretation.priority} />}
    >
      <p className="mb-3 text-xs text-muted">
        These are distinct measures and must not be read as one number. Priority is supplied by the
        clinical rules / backend, not inferred by this interface.
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-line-subtle bg-surface-subtle p-3">
            <dt className="text-xs text-muted">{m.label}</dt>
            <dd className="mt-1 text-lg font-semibold text-primary">{m.value}</dd>
            <p className="mt-0.5 text-xs text-muted">{m.hint}</p>
          </div>
        ))}
      </dl>
    </ClinicalSection>
  )
}
