import { cn } from '@/lib/utils/cn'
import type { Tone } from './Badge'

export type StatusIndicatorProps = {
  tone?: Tone
  label: string
  pulse?: boolean
  className?: string
}

const dotClass: Record<Tone, string> = {
  neutral: 'bg-muted',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-accent',
  signal: 'bg-accent',
}

/** Dot + label — used for system/session status microcopy, not decoration. */
export function StatusIndicator({ tone = 'neutral', label, pulse = false, className }: StatusIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-secondary', className)}>
      <span className="relative flex size-2">
        {pulse ? (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', dotClass[tone])} />
        ) : null}
        <span className={cn('relative inline-flex size-2 rounded-full', dotClass[tone])} />
      </span>
      {label}
    </span>
  )
}
