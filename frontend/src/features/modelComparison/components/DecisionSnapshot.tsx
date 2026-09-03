import { ShieldAlert, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import type { ModelComparisonResult } from '../types/modelComparison'

export type DecisionSnapshotProps = {
  result: ModelComparisonResult
}

const PRIORITY_LABEL: Record<ModelComparisonResult['priority'], string> = {
  'review-required': 'Clinical review',
  high: 'High risk',
  low: 'Routine / low',
  medium: 'Medium',
  undetermined: 'Undetermined',
}

const PRIORITY_TONE: Record<ModelComparisonResult['priority'], 'danger' | 'warning' | 'success' | 'neutral'> = {
  'review-required': 'danger',
  high: 'warning',
  low: 'success',
  medium: 'warning',
  undetermined: 'neutral',
}

/**
 * Concordance banner: agree = both models point the same way (concordant),
 * disagree = they diverge and the case should go to review, not-comparable =
 * disjoint domains, pending = nothing run yet. This is the same agreement
 * logic as before, presented as an explicit concordance read rather than a
 * generic status line.
 */
function AgreementBanner({
  agreement,
  reason,
}: {
  agreement: ModelComparisonResult['agreement']
  reason: string
}) {
  const config = {
    agree: {
      icon: CheckCircle2,
      tone: 'text-success',
      bg: 'bg-success-muted',
      title: 'Concordant — models agree',
      body: 'Both models produced the same predicted class under compatible evaluation criteria.',
    },
    disagree: {
      icon: AlertTriangle,
      tone: 'text-warning',
      bg: 'bg-warning-muted',
      title: 'Discordant — models disagree',
      body: 'The models produced diverging classifications for this subject. Additional clinical and diagnostic review is advised.',
    },
    'not-comparable': {
      icon: ShieldAlert,
      tone: 'text-accent',
      bg: 'bg-accent-muted',
      title: 'Comparison unavailable — disjoint domains',
      body: reason,
    },
    pending: {
      icon: HelpCircle,
      tone: 'text-muted',
      bg: 'bg-surface-subtle',
      title: 'Comparison pending',
      body: 'Execute both Classical ML and Quantum ML models to generate comparative evidence.',
    },
    unavailable: {
      icon: HelpCircle,
      tone: 'text-muted',
      bg: 'bg-surface-subtle',
      title: 'Comparison unavailable',
      body: reason,
    },
  }[agreement]

  const Icon = config.icon

  return (
    <div className={cn('flex items-start gap-3 rounded-xl p-4', config.bg)}>
      <Icon className={cn('size-5 shrink-0 mt-0.5', config.tone)} />
      <div className="space-y-1">
        <div className="text-sm font-semibold text-primary">{config.title}</div>
        <p className="text-sm leading-relaxed text-secondary">{config.body}</p>
      </div>
    </div>
  )
}

export function DecisionSnapshot({ result }: DecisionSnapshotProps) {
  const { classical, quantum, agreement, priority, patientId, inputCompatibility } = result

  return (
    <Panel eyebrow="Decision snapshot" title="Comparison at a glance">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle pb-4 mb-4">
        <div>
          <span className="text-xs text-muted">Subject ID</span>
          <div className="font-mono text-base font-semibold text-primary">{patientId}</div>
        </div>

        <div className="text-right">
          <span className="mb-1 block text-xs text-muted">Review priority</span>
          <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>
        </div>
      </div>

      {/* Model Predictions Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-surface-subtle p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Classical ML (Logistic Regression)</span>
            <Badge tone="neutral">Classical</Badge>
          </div>
          {classical ? (
            <div className="flex items-baseline justify-between">
              <div>
                <span
                  className={cn(
                    'text-xl font-semibold',
                    classical.predictionLabel === 'High Risk' ? 'text-danger' : 'text-success',
                  )}
                >
                  {classical.predictionLabel ?? 'Unknown'}
                </span>
                <span className="ml-2 text-xs text-secondary">
                  ({classical.confidencePercent?.toFixed(1)}% confidence)
                </span>
              </div>
              <span className="text-xs text-muted">{classical.featureCount} features</span>
            </div>
          ) : (
            <div className="text-sm italic text-muted">Classical model not trained</div>
          )}
        </div>

        <div className="rounded-xl bg-surface-subtle p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Quantum ML (DressedVQC)</span>
            <Badge tone="info">Quantum</Badge>
          </div>
          {quantum ? (
            <div className="flex items-baseline justify-between">
              <div>
                <span
                  className={cn(
                    'text-xl font-semibold',
                    quantum.predictionLabel === 'High Risk' ? 'text-danger' : 'text-success',
                  )}
                >
                  {quantum.predictionLabel ?? 'Unknown'}
                </span>
                <span className="ml-2 text-xs text-secondary">
                  ({quantum.confidencePercent?.toFixed(1)}% confidence)
                </span>
              </div>
              <span className="text-xs text-muted">10 qubits · 2 layers</span>
            </div>
          ) : (
            <div className="text-sm italic text-muted">Quantum VQC verification pending</div>
          )}
        </div>
      </div>

      <AgreementBanner agreement={agreement} reason={inputCompatibility.reason} />
    </Panel>
  )
}
