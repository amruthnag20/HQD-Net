import type { AnalysisInput, AnalysisConfiguration } from '../types/analysis'

type Props = {
  input: AnalysisInput | null
  configuration: AnalysisConfiguration
  onStart: () => void
}

export function AnalysisConfirmation({ input, configuration, onStart }: Props) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-lg p-8 border border-line bg-surface rounded-sm">
        
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-line pb-2">
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Input</span>
            <span className="text-sm text-primary font-mono">{input?.filename}</span>
          </div>
          
          <div className="flex justify-between items-end border-b border-line pb-2">
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Engine</span>
            <span className="text-sm text-primary font-mono">{configuration.engine}</span>
          </div>

          <div className="flex justify-between items-end border-b border-line pb-2">
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Features</span>
            <span className="text-sm text-primary font-mono">{input?.featuresDetected || 6}</span>
          </div>

          <div className="flex justify-between items-end border-b border-line pb-2">
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Qubits</span>
            <span className="text-sm text-primary font-mono">{configuration.qubits}</span>
          </div>

          <div className="flex justify-between items-end border-b border-line pb-2">
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Execution</span>
            <span className="text-sm text-primary font-mono uppercase">{configuration.execution}</span>
          </div>
        </div>
        
      </div>

      <div className="mt-8">
         <button 
           onClick={onStart}
           className="group focus-ring inline-flex items-center gap-2 px-8 py-3 bg-accent text-accent-fg font-display tracking-widest text-sm rounded-sm hover:bg-accent-hover transition-colors"
         >
           CONFIRM & RUN
           <span className="group-hover:translate-x-1 transition-transform">→</span>
         </button>
      </div>
    </div>
  )
}
