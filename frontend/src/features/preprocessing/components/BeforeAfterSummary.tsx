import type { ProcessedDataset } from '../types/preprocessing'

type Props = { processed: ProcessedDataset }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-secondary">{label}</span>
      <span className="font-mono text-xs font-medium text-primary">{value}</span>
    </div>
  )
}

export function BeforeAfterSummary({ processed }: Props) {
  const { beforeSummary, afterSummary } = processed
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-xl bg-surface-subtle p-3.5">
        <div className="mb-1 text-xs font-medium text-muted">Before</div>
        <Row label="Features" value={String(beforeSummary.features)} />
        <Row label="Numeric" value={String(beforeSummary.numeric)} />
        <Row label="Categorical" value={String(beforeSummary.categorical)} />
        <Row label="Missing" value={`${beforeSummary.missingPercent.toFixed(1)}%`} />
      </div>
      <div className="rounded-xl bg-accent-muted p-3.5">
        <div className="mb-1 text-xs font-medium text-accent">After</div>
        <Row label="Model-ready features" value={String(afterSummary.features)} />
        <Row label="Unresolved missing" value={String(afterSummary.unresolvedMissing)} />
        <Row label="Numeric" value={`${afterSummary.percentNumeric}%`} />
        <Row label="Scaled" value={afterSummary.scaled ? 'Yes' : 'No'} />
      </div>
    </div>
  )
}
