import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, RotateCcw } from 'lucide-react'
import { useDatasetIngestion } from '../hooks/useDatasetIngestion'
import { DatasetDropzone } from './DatasetDropzone'
import { DatasetSummaryPanel } from './DatasetSummaryPanel'
import { DatasetPreviewTable } from './DatasetPreviewTable'
import { TargetColumnSelector } from './TargetColumnSelector'
import { ValidationChecklist } from './ValidationChecklist'
import { DiagnosticWorkflowNav } from '@/components/navigation/DiagnosticWorkflowNav'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

/** Phase 1 & 1.5 — Data Ingestion Foundation & Workflow Integration.
 *  SELECT → UPLOAD → VALIDATE → PREVIEW → SELECT TARGET → CONFIRM → CONTINUE.
 *  Everything here is inspection/validation only — no imputation, encoding,
 *  scaling, or quantum work happens on this page; that's Phase 2+. */
export function IngestionWorkspace() {
  const navigate = useNavigate()
  const { stage, errorMessage, dataset, canContinue, actions } = useDatasetIngestion()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleContinue = () => {
    if (!dataset || !dataset.targetColumn) return
    navigate('/app/preprocessing')
  }

  const handleConfirmReset = () => {
    actions.reset()
    setShowResetConfirm(false)
  }

  return (
    <div className="w-full flex flex-col items-center pb-16">
      {/* Workflow Navigation */}
      <DiagnosticWorkflowNav
        currentStage="data"
        datasetLoaded={stage === 'ready' && !!dataset}
        canContinue={canContinue}
      />

      {/* Top action bar */}
      <div className="w-full max-w-[860px] flex items-center justify-between mb-4 mt-2">
        <Link
          to="/app/home"
          className="focus-ring inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-primary transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Back to Workspace Home
        </Link>

        {stage === 'ready' && (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="focus-ring inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-danger transition-colors"
          >
            <RotateCcw className="size-3" />
            Reset Analysis
          </button>
        )}
      </div>

      <div className="mb-6 text-center md:mb-10">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          Stage 01 / Data Ingestion Foundation
        </div>
        <h1 className="font-display text-4xl tracking-wider text-primary lg:text-5xl">
          {stage === 'ready' ? 'INSPECT & VALIDATE DATASET' : 'PROVIDE CLINICAL DATA'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-secondary">
          Upload a biomedical CSV dataset, confirm its structure, and select a
          target variable before handing it to classical preprocessing.
        </p>
      </div>

      <div className="flex w-full max-w-[860px] flex-col gap-6">
        {stage !== 'ready' && (
          <DatasetDropzone
            stage={stage}
            errorMessage={errorMessage}
            onUpload={actions.loadFile}
            onLoadSample={actions.loadSample}
            onRetry={actions.reset}
          />
        )}

        {stage === 'ready' && dataset && (
          <>
            <DatasetSummaryPanel dataset={dataset} />
            <DatasetPreviewTable preview={dataset.preview} columns={dataset.columns} />
            <TargetColumnSelector dataset={dataset} onSelect={actions.selectTarget} />
            <ValidationChecklist
              checks={dataset.validationChecks}
              status={dataset.validationStatus}
              canContinue={canContinue}
              onContinue={handleContinue}
              onReset={() => setShowResetConfirm(true)}
            />
          </>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleConfirmReset}
        title="START NEW ANALYSIS?"
        description={`This will clear the current dataset (${dataset?.datasetName || 'uploaded data'}) and reset to the upload dropzone. Records in History remain intact.`}
        confirmLabel="CLEAR & START NEW"
        cancelLabel="CANCEL"
        tone="danger"
      />
    </div>
  )
}
