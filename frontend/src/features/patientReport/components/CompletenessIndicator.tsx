import { Check, CircleDashed, Minus } from 'lucide-react'
import { usePatientReport } from '../hooks/usePatientReport'
import { completenessLabel } from '../lib/reportEngine'
import type { ReportSectionAvailability } from '../types/patientReport'

const ICON: Record<ReportSectionAvailability, { icon: typeof Check; cls: string }> = {
  complete: { icon: Check, cls: 'text-success' },
  partial: { icon: CircleDashed, cls: 'text-warning' },
  pending: { icon: CircleDashed, cls: 'text-muted' },
  unavailable: { icon: Minus, cls: 'text-muted' },
}

/**
 * Report completeness — a data-availability checklist, NOT a medical confidence
 * score. Reflects only actual section state.
 */
export function CompletenessIndicator() {
  const { report } = usePatientReport()
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {report.completeness.map((c) => {
        const { icon: Icon, cls } = ICON[c.status]
        return (
          <li
            key={c.key}
            className="flex items-center justify-between rounded-lg border border-line-subtle bg-surface px-3 py-2"
          >
            <span className="flex items-center gap-2 text-sm text-primary">
              <Icon className={`size-4 ${cls}`} aria-hidden="true" />
              {c.label}
            </span>
            <span className={`text-xs font-medium ${cls}`}>
              {completenessLabel(c.status)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
