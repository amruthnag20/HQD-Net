import { motion } from 'framer-motion'
import { CheckCircle2, Circle, HelpCircle, ArrowRight } from 'lucide-react'
import type { EngineType, AnalysisInput } from '../types/analysis'
import { Tooltip } from '@/components/ui/Tooltip'

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
        <div className="w-full flex items-center justify-between p-4 mb-6 border border-line bg-surface rounded-sm">
          <div className="flex items-center gap-3">
             <div className="size-2 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
             <div>
               <p className="font-mono text-sm tracking-widest text-primary font-medium">{input.filename}</p>
               <p className="text-[10px] text-secondary font-mono uppercase tracking-widest mt-0.5">
                 {input.featuresDetected} features detected · Input Validated
               </p>
             </div>
          </div>
          <span className="font-mono text-[10px] text-muted uppercase tracking-widest hidden sm:inline">
            Local Pipeline
          </span>
        </div>
      )}

      {/* Engine Selection Modules */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VQC Module */}
        <button
          type="button"
          onClick={() => onSelect('VQC')}
          className={`group text-left relative p-6 border transition-all duration-200 focus-ring rounded-sm ${
            selectedEngine === 'VQC'
              ? 'border-accent bg-accent/10 shadow-sm'
              : 'border-line bg-surface hover:border-line-strong hover:bg-surface-raised'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="font-display text-2xl tracking-wider text-primary">VQC</span>
              <p className="font-mono text-[10px] tracking-widest text-secondary uppercase mt-0.5">
                Variational Quantum Classifier
              </p>
            </div>
            {selectedEngine === 'VQC' ? (
              <CheckCircle2 className="size-5 text-accent shrink-0" />
            ) : (
              <Circle className="size-5 text-muted group-hover:text-line-strong transition-colors shrink-0" />
            )}
          </div>
          <p className="text-xs text-secondary leading-relaxed mb-4">
            Parameterized hybrid quantum circuit with trainable rotation gates and classical optimizer dressing.
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-muted">
            <span className="border border-line-subtle px-2 py-0.5 rounded bg-canvas/60">4 Qubits</span>
            <span className="border border-line-subtle px-2 py-0.5 rounded bg-canvas/60">2-Layer Ansatz</span>
            <span className="border border-line-subtle px-2 py-0.5 rounded bg-canvas/60">Angle Embedding</span>
          </div>
        </button>

        {/* QSVM Module */}
        <button
          type="button"
          onClick={() => onSelect('QSVM')}
          className={`group text-left relative p-6 border transition-all duration-200 focus-ring rounded-sm ${
            selectedEngine === 'QSVM'
              ? 'border-accent bg-accent/10 shadow-sm'
              : 'border-line bg-surface hover:border-line-strong hover:bg-surface-raised'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="font-display text-2xl tracking-wider text-primary">QSVM</span>
              <p className="font-mono text-[10px] tracking-widest text-secondary uppercase mt-0.5">
                Quantum Support Vector Machine
              </p>
            </div>
            {selectedEngine === 'QSVM' ? (
              <CheckCircle2 className="size-5 text-accent shrink-0" />
            ) : (
              <Circle className="size-5 text-muted group-hover:text-line-strong transition-colors shrink-0" />
            )}
          </div>
          <p className="text-xs text-secondary leading-relaxed mb-4">
            Quantum fidelity kernel mapping features to high-dimensional Hilbert space with classical SVM dual optimization.
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-muted">
            <span className="border border-line-subtle px-2 py-0.5 rounded bg-canvas/60">Quantum Kernel</span>
            <span className="border border-line-subtle px-2 py-0.5 rounded bg-canvas/60">Dual C-SVC</span>
            <span className="border border-line-subtle px-2 py-0.5 rounded bg-canvas/60">Fidelity Estimation</span>
          </div>
        </button>
      </div>
      
      {/* Dynamic Selected Engine Dependent Details */}
      <div className="w-full mt-6 p-4 border border-line-subtle bg-surface-subtle/50 rounded-sm grid grid-cols-2 md:grid-cols-4 gap-4">
         <div>
           <div className="flex items-center gap-1 mb-1">
             <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Input Features</span>
             <Tooltip content="Normalized clinical continuous & discrete variables" side="top">
               <HelpCircle className="size-2.5 text-muted hover:text-primary cursor-help" />
             </Tooltip>
           </div>
           <p className="text-xs text-primary font-mono font-medium">{input?.featuresDetected || 6} Parameters</p>
         </div>
         <div>
           <div className="flex items-center gap-1 mb-1">
             <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Target Qubits</span>
             <Tooltip content="Available simulated statevector qubits" side="top">
               <HelpCircle className="size-2.5 text-muted hover:text-primary cursor-help" />
             </Tooltip>
           </div>
           <p className="text-xs text-primary font-mono font-medium">4 Qubits</p>
         </div>
         <div>
           <div className="flex items-center gap-1 mb-1">
             <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Backend</span>
             <Tooltip content="Local PennyLane / Qiskit statevector execution simulator" side="top">
               <HelpCircle className="size-2.5 text-muted hover:text-primary cursor-help" />
             </Tooltip>
           </div>
           <p className="text-xs text-primary font-mono uppercase font-medium">Statevector (Local)</p>
         </div>
         <div>
           <div className="flex items-center gap-1 mb-1">
             <span className="text-[10px] text-muted font-mono tracking-widest uppercase">Method</span>
             <Tooltip content="Encoding scheme for mapping classical data onto qubit states" side="top">
               <HelpCircle className="size-2.5 text-muted hover:text-primary cursor-help" />
             </Tooltip>
           </div>
           <p className="text-xs text-primary font-mono uppercase font-medium">
             {selectedEngine === 'VQC' ? 'Angle Embedding' : 'Fidelity Kernel'}
           </p>
         </div>
      </div>

      {/* Action */}
      <motion.div 
        className="mt-8"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: selectedEngine ? 1 : 0, y: selectedEngine ? 0 : 6 }}
      >
         <button 
           type="button"
           onClick={onConfirm}
           disabled={!selectedEngine}
           className="group focus-ring inline-flex items-center gap-2 px-8 py-3 bg-primary text-canvas font-mono text-xs tracking-widest uppercase hover:bg-secondary active:scale-[0.985] transition-all rounded-sm"
         >
           CONFIRM {selectedEngine} CONFIGURATION
           <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
         </button>
      </motion.div>
    </div>
  )
}
