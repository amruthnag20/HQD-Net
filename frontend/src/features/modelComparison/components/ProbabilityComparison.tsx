import { Panel } from '@/components/ui/Panel'
import type { ModelOutputSummary } from '../types/modelComparison'

export type ProbabilityComparisonProps = {
  classical: ModelOutputSummary | null
  quantum: ModelOutputSummary | null
  isCompatible: boolean
}

function ProbabilityRow({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line-subtle">
        {value !== null && (
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        )}
      </div>
      <span className="w-14 text-right text-sm font-medium text-primary">
        {value !== null ? `${value.toFixed(1)}%` : 'N/A'}
      </span>
    </div>
  )
}

export function ProbabilityComparison({ classical, quantum, isCompatible }: ProbabilityComparisonProps) {
  const cProbs = classical?.probabilities
  const qProbs = quantum?.probabilities

  if (!cProbs && !qProbs) return null

  const cNormal = cProbs ? cProbs.Normal * 100 : null
  const qNormal = qProbs ? qProbs.Normal * 100 : null
  const cHighRisk = cProbs ? cProbs['High Risk'] * 100 : null
  const qHighRisk = qProbs ? qProbs['High Risk'] * 100 : null

  return (
    <Panel eyebrow="Probability distribution" title="Probability comparison">
      {!isCompatible && (
        <div className="mb-4 rounded-xl bg-warning-muted px-3.5 py-2.5 text-xs text-secondary">
          <span className="mr-1.5 font-medium text-warning">Note:</span>
          These probabilities were generated on different input feature spaces. Side-by-side display is illustrative
          for model inspection only.
        </div>
      )}

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-primary">
            <span>Class: Normal</span>
            <span className="text-xs text-muted">Negative / low risk</span>
          </div>
          <div className="space-y-2">
            <ProbabilityRow label="Classical" value={cNormal} color="bg-accent" />
            <ProbabilityRow label="Quantum" value={qNormal} color="bg-baby" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-primary">
            <span>Class: High Risk</span>
            <span className="text-xs text-muted">Positive / elevated risk</span>
          </div>
          <div className="space-y-2">
            <ProbabilityRow label="Classical" value={cHighRisk} color="bg-danger/80" />
            <ProbabilityRow label="Quantum" value={qHighRisk} color="bg-danger" />
          </div>
        </div>
      </div>
    </Panel>
  )
}
