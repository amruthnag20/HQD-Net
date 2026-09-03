import { cn } from '@/lib/utils/cn'
import { priorityLabel } from '../lib/clinicalEngine'
import type { ClinicalPriority } from '../types/clinicalInterpretation'

/**
 * Review priority badge. Priority is never inferred by the frontend — this only
 * renders a value supplied by the backend / fixture. Distinct visual treatment
 * from model probability, evidence strength, and interpretation confidence.
 */
const STYLES: Record<ClinicalPriority, string> = {
  low: 'border-success/40 bg-success-muted text-success',
  medium: 'border-info/40 bg-info-muted text-info',
  high: 'border-warning/50 bg-warning-muted text-warning',
  urgent: 'border-danger/50 bg-danger-muted text-danger',
  review: 'border-accent/40 bg-accent-muted text-accent',
  undetermined: 'border-line-strong bg-surface-subtle text-muted',
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: ClinicalPriority
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider',
        STYLES[priority],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {priorityLabel(priority)}
    </span>
  )
}
