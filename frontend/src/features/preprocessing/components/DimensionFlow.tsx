import { ChevronRight } from 'lucide-react'
import type { DimensionStep } from '../types/preprocessing'

type Props = { steps: DimensionStep[] }

/** Renders the actual dimensionality change reported by the last completed
 *  run — never a projected or hard-coded value (spec section 15). */
export function DimensionFlow({ steps }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className="rounded-xl bg-surface-subtle px-3.5 py-2 text-center">
            <div className="font-mono text-lg font-medium text-primary">{step.count}</div>
            <div className="text-xs text-muted">{step.label}</div>
          </div>
          {i < steps.length - 1 && <ChevronRight className="size-3.5 shrink-0 text-muted" aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}
