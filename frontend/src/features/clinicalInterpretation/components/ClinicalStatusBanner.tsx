import { AlertCircle, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { getClinicalInterpretationStatus, interpretationStatusMessage } from '../lib/clinicalEngine'

const TONE = {
  available: { cls: 'border-success/40 bg-success-muted text-success', icon: CheckCircle2 },
  partial: { cls: 'border-warning/50 bg-warning-muted text-warning', icon: CircleDashed },
  unavailable: { cls: 'border-line-subtle bg-surface-subtle text-secondary', icon: CircleDashed },
  not_started: { cls: 'border-line-subtle bg-surface-subtle text-secondary', icon: CircleDashed },
  loading: { cls: 'border-info/40 bg-info-muted text-info', icon: Loader2 },
  error: { cls: 'border-danger/50 bg-danger-muted text-danger', icon: AlertCircle },
} as const

/**
 * Top-level interpretation status banner. Surfaces the current status message plus
 * any backend warnings. Accessible via role=status.
 */
export function ClinicalStatusBanner() {
  const { interpretation } = useClinicalInterpretation()
  const status = getClinicalInterpretationStatus(interpretation)
  const tone = TONE[status] ?? TONE.unavailable
  const Icon = tone.icon

  return (
    <div role="status" className={cn('rounded-lg border px-4 py-3', tone.cls)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('size-4 shrink-0', status === 'loading' && 'animate-spin')} aria-hidden="true" />
        <p className="text-sm font-medium">{interpretationStatusMessage(status)}</p>
      </div>
      {interpretation.warnings.length > 0 && (
        <ul className="mt-1.5 list-inside list-disc pl-6 text-xs opacity-90">
          {interpretation.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
