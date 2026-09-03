import { Info } from 'lucide-react'

/**
 * Concise, non-alarmist clinical safety boundary. Shown on both the interpretation
 * workspace and the report.
 */
export function ClinicalDisclaimer() {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-lg border border-line-subtle bg-surface-subtle px-4 py-3 text-xs leading-relaxed text-secondary"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
      <p>
        AI-generated interpretation is intended to support clinical review and does not replace
        professional medical judgment. Model probability is not a measure of medical certainty, and
        supporting evidence indicates association rather than validation of the model output.
      </p>
    </div>
  )
}
