import { Check, X } from 'lucide-react'
import type { AnalysisRecord } from '../types/history'
import { Tooltip } from '@/components/ui/Tooltip'

type Props = {
  record: AnalysisRecord
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  'PREPROCESS': 'Continuous tabular features normalized and min-max scaled.',
  'ENCODE': 'Features angle-embedded into quantum state vectors.',
  'QUANTUM': 'Parameterized circuit gates executed on statevector simulator.',
  'POST-PROCESS': 'Expectation values calculated and passed through classical layers.',
  'EXPLAINABILITY': 'SHAP and qubit contribution attributions derived.',
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
        <div className="flex flex-col gap-1 p-2.5 bg-surface/50 border border-line-subtle rounded-sm">
          <span className="font-sans text-[10px] text-muted uppercase tracking-wider">ENGINE</span>
          <span className="font-mono text-xs text-primary uppercase font-medium">{record.engine}</span>
        </div>
        <div className="flex flex-col gap-1 p-2.5 bg-surface/50 border border-line-subtle rounded-sm">
          <span className="font-sans text-[10px] text-muted uppercase tracking-wider">BACKEND</span>
          <span className="font-mono text-xs text-primary uppercase font-medium">{execution.backend}</span>
        </div>
        <div className="flex flex-col gap-1 p-2.5 bg-surface/50 border border-line-subtle rounded-sm">
          <span className="font-sans text-[10px] text-muted uppercase tracking-wider">QUBITS</span>
          <span className="font-mono text-xs text-primary uppercase font-medium">{execution.qubits} Qubits</span>
        </div>
        <div className="flex flex-col gap-1 p-2.5 bg-surface/50 border border-line-subtle rounded-sm">
          <span className="font-sans text-[10px] text-muted uppercase tracking-wider">ENCODING</span>
          <span className="font-mono text-xs text-primary uppercase font-medium">{execution.encoding}</span>
        </div>
        <div className="flex flex-col gap-1 p-2.5 bg-surface/50 border border-line-subtle rounded-sm">
          <span className="font-sans text-[10px] text-muted uppercase tracking-wider">DURATION</span>
          <span className="font-mono text-xs text-primary uppercase font-medium">{(execution.durationMs / 1000).toFixed(1)}s</span>
        </div>
        <div className="flex flex-col gap-1 p-2.5 bg-surface/50 border border-line-subtle rounded-sm">
          <span className="font-sans text-[10px] text-muted uppercase tracking-wider">STATUS</span>
          <span className={`font-mono text-xs uppercase font-medium ${status === 'FAILED' ? 'text-danger' : 'text-success'}`}>
            {status}
          </span>
        </div>
      </div>

      <div className="w-full border-t border-line-subtle pt-4">
        <span className="font-mono text-[10px] text-muted uppercase tracking-widest block mb-3">Computational Stages</span>
        <div className="flex flex-col gap-2">
          {stages.map((stage, i) => (
            <Tooltip key={i} content={STAGE_DESCRIPTIONS[stage.label] || ''} side="top">
              <div className="flex justify-between items-center p-2 hover:bg-surface-subtle rounded transition-colors cursor-help">
                 <span className="font-mono text-[10px] text-secondary tracking-widest uppercase">{stage.label}</span>
                 {stage.completed ? (
                   <span className="flex items-center gap-1 text-[10px] font-mono text-success">
                     <Check className="w-3.5 h-3.5" />
                     PASSED
                   </span>
                 ) : status === 'FAILED' && !stage.completed ? (
                   <span className="flex items-center gap-1 text-[10px] font-mono text-danger">
                     <X className="w-3.5 h-3.5" />
                     HALTED
                   </span>
                 ) : (
                   <span className="font-mono text-[10px] text-muted">—</span>
                 )}
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  )
}
