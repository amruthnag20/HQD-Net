import { Panel } from '@/components/ui/Panel'
import type { DatasetState } from '../types/dataset'

type Props = {
  dataset: DatasetState
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-mono text-lg font-medium text-primary">{value}</span>
    </div>
  )
}

export function DatasetSummaryPanel({ dataset }: Props) {
  return (
    <Panel eyebrow="Dataset" title={dataset.datasetName}>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label="Rows" value={dataset.rowCount.toLocaleString()} />
        <Stat label="Features" value={dataset.columnCount.toLocaleString()} />
        <Stat label="Target" value={dataset.targetColumn ?? '—'} />
        <Stat label="Missing" value={`${dataset.missingValueSummary.missingPercent.toFixed(1)}%`} />
      </div>
    </Panel>
  )
}
