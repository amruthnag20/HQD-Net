import { cn } from '@/lib/utils/cn'
import type { ExplanationStatus as ExplanationStatusValue } from '../types/explainability'

type Props = { status: ExplanationStatusValue; className?: string }

const STATUS_CONFIG: Record<ExplanationStatusValue, { label: string; tone: string; dot: string }> = {
  not_started: { label: 'Not started', tone: 'text-muted', dot: 'bg-disabled' },
  loading: { label: 'Computing…', tone: 'text-info', dot: 'bg-accent animate-pulse' },
  available: { label: 'Explanation ready', tone: 'text-success', dot: 'bg-success' },
  partial: { label: 'Partial explanation', tone: 'text-warning', dot: 'bg-warning' },
  unavailable: { label: 'Explanation unavailable', tone: 'text-muted', dot: 'bg-disabled' },
  error: { label: 'Error', tone: 'text-danger', dot: 'bg-danger' },
}

/** Small status pill — used in the prediction hero and reused wherever a compact status read is needed. */
export function ExplanationStatus({ status, className }: Props) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span role="status" className={cn('inline-flex items-center gap-1.5 text-sm font-medium', cfg.tone, className)}>
      <span className={cn('size-1.5 shrink-0 rounded-full', cfg.dot)} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}
