import { Panel } from '@/components/ui/Panel'
import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'

type Props = { processed: ProcessedDataset }

/** Shows the exact features Classical ML receives — reads directly off
 *  ProcessedDataset.processedColumnNames, the same list Phase 2 already
 *  computed. Never re-derived, never hardcoded. */
export function ModelInputPanel({ processed }: Props) {
  return (
    <Panel eyebrow="Model Input" title="Features passed to Classical ML">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-mono text-lg text-primary">{processed.processedFeatureCount}</span>
        <span className="text-xs text-muted">
          feature{processed.processedFeatureCount === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {processed.processedColumnNames.map((name) => (
          <li key={name} className="rounded-full bg-surface-subtle px-2.5 py-0.5 font-mono text-xs text-secondary">
            {name}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
