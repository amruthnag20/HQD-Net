import { useRef, useState } from 'react'
import { Upload, FileWarning, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { IngestionStage } from '../hooks/useDatasetIngestion'

type Props = {
  stage: IngestionStage
  errorMessage: string | null
  onUpload: (file: File) => void
  onLoadSample: () => void
  onRetry: () => void
}

/** Empty / loading / error states for the upload step. The "ready" state
 *  (dataset loaded) is rendered by the rest of IngestionWorkspace instead. */
export function DatasetDropzone({ stage, errorMessage, onUpload, onLoadSample, onRetry }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busy = stage === 'loading'

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (busy) return
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (busy) return
    if (e.dataTransfer.files?.length) onUpload(e.dataTransfer.files[0])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onUpload(e.target.files[0])
    e.target.value = ''
  }

  if (stage === 'loading') {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-line-subtle bg-surface p-14 text-center">
        <Loader2 className="size-6 animate-spin text-accent" />
        <p className="text-sm font-medium text-primary">Parsing dataset</p>
        <p className="text-xs text-secondary">Analyzing structure…</p>
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger/30 bg-danger-muted p-14 text-center">
        <FileWarning className="size-6 text-danger" />
        <p className="text-sm font-medium text-danger">Dataset could not be loaded</p>
        <p className="max-w-md text-xs text-secondary">{errorMessage}</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center gap-5">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".csv" />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full rounded-2xl border-2 border-dashed p-12 md:p-16 flex flex-col items-center justify-center text-center transition-colors duration-150 ${
          isDragging ? 'border-accent bg-accent-muted' : 'border-line bg-surface hover:border-line-strong'
        }`}
      >
        <Upload className={`size-6 mb-3 ${isDragging ? 'text-accent' : 'text-muted'}`} strokeWidth={1.5} />
        <p className="text-base font-medium text-primary mb-1.5">
          {isDragging ? 'Release to load dataset' : 'No dataset loaded'}
        </p>
        {!isDragging && (
          <p className="text-sm text-secondary mb-6 max-w-sm">
            Upload a biomedical CSV dataset to begin ingestion.
          </p>
        )}
        {!isDragging && (
          <Button variant="accent" onClick={() => fileInputRef.current?.click()} rightIcon={<Upload className="size-3.5" />}>
            Upload CSV
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={onLoadSample}
        className="focus-ring rounded-full border border-line-subtle px-3.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:bg-surface-subtle hover:text-primary"
      >
        Load sample dataset
      </button>
    </div>
  )
}
