import { cn } from '@/lib/utils/cn'
import { usePatientReport } from '../hooks/usePatientReport'
import type { ReviewerStatus } from '../types/patientReport'

const STYLES: Record<ReviewerStatus, { cls: string; label: string }> = {
  pending: { cls: 'border-line-strong bg-surface-subtle text-muted', label: 'Review Pending' },
  reviewed: { cls: 'border-success/40 bg-success-muted text-success', label: 'Reviewed' },
  'needs-revision': { cls: 'border-warning/50 bg-warning-muted text-warning', label: 'Needs Revision' },
}

export function ReviewStatusBadge() {
  const { report } = usePatientReport()
  const s = STYLES[report.feedback.reviewerStatus]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wide',
        s.cls,
      )}
    >
      {s.label}
    </span>
  )
}
