import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useExplainability } from '../hooks/useExplainability'
import { DevPreviewControl } from './DevPreviewControl'

/**
 * Slim page header. Title and description sit in normal editorial type — the
 * display face is reserved for the prediction hero's headline number, not
 * shouted here. Model + scope controls are single segmented switches instead
 * of rows of separate buttons.
 */
export function ExplainabilityHeader() {
  const { result, selectedModel, setSelectedModel, scope, setScope } = useExplainability()

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-primary">Explainability</h1>
          <p className="mt-1 max-w-xl text-sm text-secondary">
            See which inputs influenced this prediction and how sensitive it is to changes in each one.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {result.isDemoFixture && (
            <span className="rounded-full border border-warning/30 bg-warning-muted px-2.5 py-1 text-xs font-medium text-warning">
              Demo data
            </span>
          )}
          <DevPreviewControl />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Model to explain"
          value={selectedModel}
          onChange={setSelectedModel}
          options={[
            { value: 'quantum', label: 'Quantum VQC' },
            { value: 'classical', label: 'Classical ML' },
          ]}
        />
        <SegmentedControl
          ariaLabel="Explanation scope"
          value={scope}
          onChange={setScope}
          size="sm"
          options={[
            { value: 'local', label: 'This sample' },
            { value: 'global', label: 'Whole cohort' },
          ]}
        />
      </div>
    </header>
  )
}
