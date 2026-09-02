import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Database, AlertCircle, RotateCcw, Sliders, ShieldCheck } from 'lucide-react'
import { useDatasetIngestion } from '@/features/ingestion/hooks/useDatasetIngestion'
import { DiagnosticWorkflowNav } from '@/components/navigation/DiagnosticWorkflowNav'
import { Panel } from '@/components/ui/Panel'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'

/** Placeholder for Phase 2 — Classical Preprocessing.
 *  Phase 1.5's job is workflow integration, state persistence, and route guarding.
 *  The actual preprocessing pipeline (imputation, encoding, scaling, feature selection)
 *  is strictly out of scope and reserved for Phase 2. */
export function Preprocessing() {
  const navigate = useNavigate()
  const { dataset, actions } = useDatasetIngestion()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleConfirmReset = () => {
    actions.reset()
    setShowResetConfirm(false)
    navigate('/app/data')
  }

  // 1. Direct URL Route Guard: If accessed without an active validated dataset
  if (!dataset || !dataset.targetColumn) {
    return (
      <div className="w-full flex flex-col items-center pb-16">
        <DiagnosticWorkflowNav currentStage="preprocessing" datasetLoaded={false} />

        <div className="mx-auto mt-10 w-full max-w-[640px]">
          <div className="rounded border border-line-strong bg-surface-raised p-8 text-center shadow-xs">
            <div className="mb-4 mx-auto flex size-12 items-center justify-center rounded-full bg-danger/10 border border-danger/20 text-danger">
              <AlertCircle className="size-6 stroke-[1.5]" />
            </div>

            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
              WORKFLOW GUARD
            </div>
            <h1 className="font-display text-3xl tracking-wider text-primary mb-3">
              DATASET REQUIRED
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-secondary mb-6">
              Load and validate a biomedical dataset before configuring classical preprocessing.
            </p>

            <Link
              to="/app/data"
              className="focus-ring inline-flex items-center gap-2 rounded bg-primary px-6 py-2.5 font-mono text-xs uppercase tracking-widest text-canvas transition-all hover:bg-secondary active:scale-[0.985] shadow-xs"
            >
              <ArrowLeft className="size-3.5" />
              GO TO DATA INGESTION
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
        canContinue={false}
      />

      {/* Top action bar */}
      <div className="w-full max-w-[860px] flex items-center justify-between mb-4 mt-2">
        <Link
          to="/app/data"
          className="focus-ring inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Dataset
        </Link>

        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="focus-ring inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-danger transition-colors"
        >
          <RotateCcw className="size-3" />
          Reset Analysis
        </button>
      </div>

      {/* Page Header */}
      <div className="mb-8 text-center md:mb-12">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          Stage 02 / Classical Preprocessing
        </div>
        <h1 className="font-display text-4xl tracking-wider text-primary lg:text-5xl">
          CLASSICAL PREPROCESSING
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-secondary">
          Configure missing-value handling, categorical encoding, feature scaling,
          and dimensionality reduction before quantum state representation.
        </p>
      </div>

      <div className="flex w-full max-w-[860px] flex-col gap-6">
        {/* Incoming Handed-off Dataset Card */}
        <Panel eyebrow="Active Dataset Handoff" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-line pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded bg-accent/10 border border-accent/20 text-accent">
                <Database className="size-5" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-semibold tracking-wide text-primary">
                  {dataset.datasetName}
                </h3>
                <p className="font-mono text-xs text-muted">
                  {(dataset.file.size / 1024).toFixed(1)} KB · Validated Clinical CSV
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge tone={dataset.validationStatus === 'valid' ? 'success' : 'warning'}>
                {dataset.validationStatus === 'valid' ? 'VALIDATED' : 'VALIDATED WITH WARNINGS'}
              </Badge>
              <Link
                to="/app/data"
                className="focus-ring inline-flex items-center gap-1 rounded border border-line bg-surface px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-secondary hover:border-line-strong hover:text-primary transition-colors"
              >
                Inspect Data
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted mb-0.5">Target Variable</dt>
              <dd className="font-mono text-xs font-semibold text-primary">{dataset.targetColumn}</dd>
              <dd className="font-mono text-[10px] text-secondary">
                {dataset.targetType || 'unknown'} {dataset.targetClasses ? `(${dataset.targetClasses.join(', ')})` : ''}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted mb-0.5">Records</dt>
              <dd className="font-mono text-xs font-semibold text-primary">{dataset.rowCount.toLocaleString()} rows</dd>
              <dd className="font-mono text-[10px] text-secondary">{dataset.columnCount} total columns</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted mb-0.5">Feature Types</dt>
              <dd className="font-mono text-xs font-semibold text-primary">{dataset.numericColumns.length} numeric</dd>
              <dd className="font-mono text-[10px] text-secondary">{dataset.categoricalColumns.length} categorical</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted mb-0.5">Missingness</dt>
              <dd className="font-mono text-xs font-semibold text-primary">
                {dataset.missingValueSummary.missingPercent.toFixed(1)}% cells
              </dd>
              <dd className="font-mono text-[10px] text-secondary">
                {dataset.missingValueSummary.missingCells.toLocaleString()} missing cells
              </dd>
            </div>
          </dl>
        </Panel>

        {/* Phase 2 Pipeline Placeholder Card */}
        <Panel eyebrow="Pipeline Roadmap / Phase 2" className="w-full">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded bg-accent/10 border border-accent/20 text-accent">
              <Sliders className="size-5" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <h4 className="font-mono text-sm font-semibold tracking-wide text-primary">
                  READY FOR PHASE 2: CLASSICAL PREPROCESSING
                </h4>
                <p className="mt-1 text-xs text-secondary leading-relaxed">
                  This stage will configure the transformations required to prepare raw clinical data for quantum embedding:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="rounded border border-line bg-surface/60 p-3">
                  <div className="font-mono text-[11px] font-medium text-primary flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-accent" />
                    Missing-Value Handling
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    Mean / Median / Mode / KNN Imputation
                  </p>
                </div>

                <div className="rounded border border-line bg-surface/60 p-3">
                  <div className="font-mono text-[11px] font-medium text-primary flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-accent" />
                    Categorical Encoding
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    One-Hot / Target / Ordinal Mapping
                  </p>
                </div>

                <div className="rounded border border-line bg-surface/60 p-3">
                  <div className="font-mono text-[11px] font-medium text-primary flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-accent" />
                    Feature Scaling
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    Standard / Robust / MinMax Scaler
                  </p>
                </div>

                <div className="rounded border border-line bg-surface/60 p-3">
                  <div className="font-mono text-[11px] font-medium text-primary flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-accent" />
                    Feature Selection & PCA
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    Variance Threshold / SelectKBest / PCA (Qubit-mapped)
                  </p>
                </div>
              </div>

              <div className="rounded border border-line-subtle bg-surface-subtle/50 p-3 flex items-center gap-2.5 mt-2">
                <ShieldCheck className="size-4 text-accent shrink-0" />
                <p className="font-mono text-[11px] text-secondary">
                  Dataset handoff verified. Preprocessing controls will be enabled in Phase 2.
                </p>
              </div>
            </div>
          </div>
        </Panel>

        {/* Navigation Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            to="/app/data"
            className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-surface px-6 py-2.5 font-mono text-xs uppercase tracking-widest text-primary transition-all hover:border-line-strong hover:bg-surface-raised active:scale-[0.985]"
          >
            <ArrowLeft className="size-3.5" />
            BACK TO DATASET
          </Link>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="focus-ring inline-flex items-center gap-1.5 rounded border border-line/60 bg-transparent px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-muted hover:text-danger hover:border-danger/40 transition-colors"
          >
            <RotateCcw className="size-3" />
            RESET ANALYSIS
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleConfirmReset}
        title="START NEW ANALYSIS?"
        description={`This will clear the current active dataset (${dataset.datasetName}) and return to Data Ingestion. Completed records in History remain untouched.`}
        confirmLabel="START NEW ANALYSIS"
        cancelLabel="CANCEL"
        tone="danger"
      />
    </div>
  )
}
