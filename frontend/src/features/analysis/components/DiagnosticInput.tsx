import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileType, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import type { WorkflowState, AnalysisInput } from '../types/analysis'

type Props = {
  state: WorkflowState
  input: AnalysisInput | null
  onUpload: (file: File) => void
  onContinue: () => void
}

export function DiagnosticInput({ state, input, onUpload, onContinue }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (state !== 'idle') return
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (state !== 'idle') return
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0])
    }
  }

  // If we're not idle, show the ingestion/validation state
  if (state !== 'idle') {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="w-full p-8 rounded border border-line-strong bg-surface-raised flex flex-col items-center shadow-sm">
          
          {/* Icon state */}
          <div className="mb-5">
            {state === 'ingesting' ? (
              <Loader2 className="size-8 text-accent animate-spin" />
            ) : state === 'validated' && input?.status === 'valid' ? (
              <CheckCircle className="size-8 text-success" />
            ) : (
              <AlertCircle className="size-8 text-danger" />
            )}
          </div>

          {/* Details */}
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

          {/* Status Message */}
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

        {/* Action */}
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

  return (
    <div className="w-full flex flex-col items-center">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
        accept=".csv,.dcm"
      />
      
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full p-8 md:p-12 border-2 border-dashed rounded flex flex-col items-center justify-center text-center transition-colors duration-200 ${
          isDragging ? 'border-accent bg-accent/5' : 'border-line bg-surface/50 hover:border-line-strong'
        }`}
      >
        <Upload className={`size-6 mb-3 ${isDragging ? 'text-accent' : 'text-muted'}`} strokeWidth={1.5} />
        
        <p className="text-sm text-primary font-mono tracking-widest uppercase mb-1.5 font-medium">
          {isDragging ? 'RELEASE TO ADD CLINICAL DATA' : 'PROVIDE CLINICAL DATA'}
        </p>
        
        {!isDragging && (
          <p className="text-xs text-secondary mb-6 max-w-sm">
            Enter structured diagnostic information or upload supported clinical files.
          </p>
        )}
        
        {!isDragging && (
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group focus-ring inline-flex items-center gap-2 px-6 py-3 border border-accent bg-accent text-accent-fg font-mono text-xs tracking-widest uppercase hover:bg-accent-hover active:scale-[0.985] transition-all"
          >
            + UPLOAD CLINICAL DATA
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
        
        {!isDragging && (
          <div className="mt-6 flex gap-4 text-xs text-muted font-mono">
            <span className="flex items-center gap-1"><FileType className="size-3" /> .CSV</span>
            <span className="flex items-center gap-1"><FileType className="size-3" /> .DCM</span>
          </div>
        )}
      </div>
      
      <div className="mt-5 text-center">
         <button 
           type="button"
           onClick={() => {
             const fakeFile = new File(["age,sex,cp,trestbps,chol,fbs,restecg,thalach\n63,1,3,145,233,1,0,150"], "clinical_dataset.csv", { type: "text/csv" })
             onUpload(fakeFile)
           }}
           className="focus-ring inline-flex items-center gap-1.5 font-mono text-[10px] text-muted hover:text-primary tracking-widest uppercase border border-line-subtle px-3 py-1.5 rounded hover:bg-surface-subtle transition-colors"
         >
           Load Demo clinical_dataset.csv
         </button>
      </div>
    </div>
  )
}
