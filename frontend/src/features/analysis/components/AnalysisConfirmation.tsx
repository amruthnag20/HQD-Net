import { ArrowRight, CheckCircle2 } from 'lucide-react'
import type { AnalysisInput, AnalysisConfiguration } from '../types/analysis'

type Props = {
  input: AnalysisInput | null
  configuration: AnalysisConfiguration
  onStart: () => void
}

export function AnalysisConfirmation({ input, configuration, onStart }: Props) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-lg border border-line bg-surface/80 rounded-sm p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-line-subtle">
          <CheckCircle2 className="size-4 text-success" />
          <span className="font-mono text-xs tracking-widest text-primary uppercase font-medium">
            CONFIRM ANALYSIS SPECIFICATION
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-end border-b border-line-subtle pb-2.5">
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Target Dataset</span>
            <span className="text-sm text-primary font-mono font-medium">{input?.filename}</span>
          </div>
          
          <div className="flex justify-between items-end border-b border-line-subtle pb-2.5">
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Selected Engine</span>
            <span className="text-sm text-accent font-mono font-bold">{configuration.engine}</span>
          </div>

          <div className="flex justify-between items-end border-b border-line-subtle pb-2.5">
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Features Encoded</span>
            <span className="text-sm text-primary font-mono">{input?.featuresDetected || 6} Continuous Parameters</span>
          </div>

          <div className="flex justify-between items-end border-b border-line-subtle pb-2.5">
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Target Qubits</span>
            <span className="text-sm text-primary font-mono">{configuration.qubits} Qubits</span>
          </div>

          <div className="flex justify-between items-end border-b border-line-subtle pb-2.5">
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Runtime Backend</span>
            <span className="text-sm text-primary font-mono uppercase">{configuration.execution} (Local Statevector)</span>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-line-subtle flex justify-between items-center text-[10px] font-mono text-muted uppercase tracking-widest">
          <span>Simulation Environment</span>
          <span className="text-success">Ready for Execution</span>
        </div>
      </div>

      <div className="mt-8">
         <button 
           type="button"
           onClick={onStart}
           className="group focus-ring inline-flex items-center gap-2 px-8 py-3.5 bg-accent text-accent-fg font-mono text-xs tracking-widest uppercase rounded-sm hover:bg-accent-hover active:scale-[0.985] transition-all shadow-sm"
         >
           EXECUTE HYBRID ANALYSIS
           <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
         </button>
      </div>
    </div>
  )
}
