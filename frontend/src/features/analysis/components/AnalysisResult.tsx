import type { AnalysisResult as AnalysisResultType } from '../types/analysis'
import { useNavigate } from 'react-router-dom'


type Props = {
  result: AnalysisResultType
  onReset: () => void
}

export function AnalysisResult({ result, onReset }: Props) {
  const navigate = useNavigate()
  const isHighRisk = result.riskClassification === 'HIGH RISK'
  
  return (
    <div className="w-full flex flex-col items-center max-w-2xl">
      {/* Primary Result Hero */}
      <div className="text-center mb-12">
        <h2 className="font-mono text-[10px] tracking-widest text-muted uppercase mb-4">Simulated Analysis Output</h2>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
             <div className={`size-3 rounded-full ${isHighRisk ? 'bg-danger shadow-[0_0_12px_var(--color-danger)]' : 'bg-success'}`} />
             <span className={`font-display text-5xl tracking-widest ${isHighRisk ? 'text-danger' : 'text-success'}`}>
               {result.riskClassification}
             </span>
          </div>
          <span className="font-mono text-sm tracking-widest text-primary mt-2">
            {result.confidence.toFixed(1)}% CONFIDENCE
          </span>
        </div>
      </div>

      <div className="w-full border-t border-line" />

      {/* Structured Evidence */}
      <div className="w-full py-8 grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left Col: Evidence */}
        <div className="space-y-6">
          <h3 className="font-mono text-[10px] tracking-widest text-muted uppercase">Key Evidence</h3>
          <div className="space-y-4">
            {result.evidence.map((item, i) => (
              <div key={i} className="flex justify-between items-end border-b border-line-subtle pb-2">
                <span className="text-sm text-secondary font-sans">{item.feature}</span>
                <span className="font-mono text-xs text-primary">+{item.contribution.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Engine Metadata & Interpretation */}
        <div className="space-y-8">
           <div className="space-y-4">
             <h3 className="font-mono text-[10px] tracking-widest text-muted uppercase">Engine Specification</h3>
             <div className="flex flex-col gap-2">
               <div className="flex justify-between">
                 <span className="text-xs text-secondary font-sans">Backend</span>
                 <span className="text-xs text-primary font-mono uppercase">{result.engine}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-xs text-secondary font-sans">Environment</span>
                 <span className="text-xs text-primary font-mono uppercase">{result.execution}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-xs text-secondary font-sans">Scale</span>
                 <span className="text-xs text-primary font-mono uppercase">{result.qubits} Qubits</span>
               </div>
             </div>
           </div>

           <div className="space-y-3">
             <h3 className="font-mono text-[10px] tracking-widest text-muted uppercase">Classical Comparison</h3>
             <div className="flex justify-between items-center">
               <span className="text-xs text-secondary font-sans">HQD-Net</span>
               <span className="text-sm text-primary font-mono">{result.confidence.toFixed(1)}%</span>
             </div>
             <div className="flex justify-between items-center opacity-70">
               <span className="text-xs text-muted font-sans">Baseline</span>
               <span className="text-xs text-muted font-mono">{result.classicalBaseline.toFixed(1)}%</span>
             </div>
           </div>
        </div>
      </div>
      
      <div className="w-full border-t border-line py-8 text-center">
         <h3 className="font-mono text-[10px] tracking-widest text-muted uppercase mb-3">Clinical Interpretation</h3>
         <p className="text-sm text-secondary leading-relaxed max-w-lg mx-auto">
           The simulated result indicates elevated model-estimated risk based on the selected feature representation and attribution evidence.
         </p>
         <p className="text-[10px] text-danger font-mono uppercase tracking-widest mt-4">
           FOR RESEARCH REVIEW · NOT A CLINICAL DIAGNOSIS
         </p>
      </div>

      <div className="w-full flex justify-center items-center gap-6 mt-8">
        <button 
          onClick={onReset}
          className="focus-ring px-6 py-3 border border-line text-secondary font-mono text-xs tracking-widest uppercase hover:border-line-strong hover:text-primary transition-colors"
        >
          NEW ANALYSIS
        </button>
        <button 
          onClick={() => navigate('/app/history')}
          className="focus-ring px-6 py-3 bg-accent text-accent-fg font-mono text-xs tracking-widest uppercase hover:bg-accent-hover transition-colors"
        >
          VIEW FULL ANALYSIS →
        </button>
      </div>
    </div>
  )
}
