import { useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Dialog } from '@/components/ui/Dialog'

export type CardTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'teal' | 'purple' | 'pink'

const ICON_BG: Record<CardTone, string> = {
  accent: 'bg-accent-muted text-accent',
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
  neutral: 'bg-surface-subtle text-secondary',
  teal: 'bg-[#CCFBF1] text-[#0F766E]',
  purple: 'bg-[#F3E8FF] text-[#7E22CE]',
  pink: 'bg-[#FCE7F3] text-[#BE185D]',
}

const TOP_BAR: Record<CardTone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-line-strong',
  teal: 'bg-[#14B8A6]',
  purple: 'bg-[#A855F7]',
  pink: 'bg-[#EC4899]',
}

/**
 * The card shell used throughout the Phase 7 dashboard grid: a colored top
 * accent, an icon badge, a title, and a content area. Every card can expand
 * into its own dedicated modal via the corner button — a focused view of
 * just that card, not the whole report.
 */
export function DashboardCard({
  icon: Icon,
  tone = 'accent',
  title,
  headerRight,
  children,
  className,
}: {
  icon: LucideIcon
  tone?: CardTone
  title: string
  headerRight?: ReactNode
  children: ReactNode
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section
      className={cn(
        'report-section relative flex flex-col overflow-hidden rounded-2xl border border-line-subtle bg-surface p-5 pt-6 shadow-sm',
        className,
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-1.5', TOP_BAR[tone])} aria-hidden="true" />

      <div className="mb-3.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', ICON_BG[tone])}>
            <Icon className="size-4" />
          </span>
          <h2 className="text-sm font-semibold leading-snug text-primary">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" data-print-hide>
          {headerRight}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={`Expand ${title}`}
            className="focus-ring flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-subtle hover:text-primary"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1">{children}</div>

      <Dialog isOpen={expanded} onClose={() => setExpanded(false)} title={title} maxWidth="max-w-2xl">
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </Dialog>
    </section>
  )
}
