import { Check, X } from 'lucide-react'
import type { AnalysisRecord } from '../types/history'

type Props = {
  record: AnalysisRecord
}

export function ExecutionAudit({ record }: Props) {
  const { execution, status } = record
  
  const stages = [
    { label: 'PREPROCESS', completed: execution.stages.preprocess },
    { label: 'ENCODE', completed: execution.stages.encode },
    { label: 'QUANTUM', completed: execution.stages.quantum },
    { label: 'POST-PROCESS', completed: execution.stages.postprocess },
    { label: 'EXPLAINABILITY', completed: execution.stages.explainability },
  ]

  return (
    <div className="w-full space-y-6">
      <h3 className="font-mono text-xs text-muted tracking-widest uppercase border-b border-line-subtle pb-2">Execution Audit</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-sans text-[10px] text-secondary">ENGINE</span>
          <span className="font-mono text-xs text-primary uppercase">{record.engine}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-sans text-[10px] text-secondary">BACKEND</span>
          <span className="font-mono text-xs text-primary uppercase">{execution.backend}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-sans text-[10px] text-secondary">QUBITS</span>
          <span className="font-mono text-xs text-primary uppercase">{execution.qubits}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-sans text-[10px] text-secondary">ENCODING</span>
          <span className="font-mono text-xs text-primary uppercase">{execution.encoding}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-sans text-[10px] text-secondary">DURATION</span>
          <span className="font-mono text-xs text-primary uppercase">{(execution.durationMs / 1000).toFixed(1)}s</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-sans text-[10px] text-secondary">STATUS</span>
          <span className={`font-mono text-xs uppercase ${status === 'FAILED' ? 'text-danger' : 'text-success'}`}>
            {status}
          </span>
        </div>
      </div>

      <div className="w-full border-t border-line-subtle pt-6">
        <div className="flex flex-col gap-3">
          {stages.map((stage, i) => (
            <div key={i} className="flex justify-between items-center">
               <span className="font-mono text-[10px] text-secondary tracking-widest uppercase">{stage.label}</span>
               {stage.completed ? (
                 <Check className="w-3 h-3 text-success" />
               ) : status === 'FAILED' && !stage.completed ? (
                 <X className="w-3 h-3 text-danger" />
               ) : (
                 <span className="font-mono text-[10px] text-muted">—</span>
               )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
