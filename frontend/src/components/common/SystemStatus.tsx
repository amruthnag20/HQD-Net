import { cn } from '@/lib/utils/cn'

export type SystemStatusType = 
  | 'READY'
  | 'ACTIVE'
  | 'PROCESSING'
  | 'COMPLETE'
  | 'WARNING'
  | 'ERROR'
  | 'OFFLINE'

type Props = {
  status: SystemStatusType
  label?: string
  className?: string
  pulse?: boolean
}

const statusConfig: Record<SystemStatusType, { dotClass: string; textClass: string; defaultLabel: string }> = {
  READY: {
    dotClass: 'bg-success shadow-[0_0_8px_var(--color-success)]',
    textClass: 'text-success',
    defaultLabel: 'SYSTEM READY',
  },
  ACTIVE: {
    dotClass: 'bg-primary shadow-[0_0_8px_var(--color-primary)]',
    textClass: 'text-primary',
    defaultLabel: 'SYSTEM ACTIVE',
  },
  PROCESSING: {
    dotClass: 'bg-accent shadow-[0_0_8px_var(--color-accent)] animate-pulse',
    textClass: 'text-accent',
    defaultLabel: 'PROCESSING',
  },
  COMPLETE: {
    dotClass: 'bg-success',
    textClass: 'text-success',
    defaultLabel: 'COMPLETE',
  },
  WARNING: {
    dotClass: 'bg-warning shadow-[0_0_8px_var(--color-warning)]',
    textClass: 'text-warning',
    defaultLabel: 'WARNING',
  },
  ERROR: {
    dotClass: 'bg-danger shadow-[0_0_8px_var(--color-danger)]',
    textClass: 'text-danger',
    defaultLabel: 'SYSTEM ERROR',
  },
  OFFLINE: {
    dotClass: 'bg-muted',
    textClass: 'text-muted',
    defaultLabel: 'OFFLINE',
  },
}

export function SystemStatus({ status, label, className, pulse }: Props) {
  const config = statusConfig[status]
  const displayLabel = label ?? config.defaultLabel

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div 
        className={cn(
          'size-2 rounded-full transition-colors',
          config.dotClass,
          pulse && 'animate-pulse'
        )} 
      />
      <span className={cn('font-mono text-[10px] tracking-widest uppercase transition-colors', config.textClass)}>
        {displayLabel}
      </span>
    </div>
  )
}
