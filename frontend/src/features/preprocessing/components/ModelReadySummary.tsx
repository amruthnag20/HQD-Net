import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import type { ProcessedDataset } from '../types/preprocessing'
import { DimensionFlow } from './DimensionFlow'
import { BeforeAfterSummary } from './BeforeAfterSummary'

type Props = { processed: ProcessedDataset }

export function ModelReadySummary({ processed }: Props) {
  return (
    <Panel eyebrow="Model-ready dataset" title="Preprocessing complete">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle2 className="size-4 text-success" />
        <span className="text-sm font-semibold text-primary">
          {processed.processedFeatureCount} model-ready features
        </span>
        <Badge tone="success">{processed.status}</Badge>
      </div>

      <div className="mb-6 overflow-x-auto pb-1">
        <DimensionFlow steps={processed.dimensionFlow} />
      </div>

      <BeforeAfterSummary processed={processed} />

      <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-line-subtle pt-4 sm:flex-row">
        <p className="text-xs text-secondary">
          Ready for <span className="font-medium text-primary">classical ML</span> and{' '}
          <span className="font-medium text-primary">quantum ML</span> — both branches consume this
          dataset directly.
        </p>
        <Link
          to="/app/model-ready"
          className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Continue to Model Analysis
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Panel>
  )
}
