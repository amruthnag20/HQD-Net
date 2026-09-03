import { useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { DatasetState } from '@/features/ingestion/types/dataset'
import { usePreprocessing } from '../hooks/usePreprocessing'
import { StrategyToggle } from './StrategyToggle'

type Props = { dataset: DatasetState }

export function MissingValuesPanel({ dataset }: Props) {
  const { config, actions } = usePreprocessing()

  const missingColumns = useMemo(
    () => dataset.columns.filter((c) => c.missingCount > 0 && c.name !== dataset.targetColumn).sort((a, b) => b.missingCount - a.missingCount),
    [dataset.columns, dataset.targetColumn],
  )

  if (missingColumns.length === 0) {
    return (
      <Panel eyebrow="Missing Values" title="Missing values">
        <p className="font-mono text-xs text-secondary">No missing values detected in this dataset.</p>
      </Panel>
    )
  }

  return (
    <Panel eyebrow="Missing Values" title="Missing values">
      <ul className="mb-4 flex flex-col gap-1">
        {missingColumns.map((c) => (
          <li key={c.name} className="flex items-center justify-between border-b border-line-subtle py-1 last:border-0">
            <span className="font-mono text-xs text-primary">{c.name}</span>
            <span className="font-mono text-xs text-secondary">{c.missingCount} missing</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-6">
        <StrategyToggle
          label="Numeric"
          value={config.numericImputeStrategy}
          disabled={config.missingValueMode === 'drop-rows'}
          options={[
            { value: 'median', label: 'Median' },
            { value: 'mean', label: 'Mean' },
          ]}
          onChange={actions.setNumericImputeStrategy}
        />
        <StrategyToggle
          label="Categorical"
          value={config.categoricalImputeStrategy}
          disabled={config.missingValueMode === 'drop-rows'}
          options={[{ value: 'most-frequent', label: 'Most Frequent' }]}
          onChange={actions.setCategoricalImputeStrategy}
        />
        <StrategyToggle
          label="Strategy"
          value={config.missingValueMode}
          options={[
            { value: 'impute', label: 'Impute' },
            { value: 'drop-rows', label: 'Drop Rows' },
          ]}
          onChange={actions.setMissingValueMode}
        />
      </div>
    </Panel>
  )
}
