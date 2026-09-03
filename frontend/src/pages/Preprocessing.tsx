import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Database, AlertCircle, RotateCcw } from 'lucide-react'
import { useDatasetIngestion } from '@/features/ingestion/hooks/useDatasetIngestion'
import { usePreprocessing } from '@/features/preprocessing/hooks/usePreprocessing'
import { PreprocessingWorkspace } from '@/features/preprocessing/components/PreprocessingWorkspace'
import { DiagnosticWorkflowNav } from '@/components/navigation/DiagnosticWorkflowNav'
import { Panel } from '@/components/ui/Panel'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'

/** Phase 2 — Classical Preprocessing workspace. Consumes the validated
 *  dataset Phase 1 hands off and produces a shared model-ready dataset for
 *  the future classical-ML and quantum-ML branches. */
export function Preprocessing() {
  const navigate = useNavigate()
  const { dataset, actions } = useDatasetIngestion()
  const { phase, actions: preprocessingActions } = usePreprocessing()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleConfirmReset = () => {
    actions.reset()
    preprocessingActions.reset()
    setShowResetConfirm(false)
    navigate('/app/data')
  }

  // 1. Direct URL Route Guard: If accessed without an active validated dataset.
  // A target column is not required here — it's optional at this milestone.
  if (!dataset || dataset.validationStatus === 'invalid') {
    return (
      <div className="w-full flex flex-col items-center pb-16">
        <DiagnosticWorkflowNav currentStage="preprocessing" datasetLoaded={false} />

        <div className="mx-auto mt-6 w-full max-w-[520px]">
          <div className="rounded-2xl border border-line-subtle bg-surface p-8 text-center shadow-sm">
            <div className="mb-4 mx-auto flex size-12 items-center justify-center rounded-full bg-danger-muted text-danger">
              <AlertCircle className="size-6 stroke-[1.5]" />
            </div>

            <h1 className="text-xl font-semibold text-primary mb-2">Dataset required</h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-secondary mb-6">
              Load and validate a biomedical dataset before configuring classical preprocessing.
            </p>

            <Link
              to="/app/data"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              <ArrowLeft className="size-3.5" />
              Go to Data Ingestion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 2. Valid dataset handoff view
  return (
    <div className="w-full flex flex-col items-center pb-16">
      {/* Workflow Navigation — Stage 1 completed, Stage 2 active */}
      <DiagnosticWorkflowNav
        currentStage="preprocessing"
        datasetLoaded={true}
        canContinue={phase === 'complete'}
      />

      {/* Top action bar */}
      <div className="w-full max-w-[860px] flex items-center justify-between mb-4 mt-2">
        <Link
          to="/app/data"
          className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Dataset
        </Link>

        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-danger transition-colors"
        >
          <RotateCcw className="size-3" />
          Reset analysis
        </button>
      </div>

      {/* Page Header */}
      <div className="mb-8 w-full max-w-[860px]">
        <h1 className="font-display text-3xl text-primary">Classical preprocessing</h1>
        <p className="mt-1.5 max-w-lg text-sm text-secondary">
          Configure missing-value handling, categorical encoding, feature scaling, and dimensionality
          reduction before quantum state representation.
        </p>
      </div>

      <div className="flex w-full max-w-[860px] flex-col gap-5">
        {/* Incoming Handed-off Dataset Strip */}
        <Panel eyebrow="Active dataset handoff" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-accent-muted text-accent">
                <Database className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">{dataset.datasetName}</h3>
                <p className="text-xs text-muted">
                  {dataset.targetColumn
                    ? `Target: ${dataset.targetColumn} (${dataset.targetType || 'unknown'})`
                    : 'No target selected — optional at this milestone'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge tone={dataset.validationStatus === 'valid' ? 'success' : 'warning'}>
                {dataset.validationStatus === 'valid' ? 'Validated' : 'Validated with warnings'}
              </Badge>
              <Link
                to="/app/data"
                className="focus-ring inline-flex items-center gap-1 rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-secondary hover:text-primary transition-colors"
              >
                Inspect data
              </Link>
            </div>
          </div>
        </Panel>

        <PreprocessingWorkspace dataset={dataset} />
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleConfirmReset}
        title="Start new analysis?"
        description={`This will clear the current active dataset (${dataset.datasetName}) and return to Data Ingestion. Completed records in History remain untouched.`}
        confirmLabel="Start new analysis"
        cancelLabel="Cancel"
        tone="danger"
      />
    </div>
  )
}
