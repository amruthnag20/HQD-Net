import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useExplainability } from '../hooks/useExplainability'

/**
 * Provenance detail, not primary content — collapsed by default behind a
 * disclosure instead of an always-open card competing for attention with the
 * feature signals above it.
 */
export function PreprocessingTrace() {
  const { result } = useExplainability()
  const { preprocessingTrace } = result
  const [open, setOpen] = useState(false)

  if (!preprocessingTrace || preprocessingTrace.length === 0) return null

  return (
    <section className="rounded-2xl border border-line-subtle bg-surface p-6">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center justify-between text-left"
      >
        <span>
          <h2 className="text-sm font-semibold text-primary">How this input was prepared</h2>
          <p className="mt-0.5 text-xs text-muted">
            {preprocessingTrace.length} preprocessing steps applied before inference
          </p>
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ol className="mt-4 flex flex-col gap-3" aria-label="Preprocessing trace">
          {preprocessingTrace.map((step) => (
            <li key={step.stage} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  step.applied ? 'bg-success-muted text-success' : 'bg-surface-subtle text-muted',
                )}
                aria-hidden="true"
              >
                {step.applied ? '✓' : '○'}
              </span>
              <div>
                <p className="text-sm font-medium text-primary">{step.stage}</p>
                <p className="text-xs text-muted">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
