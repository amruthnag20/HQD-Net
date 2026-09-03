import { cn } from '@/lib/utils/cn'
import { provenanceLabel } from '../lib/clinicalEngine'
import type { Provenance } from '../types/clinicalInterpretation'

/**
 * Subtle badge that names where a piece of information came from. Keeping these
 * visible lets the reader distinguish MODEL OUTPUT vs EXPLAINABILITY vs MEDICAL
 * EVIDENCE vs AI INTERPRETATION vs CLINICIAN REVIEW at a glance. Never relies on
 * color alone — the text label is always present.
 */
const STYLES: Record<Provenance, string> = {
  'model-output': 'border-info/40 bg-info-muted text-info',
  explainability: 'border-accent/40 bg-accent-muted text-accent',
  'medical-evidence': 'border-success/40 bg-success-muted text-success',
  'ai-interpretation': 'border-warning/40 bg-warning-muted text-warning',
  'clinically-interpreted': 'border-line-strong bg-surface-subtle text-secondary',
  'demo-data': 'border-warning/50 bg-warning-muted text-warning',
}

export function ProvenanceBadge({
  provenance,
  className,
}: {
  provenance: Provenance
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide',
        STYLES[provenance],
        className,
      )}
    >
      {provenanceLabel(provenance)}
    </span>
  )
}
