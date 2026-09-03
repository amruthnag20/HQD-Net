import { useMemo } from 'react'
import { ArrowDown } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import type { DatasetState } from '@/features/ingestion/types/dataset'
import { estimateEncodedColumnCount } from '../lib/buildProcessedDataset'
import { usePreprocessing } from '../hooks/usePreprocessing'
import { StrategyToggle } from './StrategyToggle'

type Props = { dataset: DatasetState }

export function CategoricalEncodingPanel({ dataset }: Props) {
  const { config, actions } = usePreprocessing()

  const categoricalFeatures = useMemo(
    () => dataset.categoricalColumns.filter((name) => {
      if (name === dataset.targetColumn) return false
      const override = config.featureOverrides[name]
      return override !== false
    }),
    [dataset.categoricalColumns, dataset.targetColumn, config.featureOverrides],
  )

  const encodedCount = useMemo(
    () => estimateEncodedColumnCount(dataset, categoricalFeatures, config.encodingStrategy),
    [dataset, categoricalFeatures, config.encodingStrategy],
  )

  if (categoricalFeatures.length === 0) {
    return (
      <Panel eyebrow="Categorical Encoding" title="Categorical features">
        <p className="font-mono text-xs text-secondary">No categorical features are included.</p>
      </Panel>
    )
  }

  return (
    <Panel eyebrow="Categorical Encoding" title="Categorical features">
      <ul className="mb-4 flex flex-wrap gap-1.5">
        {categoricalFeatures.map((name) => (
          <li key={name} className="rounded-full bg-surface-subtle px-2.5 py-0.5 font-mono text-xs text-secondary">
            {name}
          </li>
        ))}
      </ul>

      <StrategyToggle
        label="Method"
        value={config.encodingStrategy}
        options={[
          { value: 'one-hot', label: 'One-Hot' },
          { value: 'ordinal', label: 'Ordinal' },
        ]}
        onChange={actions.setEncodingStrategy}
      />

      <div className="mt-4 flex items-center gap-4 rounded-xl bg-surface-subtle px-4 py-3">
        <div className="text-center">
          <div className="font-mono text-lg font-medium text-primary">{categoricalFeatures.length}</div>
          <div className="text-xs text-muted">categorical columns</div>
        </div>
        <ArrowDown className="size-4 shrink-0 -rotate-90 text-muted" />
        <div className="text-center">
          <div className="font-mono text-lg font-medium text-accent">{encodedCount}</div>
          <div className="text-xs text-muted">encoded columns</div>
        </div>
      </div>
    </Panel>
  )
}
