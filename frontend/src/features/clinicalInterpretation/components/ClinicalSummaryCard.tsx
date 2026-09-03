import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import {
  formatProbabilityPercent,
  getClinicalInterpretationStatus,
  interpretationStatusMessage,
} from '../lib/clinicalEngine'
import { ProvenanceBadge } from './ProvenanceBadge'
import { PriorityBadge } from './PriorityBadge'

const STATUS_TONE: Record<string, string> = {
  available: 'text-success',
  partial: 'text-warning',
  unavailable: 'text-muted',
  error: 'text-danger',
  loading: 'text-info',
  not_started: 'text-muted',
}

/**
 * Prominent clinical summary card (Phase 6, Section 1). Deliberately separates the
 * MODEL OUTPUT block (prediction + probability) from the interpretation status and
 * the review priority — these are distinct concepts and never merged.
 */
export function ClinicalSummaryCard() {
  const { interpretation } = useClinicalInterpretation()
  const status = getClinicalInterpretationStatus(interpretation)
  const probs = interpretation.modelProbabilities
  const predIsHigh = interpretation.predictionLabel === 'High Risk'
  const predProb = probs
    ? formatProbabilityPercent(predIsHigh ? probs['High Risk'] : probs.Normal)
    : '—'

  return (
    <section
      aria-label="Clinical summary"
      className="grid gap-px overflow-hidden rounded-xl border border-line-subtle bg-line-subtle sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* Patient / sample */}
      <div className="bg-surface p-5">
        <p className="text-xs text-muted">Patient / Sample</p>
        <p className="mt-1 text-xl font-semibold text-primary">{interpretation.sampleId}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{interpretation.datasetName}</p>
      </div>

      {/* Model output */}
      <div className="bg-surface p-5">
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-muted">Model Output</p>
          <ProvenanceBadge provenance="model-output" />
        </div>
        <p className="mt-1 text-xl font-semibold text-primary">
          {interpretation.predictionLabel ?? '—'}
        </p>
        <p className="mt-0.5 text-xs text-muted">Model probability {predProb}</p>
      </div>

      {/* Priority */}
      <div className="bg-surface p-5">
        <p className="text-xs text-muted">Review Priority</p>
        <div className="mt-1.5">
          <PriorityBadge priority={interpretation.priority} />
        </div>
      </div>

      {/* Interpretation status */}
      <div className="bg-surface p-5">
        <p className="text-xs text-muted">Interpretation Status</p>
        <p className={`mt-1 text-sm font-semibold ${STATUS_TONE[status] ?? 'text-secondary'}`}>
          {interpretationStatusMessage(status)}
        </p>
      </div>
    </section>
  )
}
