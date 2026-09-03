import { CalendarDays } from 'lucide-react'
import { usePatientReport } from '../hooks/usePatientReport'
import { reportStatusLabel } from '../lib/reportEngine'
import { ReviewStatusBadge } from './ReviewStatusBadge'

function formatDate(iso: string | null): string {
  if (!iso) return 'Not recorded'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

/**
 * Dashboard-style masthead: title + subtitle on the left, patient identity,
 * generation date, and review status on the right — the fast-scan summary a
 * clinician sees first.
 */
export function ReportHeader() {
  const { report } = usePatientReport()

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-primary">Analysis Result</h1>
        <p className="mt-1 text-sm text-secondary">AI-assisted clinical decision support summary</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div>
          <span className="text-xs text-muted">Patient ID</span>
          <p className="font-mono font-medium text-primary">{report.patientInfo.patientId}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-muted" />
          <div>
            <span className="text-xs text-muted">Date</span>
            <p className="font-medium text-primary">{formatDate(report.generatedAt)}</p>
          </div>
        </div>
        <div className="text-right">
          <ReviewStatusBadge />
          <p className="mt-1 text-xs text-muted">{reportStatusLabel(report.status)}</p>
        </div>
      </div>

      {report.isDemoFixture && (
        <p className="w-full rounded-full bg-warning-muted px-3 py-1 text-xs font-medium text-warning">
          Demo / development content — for UI verification only
        </p>
      )}
    </header>
  )
}
