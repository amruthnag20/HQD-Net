import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import type { ModelOutputSummary } from '../types/modelComparison'

export type ModelPerformanceProps = {
  classical: ModelOutputSummary | null
  quantum: ModelOutputSummary | null
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-subtle p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-base font-semibold text-primary">{value}</div>
    </div>
  )
}

function PerformanceColumn({
  title,
  method,
  metrics,
  pendingLabel,
  pendingBody,
}: {
  title: string
  method: string
  metrics: ModelOutputSummary['metrics']
  pendingLabel: string
  pendingBody: string
}) {
  return (
    <div className="rounded-xl border border-line-subtle bg-surface p-4">
      <div className="mb-3 flex items-center justify-between border-b border-line-subtle pb-2.5">
        <div>
          <span className="text-sm font-semibold text-primary">{title}</span>
          <span className="block text-xs text-muted">{method}</span>
        </div>
        <Badge tone={metrics ? 'success' : 'neutral'}>{metrics ? 'Validated' : pendingLabel}</Badge>
      </div>

      {metrics ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <MetricItem label="Accuracy" value={metrics.accuracy !== null ? `${(metrics.accuracy * 100).toFixed(1)}%` : 'N/A'} />
          <MetricItem label="Precision" value={metrics.precision !== null ? `${(metrics.precision * 100).toFixed(1)}%` : 'N/A'} />
          <MetricItem label="Recall" value={metrics.recall !== null ? `${(metrics.recall * 100).toFixed(1)}%` : 'N/A'} />
          <MetricItem label="F1 score" value={metrics.f1 !== null ? `${(metrics.f1 * 100).toFixed(1)}%` : 'N/A'} />
          <MetricItem label="ROC-AUC" value={metrics.rocAuc !== null ? metrics.rocAuc.toFixed(3) : 'N/A'} />
          <MetricItem label="Folds" value={metrics.foldCount !== undefined ? String(metrics.foldCount) : 'N/A'} />
        </div>
      ) : (
        <div className="rounded-xl bg-surface-subtle p-4 text-center">
          <p className="text-sm text-secondary">{pendingBody}</p>
        </div>
      )}
    </div>
  )
}

export function ModelPerformance({ classical, quantum }: ModelPerformanceProps) {
  return (
    <Panel eyebrow="Validation & metrics" title="Model performance benchmark">
      <p className="mb-4 text-sm text-secondary">
        Cohort-level evaluation metrics across cross-validation folds — generalizable discriminatory capability,
        distinct from individual patient inference.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PerformanceColumn
          title={`Classical model (${classical?.modelName ?? 'Logistic Regression'})`}
          method={classical?.metrics?.evaluationMethod ?? 'In-browser leave-one-out CV'}
          metrics={classical?.metrics ?? null}
          pendingLabel="Metrics pending"
          pendingBody="Evaluation metrics unavailable for this execution."
        />
        <PerformanceColumn
          title="Quantum model (DressedVQC)"
          method={quantum?.metrics?.evaluationMethod ?? 'Authoritative checkpoint benchmark'}
          metrics={quantum?.metrics ?? null}
          pendingLabel="Cohort metrics pending"
          pendingBody="Cohort evaluation metrics unavailable for this execution. Single-instance native VQC prediction verified on row 0."
        />
      </div>
    </Panel>
  )
}
