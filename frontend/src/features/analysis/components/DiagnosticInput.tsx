import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileType, CheckCircle, AlertCircle, Loader2, ArrowRight, Database, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useDatasetIngestion } from '@/features/ingestion/hooks/useDatasetIngestion'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { WorkflowState, AnalysisInput } from '../types/analysis'

type Props = {
  state: WorkflowState
  input: AnalysisInput | null
  onUpload: (file: File) => void
  onContinue: () => void
}

/** Home's entry point for TWO independent workflows that intentionally
 *  coexist:
 *   - the Phase 1 dataset-ingestion flow (this session's DatasetIngestionContext,
 *     driving /app/data → /app/preprocessing)
 *   - the pre-existing analysis/quantum demo flow (useAnalysisWorkflow's own
 *     state machine, driving EngineSelector → AnalysisConfirmation →
 *     ComputationalPipeline → AnalysisResult, all rendered by AnalysisWorkspace)
 *  Neither replaces the other. The legacy workflow's own upload dropzone
 *  (below) is what drives `onUpload`/`onContinue` — restoring the exact
 *  reachability that existed before the Phase 1 integration. */
export function DiagnosticInput({ state, input, onUpload, onContinue }: Props) {
  const navigate = useNavigate()
  const { dataset, canContinue, actions } = useDatasetIngestion()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (state !== 'idle') return
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (state !== 'idle') return
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) onUpload(e.dataTransfer.files[0])
  }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onUpload(e.target.files[0])
  }

  const handleStartNew = () => navigate('/app/data')
  const handleLoadDemo = () => {
    actions.loadSample()
    navigate('/app/data')
  }
  const handleConfirmReset = () => {
    actions.reset()
    setShowResetConfirm(false)
    navigate('/app/data')
  }

  // ---- 1. Legacy analysis workflow is mid-flight — show its own status ----
  if (state !== 'idle') {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="w-full p-8 rounded border border-line-strong bg-surface-raised flex flex-col items-center shadow-sm">
          <div className="mb-5">
            {state === 'ingesting' ? (
              <Loader2 className="size-8 text-accent animate-spin" />
            ) : state === 'validated' && input?.status === 'valid' ? (
              <CheckCircle className="size-8 text-success" />
            ) : (
              <AlertCircle className="size-8 text-danger" />
            )}
          </div>

          {input && (
            <div className="text-center space-y-1.5">
              <p className="font-mono text-sm tracking-widest text-primary font-medium">{input.filename}</p>
              {state === 'validated' && input.status === 'valid' && (
                <p className="font-mono text-xs text-secondary">
                  {(input.sizeBytes / 1024).toFixed(1)} KB · {input.featuresDetected} features detected
                </p>
              )}
            </div>
          )}

          <div className="mt-5 text-center">
            {state === 'ingesting' ? (
              <p className="text-xs tracking-widest uppercase text-muted font-mono animate-pulse">Validating Input...</p>
            ) : state === 'validated' && input?.status === 'valid' ? (
              <p className="text-xs tracking-widest uppercase text-success font-mono font-medium">Input Validated</p>
            ) : (
              <p className="text-xs tracking-widest uppercase text-danger font-mono">Unsupported Format (.csv or .dcm required)</p>
            )}
          </div>
        </div>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: state === 'validated' ? 1 : 0 }}
        >
          <button
            onClick={onContinue}
            disabled={state !== 'validated' || (input?.status !== 'invalid' && input?.status !== 'valid')}
            className="group focus-ring inline-flex items-center gap-2 px-8 py-3 bg-primary text-canvas font-mono text-xs tracking-widest uppercase hover:bg-secondary active:scale-[0.985] transition-all"
          >
            CONTINUE TO CONFIGURATION
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    )
  }

  // ---- 2. A Phase 1 dataset is already active — resume card ----
  if (dataset) {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="w-full p-6 md:p-8 rounded border border-line-strong bg-surface-raised flex flex-col items-center shadow-xs">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent/10 border border-accent/30 text-accent">
            <CheckCircle2 className="size-6 stroke-[2]" />
          </div>

          <div className="text-center space-y-1 mb-6">
            <div className="font-mono text-[10px] tracking-widest uppercase text-muted">
              ACTIVE DATASET LOADED
            </div>
            <h3 className="font-mono text-base font-semibold tracking-wide text-primary">
              {dataset.datasetName}
            </h3>
            <p className="font-mono text-xs text-secondary">
              {dataset.rowCount.toLocaleString()} rows · {dataset.columnCount} columns · Target:{' '}
              <span className="text-primary font-medium">{dataset.targetColumn || 'Unassigned'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {canContinue ? (
              <button
                type="button"
                onClick={() => navigate('/app/preprocessing')}
                className="focus-ring inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-canvas font-mono text-xs tracking-widest uppercase hover:bg-secondary active:scale-[0.985] transition-all rounded shadow-xs"
              >
                CONTINUE TO PREPROCESSING
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/app/data')}
                className="focus-ring inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-canvas font-mono text-xs tracking-widest uppercase hover:bg-secondary active:scale-[0.985] transition-all rounded shadow-xs"
              >
                COMPLETE DATA VALIDATION
                <ArrowRight className="size-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/app/data')}
              className="focus-ring inline-flex items-center gap-2 px-4 py-2.5 border border-line bg-surface text-secondary font-mono text-xs tracking-widest uppercase hover:border-line-strong hover:text-primary active:scale-[0.985] transition-all rounded"
            >
              VIEW DATASET
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="focus-ring inline-flex items-center gap-1.5 px-3 py-2.5 text-muted hover:text-danger font-mono text-xs tracking-widest uppercase transition-colors"
              title="Clear active dataset and start new analysis"
            >
              <RotateCcw className="size-3" />
              RESET
            </button>
          </div>
        </div>

        <ConfirmDialog
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          onConfirm={handleConfirmReset}
          title="START NEW ANALYSIS?"
          description={`This will clear the active dataset (${dataset.datasetName}) and diagnostic configuration. Completed records in History will remain untouched.`}
          confirmLabel="START NEW ANALYSIS"
          cancelLabel="CANCEL"
          tone="danger"
        />
      </div>
    )
  }

  // ---- 3. Nothing active on either workflow — offer both entry points,
  //         clearly distinguished so neither reads as a duplicate of the other ----
  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="w-full p-8 md:p-10 border-2 border-dashed rounded border-line bg-surface/50 hover:border-line-strong flex flex-col items-center justify-center text-center transition-colors duration-200">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent/10 border border-accent/20 text-accent">
          <Database className="size-6 stroke-[1.5]" />
        </div>

        <p className="text-base text-primary font-mono tracking-widest uppercase mb-1.5 font-medium">
          NO ACTIVE ANALYSIS IN PROGRESS
        </p>
        <p className="text-xs text-secondary mb-6 max-w-md leading-relaxed">
          Provide a biomedical dataset to begin ingestion and preprocessing.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleStartNew}
            className="group focus-ring inline-flex items-center gap-2 px-8 py-3 border border-accent bg-accent text-accent-fg font-mono text-xs tracking-widest uppercase hover:bg-accent-hover active:scale-[0.985] transition-all rounded shadow-xs"
          >
            START NEW ANALYSIS
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={handleLoadDemo}
            className="focus-ring inline-flex items-center gap-1.5 px-4 py-3 border border-line bg-surface text-secondary hover:text-primary hover:border-line-strong font-mono text-xs tracking-widest uppercase active:scale-[0.985] transition-all rounded"
          >
            <Sparkles className="size-3.5 text-accent" />
            LOAD DEMO DATASET
          </button>
        </div>

        <div className="mt-8 flex items-center gap-4 text-[11px] text-muted font-mono">
          <span>SUPPORTED FORMAT: .CSV</span>
          <span>·</span>
          <span>MAX SIZE: 15 MB</span>
          <span>·</span>
          <span>STRUCTURED CLINICAL RECORDS</span>
        </div>
      </div>

      {/* Divider — the pre-existing analysis/quantum demo workflow, kept
          reachable and clearly labeled as a separate path from the above. */}
      <div className="w-full flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
          Existing Analysis / Demo Workflow
        </span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".csv,.dcm" />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full p-6 md:p-8 border-2 border-dashed rounded flex flex-col items-center justify-center text-center transition-colors duration-200 ${
          isDragging ? 'border-accent bg-accent/5' : 'border-line bg-surface/50 hover:border-line-strong'
        }`}
      >
        <Upload className={`size-5 mb-2.5 ${isDragging ? 'text-accent' : 'text-muted'}`} strokeWidth={1.5} />
        <p className="text-sm text-primary font-mono tracking-widest uppercase mb-1.5 font-medium">
          {isDragging ? 'RELEASE TO ADD CLINICAL DATA' : 'CONTINUE THE CONFIGURED ANALYSIS WORKFLOW'}
        </p>
        {!isDragging && (
          <p className="text-xs text-secondary mb-5 max-w-sm">
            Runs the existing quantum engine selection and simulated pipeline.
          </p>
        )}
        {!isDragging && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group focus-ring inline-flex items-center gap-2 px-6 py-2.5 border border-accent bg-accent text-accent-fg font-mono text-xs tracking-widest uppercase hover:bg-accent-hover active:scale-[0.985] transition-all"
          >
            + UPLOAD CLINICAL DATA
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
        {!isDragging && (
          <div className="mt-5 flex gap-4 text-xs text-muted font-mono">
            <span className="flex items-center gap-1"><FileType className="size-3" /> .CSV</span>
            <span className="flex items-center gap-1"><FileType className="size-3" /> .DCM</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          const fakeFile = new File(
            ['age,sex,cp,trestbps,chol,fbs,restecg,thalach\n63,1,3,145,233,1,0,150'],
            'clinical_dataset.csv',
            { type: 'text/csv' },
          )
          onUpload(fakeFile)
        }}
        className="focus-ring inline-flex items-center gap-1.5 font-mono text-[10px] text-muted hover:text-primary tracking-widest uppercase border border-line-subtle px-3 py-1.5 rounded hover:bg-surface-subtle transition-colors"
      >
        Load Demo clinical_dataset.csv
      </button>
    </div>
  )
}
