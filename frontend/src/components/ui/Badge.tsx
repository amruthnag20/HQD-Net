import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'signal'

export type BadgeProps = {
  tone?: Tone
  children: ReactNode
  className?: string
}

const toneClass: Record<Tone, string> = {
  neutral: 'bg-surface-raised text-secondary',
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
  info: 'bg-accent-muted text-accent',
  // Royal Blue — reserved for computational/system-signal moments (e.g. the
  // landing nav's "system online" indicator), never a generic status color.
  signal: 'bg-accent-muted text-accent',
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
