import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type Props = {
  featureCount: number
  quantumInputDimension: number
}

/** The target pipeline shape, not a record of something that ran — the
 *  first stage is real (Phase 2's actual feature count), everything after
 *  it is the documented architecture this branch has not yet executed. */
export function QuantumInputFlow({ featureCount, quantumInputDimension }: Props) {
  const steps = [
    { label: 'Model-ready features', value: String(featureCount), pending: false },
    { label: 'Quantum-specific projection', value: 'pending', pending: true },
    { label: `${quantumInputDimension}-D quantum vector`, value: 'target', pending: true },
    { label: 'Frozen VQC', value: 'pending execution', pending: true },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <div
            className={cn(
              'rounded-xl px-3.5 py-2 text-center',
              step.pending ? 'border border-dashed border-line bg-surface/60' : 'bg-surface-subtle',
            )}
          >
            <div className={cn('font-mono text-sm font-medium', step.pending ? 'text-muted' : 'text-primary')}>
              {step.value}
            </div>
            <div className="text-xs text-muted">{step.label}</div>
          </div>
          {i < steps.length - 1 && <ChevronRight className="size-3.5 shrink-0 text-muted" aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}
