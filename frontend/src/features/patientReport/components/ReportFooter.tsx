import { usePatientReport } from '../hooks/usePatientReport'

/**
 * Report footer (Phase 7, Section 40). Wordmark, generation metadata where
 * available, and the clinical disclaimer.
 */
export function ReportFooter() {
  const { report } = usePatientReport()
  const meta = report.clinical.metadata

  return (
    <footer className="report-section border-t border-line pt-6 text-xs text-muted">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-secondary">HQD-Net</p>
        <div className="text-right">
          {report.generatedAt && <p>Report generated: {report.generatedAt}</p>}
          {(meta.model || meta.modelVersion) && (
            <p>
              Model / data version: {meta.model ?? '—'}
              {meta.modelVersion ? ` · ${meta.modelVersion}` : ''}
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 leading-relaxed">
        AI-generated analysis is intended to support clinical review and does not replace professional
        medical judgment.
      </p>
    </footer>
  )
}
