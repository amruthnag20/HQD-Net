import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { ProvenanceBadge } from './ProvenanceBadge'
import type { Provenance } from '../types/clinicalInterpretation'

/**
 * Standard clinical workspace section wrapper: a labelled card with an optional
 * provenance badge and a right-aligned action/status slot. Uses semantic headings
 * for accessibility.
 */
export function ClinicalSection({
  id,
  title,
  eyebrow,
  provenance,
  actions,
  children,
  className,
}: {
  id?: string
  title: string
  eyebrow?: string
  provenance?: Provenance
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  const headingId = id ? `${id}-heading` : undefined
  return (
    <section
      aria-labelledby={headingId}
      className={cn('rounded-xl border border-line-subtle bg-surface p-5', className)}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs text-muted">{eyebrow}</p>
          )}
          <div className="flex items-center gap-2">
            <h2 id={headingId} className="text-base font-semibold text-primary">
              {title}
            </h2>
            {provenance && <ProvenanceBadge provenance={provenance} />}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

/** Clean, non-alarmist empty state for a section with no backend data. */
export function ClinicalEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-line-subtle bg-surface-subtle px-4 py-6 text-center text-sm text-muted">
      {message}
    </div>
  )
}
