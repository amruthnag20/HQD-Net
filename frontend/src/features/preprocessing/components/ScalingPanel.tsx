import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import type { DatasetState } from '@/features/ingestion/types/dataset'
import { computeMinMax } from '../lib/scaling'
import { detectOutliersIQR } from '../lib/outliers'
import { extractColumn, parseNumericColumn } from '../lib/values'
import { usePreprocessing } from '../hooks/usePreprocessing'
import { StrategyToggle } from './StrategyToggle'

type Props = { dataset: DatasetState }

const OUTPUT_RANGE: Record<'standardization' | 'min-max', string> = {
  standardization: 'z = (x − μ) / σ  →  mean 0, unit variance',
  'min-max': "x' = (x − min) / (max − min)  →  [0, 1]",
}

export function ScalingPanel({ dataset }: Props) {
  const { config, actions } = usePreprocessing()

  const numericFeatures = useMemo(
    () => dataset.numericColumns.filter((name) => {
      if (name === dataset.targetColumn) return false
      return config.featureOverrides[name] !== false
    }),
    [dataset.numericColumns, dataset.targetColumn, config.featureOverrides],
  )

  const ranges = useMemo(
    () => numericFeatures.slice(0, 6).map((name) => {
      const raw = extractColumn(dataset.rows, dataset.preview.headers, name)
      const values = parseNumericColumn(raw).filter((v): v is number => v !== null)
      const { min, max } = computeMinMax(values)
      // Flagged, never silently averaged away — the impute/scale strategy
      // above still runs on the real value; this is informational only.
      const outliers = detectOutliersIQR(values)
      return { name, min, max, outlierCount: outliers.count }
    }),
    [dataset.rows, dataset.preview.headers, numericFeatures],
  )

  if (numericFeatures.length === 0) {
    return (
      <Panel eyebrow="Scaling" title="Feature scaling">
        <p className="font-mono text-xs text-secondary">No numeric features are included.</p>
      </Panel>
    )
  }

  return (
    <Panel eyebrow="Scaling" title="Feature scaling">
      <StrategyToggle
        label="Method"
        value={config.scalingStrategy}
        options={[
          { value: 'standardization', label: 'Standardization' },
          { value: 'min-max', label: 'Min-Max' },
        ]}
        onChange={actions.setScalingStrategy}
      />

      <p className="mt-3 font-mono text-[11px] text-muted">{OUTPUT_RANGE[config.scalingStrategy]}</p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line-subtle">
        <table className="w-full min-w-[360px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-subtle">
              <th className="px-3 py-1.5 text-xs text-muted">Feature</th>
              <th className="px-3 py-1.5 text-xs text-muted">Input Range</th>
              <th className="px-3 py-1.5 text-xs text-muted">Outliers</th>
            </tr>
          </thead>
          <tbody>
            {ranges.map((r) => (
              <tr key={r.name} className="border-b border-line-subtle last:border-0">
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-primary">{r.name}</td>
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-secondary">
                  [{r.min.toFixed(2)}, {r.max.toFixed(2)}]
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs">
                  {r.outlierCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <AlertTriangle className="size-3" />
                      {r.outlierCount} flagged
                    </span>
                  ) : (
                    <span className="text-muted">none</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {numericFeatures.length > ranges.length && (
        <p className="mt-2 text-xs text-muted">
          +{numericFeatures.length - ranges.length} more numeric feature(s)
        </p>
      )}
    </Panel>
  )
}
