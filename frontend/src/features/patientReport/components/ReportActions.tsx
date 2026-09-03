import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Copy, Printer } from 'lucide-react'
import { usePatientReport } from '../hooks/usePatientReport'

/**
 * Report actions bar (Phase 7, Section 38). Print uses the browser's native print
 * (with print styles); copy places a structured plain-text summary on the clipboard.
 * No fabricated backend PDF/export. Hidden when printing.
 */
export function ReportActions() {
  const { copySummary } = usePatientReport()
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  useEffect(() => {
    if (!copied && !copyFailed) return
    const t = setTimeout(() => {
      setCopied(false)
      setCopyFailed(false)
    }, 2500)
    return () => clearTimeout(t)
  }, [copied, copyFailed])

  const handleCopy = async () => {
    const ok = await copySummary()
    setCopied(ok)
    setCopyFailed(!ok)
  }

  return (
    <div
      data-print-hide
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-subtle bg-surface p-3"
    >
      <Link
        to="/app/clinical-interpretation"
        className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        Back to Clinical Interpretation
      </Link>

      <div className="flex items-center gap-2">
        <span
          role="status"
          aria-live="polite"
          className="font-mono text-[11px] text-muted"
        >
          {copied ? 'Report summary copied.' : copyFailed ? 'Copy unavailable.' : ''}
        </span>
        <button
          onClick={handleCopy}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-xs font-medium text-secondary transition-colors hover:border-accent hover:text-primary"
        >
          {copied ? <ClipboardCheck className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          Copy summary
        </button>
        <button
          onClick={() => window.print()}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          <Printer className="size-3.5" />
          Print report
        </button>
      </div>
    </div>
  )
}
