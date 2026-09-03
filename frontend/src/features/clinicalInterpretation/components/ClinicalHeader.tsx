import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { formatProbabilityPercent, getClinicalInterpretationStatus } from '../lib/clinicalEngine'

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  loading: 'Loading',
  available: 'Available',
  partial: 'Partial',
  unavailable: 'Unavailable',
  error: 'Error',
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="truncate text-sm font-medium text-primary">{value}</dd>
    </div>
  )
}

export function ClinicalHeader() {
  const { interpretation } = useClinicalInterpretation()
  const status = getClinicalInterpretationStatus(interpretation)
  const probs = interpretation.modelProbabilities
  const predProb =
    probs && interpretation.predictionLabel === 'High Risk'
      ? formatProbabilityPercent(probs['High Risk'])
      : probs
        ? formatProbabilityPercent(probs.Normal)
        : '—'

  return (
    <header>
      <p className="text-xs text-muted">
        Phase 6 — Clinical Interpretation
      </p>
      <h1 className="mt-1 font-display text-3xl text-primary">Clinical Interpretation</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-secondary">
        Translate model findings and supporting medical evidence into a structured clinical summary.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-line-subtle bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6">
        <ContextItem label="Patient / Sample" value={interpretation.sampleId} />
        <ContextItem label="Dataset" value={interpretation.datasetName} />
        <ContextItem label="Model" value={interpretation.selectedModel} />
        <ContextItem label="Prediction" value={interpretation.predictionLabel ?? '—'} />
        <ContextItem label="Model probability" value={predProb} />
        <ContextItem label="Analysis status" value={STATUS_LABEL[status] ?? status} />
      </dl>
    </header>
  )
}
