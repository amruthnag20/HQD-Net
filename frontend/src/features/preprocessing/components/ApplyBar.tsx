import { Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { PROCESSING_STEPS } from '../context/preprocessing-context'
import { usePreprocessing } from '../hooks/usePreprocessing'

/** The explicit CONFIGURE → APPLY → PROCESS → VALIDATE control (spec
 *  section 17). Preprocessing never runs implicitly on a config change. */
export function ApplyBar() {
  const { phase, processingStepIndex, processed, errorMessage, actions } = usePreprocessing()

  return (
    <Panel className="sticky bottom-4 z-10 shadow-md">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex-1">
          {phase === 'processing' && processingStepIndex !== null && (
            <div className="flex items-center gap-2 text-sm font-medium text-accent">
              <Loader2 className="size-3.5 animate-spin" />
              Processing dataset — {PROCESSING_STEPS[processingStepIndex]}
            </div>
          )}
          {phase === 'complete' && processed && (
            <div className="flex items-center gap-2 text-sm font-medium text-success">
              <Sparkles className="size-3.5" />
              Preprocessing complete — {processed.processedFeatureCount} model-ready features
            </div>
          )}
          {phase === 'error' && errorMessage && (
            <div className="flex items-center gap-2 text-sm font-medium text-danger">
              <AlertCircle className="size-3.5" />
              {errorMessage}
            </div>
          )}
          {phase === 'idle' && (
            <p className="text-sm text-muted">Configure the steps above, then apply preprocessing.</p>
          )}
        </div>

        <Button
          variant="accent"
          size="md"
          loading={phase === 'processing'}
          loadingText="Processing…"
          onClick={actions.apply}
        >
          Apply preprocessing
        </Button>
      </div>
    </Panel>
  )
}
