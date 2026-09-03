import { Panel } from '@/components/ui/Panel'
import { TextInput } from '@/components/ui/TextInput'
import { usePreprocessing } from '../hooks/usePreprocessing'

/** Configuration-only panel (spec section 12): no fabricated importance
 *  score, just the two explainable, standard filters this frontend
 *  actually computes — a raw-scale variance floor and a pairwise
 *  correlation cutoff, both applied to included numeric features only. */
export function FeatureSelectionPanel() {
  const { config, actions } = usePreprocessing()

  return (
    <Panel eyebrow="Feature Selection" title="Numeric feature filtering">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          label="Variance threshold"
          type="number"
          min={0}
          step={0.01}
          value={config.varianceThreshold}
          onChange={(e) => actions.setVarianceThreshold(Number(e.target.value) || 0)}
          hint="Numeric columns at or below this raw-scale variance are dropped. 0 disables the filter."
        />
        <TextInput
          label="Correlation threshold"
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={config.correlationThreshold}
          onChange={(e) => actions.setCorrelationThreshold(Number(e.target.value) || 0)}
          hint="For each numeric pair above |r|, the later column is dropped. 1 disables the filter."
        />
      </div>
    </Panel>
  )
}
