import { motion } from 'framer-motion'
import { CheckCircle2, Circle } from 'lucide-react'
import type { EngineType, AnalysisInput } from '../types/analysis'

type Props = {
  input: AnalysisInput | null
  selectedEngine: EngineType
  onSelect: (engine: EngineType) => void
  onConfirm: () => void
}

export function EngineSelector({ input, selectedEngine, onSelect, onConfirm }: Props) {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Compact Case Summary */}
      {input && (
        <div className="w-full flex items-center justify-between p-4 mb-8 border border-line bg-surface rounded-sm">
          <div className="flex items-center gap-3">
             <div className="size-2 rounded-full bg-success"></div>
             <div>
               <p className="font-mono text-sm tracking-widest text-primary">{input.filename}</p>
               <p className="text-[10px] text-secondary font-mono uppercase tracking-widest mt-1">
                 {input.featuresDetected} features detected · Validated
               </p>
             </div>
          </div>
        </div>
      )}

      {/* Engine Selection Modules */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VQC Module */}
        <button
          onClick={() => onSelect('VQC')}
          className={`group text-left relative p-6 border transition-all duration-300 focus-ring ${
            selectedEngine === 'VQC'
              ? 'border-accent bg-accent/5'
              : 'border-line bg-surface hover:border-line-strong'
          }`}
        >
          <div className="flex justify-between items-start mb-6">
            <span className="font-display text-2xl tracking-wider text-primary">VQC</span>
            {selectedEngine === 'VQC' ? (
              <CheckCircle2 className="size-5 text-accent" />
            ) : (
              <Circle className="size-5 text-muted group-hover:text-line-strong transition-colors" />
            )}
          </div>
          <div className="space-y-2">
            <p className="font-mono text-[10px] tracking-widest text-secondary uppercase">
              Variational Quantum Classifier
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Hybrid variational classification using a parameterized quantum circuit and classical dressing.
            </p>
          </div>
        </button>

        {/* QSVM Module */}
        <button
          onClick={() => onSelect('QSVM')}
          className={`group text-left relative p-6 border transition-all duration-300 focus-ring ${
            selectedEngine === 'QSVM'
              ? 'border-accent bg-accent/5'
              : 'border-line bg-surface hover:border-line-strong'
          }`}
        >
          <div className="flex justify-between items-start mb-6">
            <span className="font-display text-2xl tracking-wider text-primary">QSVM</span>
            {selectedEngine === 'QSVM' ? (
              <CheckCircle2 className="size-5 text-accent" />
            ) : (
              <Circle className="size-5 text-muted group-hover:text-line-strong transition-colors" />
            )}
          </div>
          <div className="space-y-2">
            <p className="font-mono text-[10px] tracking-widest text-secondary uppercase">
              Quantum Support Vector Machine
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Quantum kernel-based classification with classical SVM optimization.
            </p>
          </div>
        </button>
      </div>
      
      {/* Configuration Metadata */}
      <div className="w-full mt-8 p-6 border-t border-line grid grid-cols-2 md:grid-cols-4 gap-4 opacity-70">
         <div>
           <p className="text-[10px] text-muted font-mono tracking-widest uppercase mb-1">Input Features</p>
           <p className="text-xs text-primary font-mono">{input?.featuresDetected || 6}</p>
         </div>
         <div>
           <p className="text-[10px] text-muted font-mono tracking-widest uppercase mb-1">Available Qubits</p>
           <p className="text-xs text-primary font-mono">4</p>
         </div>
         <div>
           <p className="text-[10px] text-muted font-mono tracking-widest uppercase mb-1">Execution</p>
           <p className="text-xs text-primary font-mono uppercase">Local Simulator</p>
         </div>
         <div>
           <p className="text-[10px] text-muted font-mono tracking-widest uppercase mb-1">Encoding</p>
           <p className="text-xs text-primary font-mono uppercase">Angle Embedding</p>
         </div>
      </div>

      {/* Action */}
      <motion.div 
        className="mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: selectedEngine ? 1 : 0 }}
      >
         <button 
           onClick={onConfirm}
           disabled={!selectedEngine}
           className="group focus-ring inline-flex items-center gap-2 px-8 py-3 bg-primary text-canvas font-mono text-xs tracking-widest uppercase hover:bg-paper-sunken transition-colors"
         >
           CONFIRM CONFIGURATION
           <span className="group-hover:translate-x-1 transition-transform">→</span>
         </button>
      </motion.div>
    </div>
  )
}
