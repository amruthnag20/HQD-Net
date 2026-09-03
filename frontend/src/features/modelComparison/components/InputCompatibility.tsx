import { ShieldAlert, CheckCircle2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { InputCompatibilityInfo } from '../types/modelComparison'

export type InputCompatibilityProps = {
  compatibility: InputCompatibilityInfo
}

export function InputCompatibility({ compatibility }: InputCompatibilityProps) {
  const { isCompatible, reason, classicalDomain, quantumDomain, featureOverlapCount } = compatibility

  return (
    <div className="rounded-2xl bg-surface-subtle p-4">
      <div className="flex items-start gap-3">
        {isCompatible ? (
          <CheckCircle2 className="size-5 shrink-0 text-success mt-0.5" />
        ) : (
          <ShieldAlert className="size-5 shrink-0 text-warning mt-0.5" />
        )}

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">Input domain compatibility</span>
              <Badge tone={isCompatible ? 'success' : 'warning'}>
                {isCompatible ? 'Compatible domains' : 'Different input domains'}
              </Badge>
            </div>
            <span className="text-xs text-muted">Feature overlap: {featureOverlapCount} dimensions</span>
          </div>

          <p className="text-sm leading-relaxed text-secondary">{reason}</p>

          <div className="grid grid-cols-1 gap-2 pt-1 text-xs sm:grid-cols-2">
            <div className="flex justify-between rounded-lg bg-surface px-2.5 py-1.5">
              <span className="text-muted">Classical domain</span>
              <span className="font-medium text-primary">{classicalDomain}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-surface px-2.5 py-1.5">
              <span className="text-muted">Quantum domain</span>
              <span className="font-medium text-primary">{quantumDomain}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1 text-xs text-muted">
            <Info className="size-3 shrink-0 text-accent" />
            <span>
              Comparison is only clinically meaningful when both models evaluate compatible inputs, labels, and
              evaluation conditions.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
