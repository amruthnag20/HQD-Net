import { cn } from '@/lib/utils/cn'
import { usePatientReport } from '../hooks/usePatientReport'
import type { ReviewerStatus } from '../types/patientReport'

const STATUS_OPTIONS: { value: ReviewerStatus; label: string }[] = [
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'needs-revision', label: 'Needs Revision' },
  { value: 'pending', label: 'Pending' },
]

/**
 * Clinical review / feedback loop (Phase 7, Section 36–37). Frontend-only: state is
 * held for the current session (no backend feedback endpoint exists). Clinicians can
 * flag findings, set a review status, and add a note.
 */
export function ReviewPanel() {
  const { report, setReviewerStatus, setNote, toggleFinding } = usePatientReport()
  const feedback = report.feedback
  const findings = report.clinical.keyFindings

  return (
    <div data-print-hide className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-xs text-muted">Review Status</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Set review status">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setReviewerStatus(opt.value)}
              aria-pressed={feedback.reviewerStatus === opt.value}
              className={cn(
                'focus-ring rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                feedback.reviewerStatus === opt.value
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-line bg-surface text-secondary hover:border-accent hover:text-primary',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {findings.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-muted">
            Confirm / flag findings
          </p>
          <ul className="flex flex-col gap-1.5">
            {findings.map((f) => {
              const selected = feedback.selectedFindings.includes(f.id)
              return (
                <li key={f.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line-subtle bg-surface px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleFinding(f.id, 'confirm')}
                      className="size-4 accent-[var(--color-accent)]"
                    />
                    <span className="text-primary">{f.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div>
        <label
          htmlFor="review-note"
          className="mb-1.5 block text-xs text-muted"
        >
          Clinical note
        </label>
        <textarea
          id="review-note"
          value={feedback.note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Add a note for this review (kept for this session only)…"
          className="focus-ring w-full resize-y rounded-lg border border-line-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted"
        />
      </div>

      <p className="font-mono text-[10px] text-muted">
        Feedback is stored for this session only. Persistence requires a backend review endpoint (not
        yet implemented).
      </p>
    </div>
  )
}

/** Print-only rendering of the captured review state. */
export function ReviewSummaryPrint() {
  const { report } = usePatientReport()
  const f = report.feedback
  return (
    <div className="hidden print:block">
      <p className="text-sm">
        <span className="text-muted">Review status: </span>
        <span className="font-medium">{f.reviewerStatus}</span>
      </p>
      {f.selectedFindings.length > 0 && (
        <p className="text-sm">
          <span className="text-muted">Flagged findings: </span>
          {f.selectedFindings.length}
        </p>
      )}
      {f.note && (
        <p className="text-sm">
          <span className="text-muted">Note: </span>
          {f.note}
        </p>
      )}
    </div>
  )
}
