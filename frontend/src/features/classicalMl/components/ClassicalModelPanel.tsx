import { RotateCcw, Info, CircleCheck, XCircle } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useClassicalMl } from '../hooks/useClassicalMl'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  'label-required': 'Label required',
  'unsupported-target': 'Target not supported',
  ready: 'Ready',
  training: 'Training',
  trained: 'Trained',
  error: 'Error',
}

const METRIC_LABEL: Record<string, string> = {
  accuracy: 'Accuracy',
  precision: 'Precision',
  recall: 'Recall',
  f1: 'F1',
  rocAuc: 'ROC-AUC',
}

export function ClassicalModelPanel() {
  const { status, statusMessage, result, actions } = useClassicalMl()

  const isInformational = status === 'label-required' || status === 'unsupported-target'

  return (
    <Panel eyebrow="Classical ML — Phase 3A" title="Logistic regression">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={status === 'trained' ? 'success' : status === 'error' ? 'danger' : status === 'ready' || status === 'training' ? 'info' : 'neutral'}>
          {STATUS_LABEL[status]}
        </Badge>
        {status === 'trained' && result?.modelType && (
          <span className="text-xs text-muted">{result.modelType}</span>
        )}
      </div>

      {isInformational && statusMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-surface-subtle p-3">
          <Info className="size-4 shrink-0 text-accent" />
          <p className="text-xs leading-relaxed text-secondary">{statusMessage}</p>
        </div>
      )}

      {status === 'error' && statusMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-danger-muted p-3">
          <XCircle className="size-4 shrink-0 text-danger" />
          <p className="text-xs leading-relaxed text-secondary">{statusMessage}</p>
        </div>
      )}

      {(status === 'ready' || status === 'training') && (
        <Button variant="accent" size="md" loading={status === 'training'} loadingText="Training…" onClick={actions.train}>
          Train &amp; Evaluate
        </Button>
      )}

      {status === 'trained' && result?.metrics && (
        <>
          <p className="mb-3 text-xs text-muted">
            Leave-one-out cross-validation · {result.metrics.foldCount} folds · every value below comes from a
            held-out prediction, not the training set.
          </p>

          <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(['accuracy', 'precision', 'recall', 'f1', 'rocAuc'] as const).map((key) => {
              const value = result.metrics![key]
              return (
                <div key={key} className="rounded-xl bg-surface-subtle p-2.5 text-center">
                  <dt className="text-xs text-muted">{METRIC_LABEL[key]}</dt>
                  <dd className="mt-0.5 font-mono text-sm text-primary">
                    {value === null ? '—' : value.toFixed(2)}
                  </dd>
                </div>
              )
            })}
          </dl>

          {result.predictions && (
            <div className="overflow-x-auto rounded-xl border border-line-subtle">
              <table className="w-full min-w-[420px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle">
                    <th className="px-3 py-1.5 text-xs text-muted">Row</th>
                    <th className="px-3 py-1.5 text-xs text-muted">Actual</th>
                    <th className="px-3 py-1.5 text-xs text-muted">Predicted</th>
                    <th className="px-3 py-1.5 text-xs text-muted">Probability</th>
                    <th className="px-3 py-1.5 text-xs text-muted">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {result.predictions.map((p) => (
                    <tr key={p.rowIndex} className="border-b border-line-subtle last:border-0">
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-secondary">{p.rowIndex + 1}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-primary">{p.actualClass}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-primary">{p.predictedClass}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-secondary">{p.predictedProbability.toFixed(2)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        {p.correct ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CircleCheck className="size-3.5" /> correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-danger">
                            <XCircle className="size-3.5" /> miss
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.modelMetadata && result.modelMetadata.rowsExcludedMissingLabel > 0 && (
            <p className="mt-2 text-xs text-muted">
              {result.modelMetadata.rowsExcludedMissingLabel} row(s) excluded from training — missing label
            </p>
          )}

          <div className="mt-4 border-t border-line-subtle pt-3">
            <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="size-3.5" />} onClick={actions.train}>
              Retrain
            </Button>
          </div>
        </>
      )}
    </Panel>
  )
}
