import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AnalysisResult as AnalysisResultType } from '../types/analysis'
import { useNavigate } from 'react-router-dom'
import { Tooltip } from '@/components/ui/Tooltip'
import { HelpCircle, ChevronDown, ChevronUp, ArrowRight, RotateCcw } from 'lucide-react'

type Props = {
  result: AnalysisResultType
  onReset: () => void
}

export function AnalysisResult({ result, onReset }: Props) {
  const navigate = useNavigate()
  const [showFullAttribution, setShowFullAttribution] = useState(false)
  const isHighRisk = result.riskClassification === 'HIGH RISK'
  
  // Show top 3 evidence items by default, full list on disclosure
  const displayedEvidence = showFullAttribution ? result.evidence : result.evidence.slice(0, 3)

  return (
    <div className="w-full flex flex-col items-center max-w-2xl">
      {/* Primary Result Hero */}
      <div className="text-center mb-10">
        <h2 className="font-mono text-[10px] tracking-widest text-muted uppercase mb-3">Simulated Analysis Output</h2>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
             <div className={`size-3 rounded-full ${isHighRisk ? 'bg-danger shadow-[0_0_12px_var(--color-danger)]' : 'bg-success shadow-[0_0_12px_var(--color-success)]'}`} />
             <span className={`font-display text-5xl tracking-widest ${isHighRisk ? 'text-danger' : 'text-success'}`}>
               {result.riskClassification}
             </span>
          </div>
          
          <div className="flex items-center gap-1.5 mt-2">
            <span className="font-mono text-sm tracking-widest text-primary font-medium">
              {result.confidence.toFixed(1)}% CONFIDENCE
            </span>
            <Tooltip 
              content="Calibrated posterior probability from the simulated quantum-classical classifier, indicating relative confidence for this input vector." 
              side="top"
            >
              <button type="button" className="text-muted hover:text-primary focus-ring p-0.5 rounded cursor-help">
                <HelpCircle className="size-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-line" />

      {/* Structured Evidence & Benchmark */}
      <div className="w-full py-8 grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left Col: Evidence with Progressive Disclosure */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-mono text-[10px] tracking-widest text-muted uppercase">Key Evidence (Attribution)</h3>
            <span className="font-mono text-[10px] text-muted">SHAP + Weight</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {displayedEvidence.map((item, i) => (
                <motion.div 
                  key={item.feature} 
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="flex justify-between items-end border-b border-line-subtle pb-2"
                >
                  <span className="text-xs text-secondary font-sans">{item.feature}</span>
                  <span className="font-mono text-xs text-primary font-medium">+{item.contribution.toFixed(2)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {result.evidence.length > 3 && (
            <button
              type="button"
              onClick={() => setShowFullAttribution(!showFullAttribution)}
              className="focus-ring mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-accent hover:text-accent-hover tracking-wider uppercase transition-colors"
            >
              {showFullAttribution ? (
                <>
                  <ChevronUp className="size-3" />
                  Show Top Contributors
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" />
                  View Full Attribution ({result.evidence.length} features)
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Col: Engine Metadata & Benchmark Comparison */}
        <div className="space-y-6">
           <div className="space-y-3">
             <h3 className="font-mono text-[10px] tracking-widest text-muted uppercase">Execution Specification</h3>
             <div className="flex flex-col gap-2 p-3 bg-surface border border-line-subtle rounded-sm text-xs font-mono">
               <div className="flex justify-between">
                 <span className="text-secondary">Backend</span>
                 <span className="text-primary uppercase">{result.engine}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-secondary">Environment</span>
                 <span className="text-primary uppercase">{result.execution}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-secondary">Scale</span>
                 <span className="text-primary uppercase">{result.qubits} Qubits</span>
               </div>
             </div>
           </div>

           <div className="space-y-3">
             <div className="flex justify-between items-center">
               <h3 className="font-mono text-[10px] tracking-widest text-muted uppercase">Classical vs Quantum</h3>
               <span className="font-mono text-[10px] text-muted">Comparative Score</span>
             </div>
             
             {/* Quantum Score */}
             <div className="space-y-1">
               <div className="flex justify-between items-center text-xs font-mono">
                 <span className="text-secondary">HQD-Net ({result.engine})</span>
                 <span className="text-primary font-medium">{result.confidence.toFixed(1)}%</span>
               </div>
               <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden">
                 <motion.div 
                   className="h-full bg-accent"
                   initial={{ width: 0 }}
                   animate={{ width: `${result.confidence}%` }}
                   transition={{ duration: 0.8, ease: 'easeOut' }}
                 />
               </div>
             </div>

             {/* Classical Baseline */}
             <div className="space-y-1">
               <div className="flex justify-between items-center text-xs font-mono opacity-70">
                 <span className="text-muted">Classical Baseline</span>
                 <span className="text-muted">{result.classicalBaseline.toFixed(1)}%</span>
               </div>
               <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden opacity-70">
                 <motion.div 
                   className="h-full bg-muted"
                   initial={{ width: 0 }}
                   animate={{ width: `${result.classicalBaseline}%` }}
                   transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                 />
               </div>
             </div>
           </div>
        </div>
      </div>
      
      <div className="w-full border-t border-line py-6 text-center">
         <h3 className="font-mono text-[10px] tracking-widest text-muted uppercase mb-2">Clinical Interpretation</h3>
         <p className="text-sm text-secondary leading-relaxed max-w-lg mx-auto">
           The simulated result indicates {isHighRisk ? 'elevated' : 'nominal'} model-estimated risk based on the selected feature representation and attribution evidence.
         </p>
         <p className="text-[10px] text-danger font-mono uppercase tracking-widest mt-3">
           FOR RESEARCH REVIEW · NOT A CLINICAL DIAGNOSIS
         </p>
      </div>

      <div className="w-full flex justify-center items-center gap-4 mt-6">
        <button 
          type="button"
          onClick={onReset}
          className="focus-ring inline-flex items-center gap-2 px-6 py-3 border border-line text-secondary font-mono text-xs tracking-widest uppercase hover:border-line-strong hover:text-primary active:scale-[0.985] transition-all rounded-sm"
        >
          <RotateCcw className="size-3.5" />
          NEW ANALYSIS
        </button>
        <button 
          type="button"
          onClick={() => navigate('/app/history')}
          className="group focus-ring inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-fg font-mono text-xs tracking-widest uppercase hover:bg-accent-hover active:scale-[0.985] transition-all rounded-sm"
        >
          VIEW ARCHIVE RECORD
          <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
