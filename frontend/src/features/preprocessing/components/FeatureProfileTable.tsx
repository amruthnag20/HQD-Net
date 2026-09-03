import { useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import type { DatasetState } from '@/features/ingestion/types/dataset'
import { buildFeatureDecisions } from '../lib/featureDecisions'
import type { FeatureDecision, FeatureRole, FeatureStatus } from '../types/preprocessing'
import { usePreprocessing } from '../hooks/usePreprocessing'

const ROLE_LABEL: Record<FeatureRole, string> = {
  numeric: 'NUMERIC',
  categorical: 'CATEGORICAL',
  identifier: 'IDENTIFIER',
  constant: 'CONSTANT',
  empty: 'EMPTY',
}

function statusBadge(status: FeatureStatus) {
  if (status === 'ready') return <Badge tone="success">READY</Badge>
  if (status === 'impute') return <Badge tone="warning">IMPUTE</Badge>
  if (status === 'encode') return <Badge tone="info">ENCODE</Badge>
  return <Badge tone="danger">EXCLUDE</Badge>
}

type Props = { dataset: DatasetState }

/** The Feature Profile table (spec section 7) doubles as Feature Filtering
 *  (section 4/12): every non-empty column's checkbox is the single source
 *  of manual inclusion truth, backed by PreprocessingConfig.featureOverrides. */
export function FeatureProfileTable({ dataset }: Props) {
  const { config, actions } = usePreprocessing()

  const decisions = useMemo<FeatureDecision[]>(
    () => buildFeatureDecisions(dataset.columns, dataset.targetColumn, config.featureOverrides),
    [dataset.columns, dataset.targetColumn, config.featureOverrides],
  )

  return (
    <Panel eyebrow="Feature Profile / Filtering" title="Per-feature handling">
      <div className="max-h-80 overflow-y-auto overflow-x-auto rounded-xl border border-line-subtle">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead className="sticky top-0 bg-surface-subtle">
            <tr className="border-b border-line">
              <th className="whitespace-nowrap px-3 py-2 text-xs text-muted">Feature</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs text-muted">Type</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs text-muted">Missing</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs text-muted">Status</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs text-muted">Include</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d) => (
              <tr key={d.name} className="border-b border-line-subtle last:border-0 hover:bg-surface-subtle">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-primary">{d.name}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[10px] text-secondary">{ROLE_LABEL[d.role]}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-secondary">{d.missingCount}</td>
                <td className="whitespace-nowrap px-3 py-2">{statusBadge(d.status)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {d.overridable ? (
                    <label className="focus-within:outline-accent inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={d.included}
                        onChange={(e) => actions.setFeatureIncluded(d.name, e.target.checked)}
                        aria-label={`Include ${d.name} in the model-ready dataset`}
                        className="size-3.5 accent-[var(--color-accent)]"
                      />
                      <span className="text-xs text-muted">
                        {d.included ? 'included' : 'excluded'}
                      </span>
                    </label>
                  ) : (
                    <span className="text-xs text-disabled">no data</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
