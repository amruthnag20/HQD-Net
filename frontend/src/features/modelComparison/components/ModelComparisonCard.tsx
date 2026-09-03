import { useState } from 'react'
import { ChevronDown, ChevronUp, Cpu, Activity, Info } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import type { ModelOutputSummary } from '../types/modelComparison'

export type ModelComparisonCardProps = {
  title: string
  branchLabel: string
  summary: ModelOutputSummary | null
  badgeTone?: 'neutral' | 'info' | 'success' | 'warning'
}

export function ModelComparisonCard({ title, branchLabel, summary, badgeTone = 'neutral' }: ModelComparisonCardProps) {
  const [expanded, setExpanded] = useState<boolean>(false)

  if (!summary) {
    return (
      <div className="flex min-h-[340px] flex-col justify-between rounded-2xl border border-line-subtle bg-surface p-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted">{branchLabel}</span>
            <Badge tone="neutral">Unavailable</Badge>
          </div>
          <h3 className="mb-3 text-base font-semibold text-primary">{title}</h3>
          <div className="my-6 rounded-xl bg-surface-subtle p-4 text-center">
            <Info className="mx-auto mb-2 size-5 text-muted" />
            <p className="text-sm text-secondary">No execution result available for this branch.</p>
          </div>
        </div>
      </div>
    )
  }

  const {
    modelName,
    executionStatus,
    predictionLabel,
    confidencePercent,
    probabilities,
    featureCount,
    featureNames,
    inputDomain,
    metrics,
    computationalMetadata,
  } = summary

  const normalPct = probabilities ? (probabilities.Normal * 100).toFixed(1) : null
  const highRiskPct = probabilities ? (probabilities['High Risk'] * 100).toFixed(1) : null

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-line-subtle bg-surface p-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted">{branchLabel}</span>
          <Badge tone={badgeTone}>{executionStatus}</Badge>
        </div>

        <h3 className="mb-1 text-lg font-semibold text-primary">{modelName}</h3>
        <p className="mb-4 text-xs text-muted">Input domain: {inputDomain}</p>

        {/* Prediction summary */}
        <div className="mb-4 rounded-xl bg-surface-subtle p-3.5">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs text-muted">Predicted class</span>
            <span className="text-xs font-medium text-secondary">
              Confidence: {confidencePercent?.toFixed(1) ?? 'N/A'}%
            </span>
          </div>
          <div className={cn('text-2xl font-semibold', predictionLabel === 'High Risk' ? 'text-danger' : 'text-success')}>
            {predictionLabel ?? 'N/A'}
          </div>
        </div>

        {/* Probability Bars */}
        {probabilities && (
          <div className="mb-4 space-y-2.5">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-secondary">Normal</span>
                <span className="font-medium text-primary">{normalPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-subtle">
                <div className="h-full rounded-full bg-success transition-all duration-300" style={{ width: `${normalPct}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-secondary">High Risk</span>
                <span className="font-medium text-primary">{highRiskPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-subtle">
                <div className="h-full rounded-full bg-danger transition-all duration-300" style={{ width: `${highRiskPct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick metrics grid */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-surface-subtle p-2.5">
            <span className="block text-xs text-muted">Features</span>
            <span className="text-sm font-medium text-primary">{featureCount} inputs</span>
          </div>
          <div className="rounded-lg bg-surface-subtle p-2.5">
            <span className="block text-xs text-muted">Model type</span>
            <span className="block truncate text-sm font-medium text-primary">{summary.modelType}</span>
          </div>
        </div>

        {/* Model Performance metrics preview */}
        <div className="mb-4 rounded-xl bg-surface-subtle p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted">
            <Activity className="size-3 text-accent" />
            Model evaluation metrics
          </div>
          {metrics ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="block text-xs text-muted">ACC</span>
                <span className="font-mono text-sm font-medium text-primary">
                  {metrics.accuracy !== null ? `${(metrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted">F1</span>
                <span className="font-mono text-sm font-medium text-primary">
                  {metrics.f1 !== null ? `${(metrics.f1 * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted">ROC-AUC</span>
                <span className="font-mono text-sm font-medium text-primary">
                  {metrics.rocAuc !== null ? metrics.rocAuc.toFixed(3) : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs italic text-muted">Evaluation metrics unavailable for this execution.</p>
          )}
        </div>
      </div>

      {/* Expandable computational metadata */}
      <div className="border-t border-line-subtle pt-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="focus-ring flex w-full items-center justify-between text-xs font-medium text-secondary transition-colors hover:text-primary"
        >
          <span className="flex items-center gap-1.5">
            <Cpu className="size-3 text-accent" />
            {expanded ? 'Hide technical metadata' : 'View technical metadata'}
          </span>
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2 border-t border-line-subtle pt-3 text-xs">
            {Object.entries(computationalMetadata).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="capitalize text-muted">{k.replace(/([A-Z])/g, ' $1')}:</span>
                <span className="max-w-[200px] truncate text-right font-medium text-primary" title={String(v)}>
                  {String(v)}
                </span>
              </div>
            ))}
            <div className="pt-2">
              <span className="mb-1 block text-xs text-muted">Features evaluated:</span>
              <p className="text-xs leading-normal text-secondary break-words">{featureNames.join(', ')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
