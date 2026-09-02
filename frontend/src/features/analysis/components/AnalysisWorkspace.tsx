import { motion, AnimatePresence } from 'framer-motion'
import { useAnalysisWorkflow } from '../hooks/useAnalysisWorkflow'
import { usePrefersReducedMotion } from '@/lib/utils/usePrefersReducedMotion'
import { DiagnosticInput } from './DiagnosticInput'
import { SystemStatusPanel } from './SystemStatusPanel'
import { EngineSelector } from './EngineSelector'
import { AnalysisConfirmation } from './AnalysisConfirmation'
import { ComputationalPipeline } from './ComputationalPipeline'
import { AnalysisResult } from './AnalysisResult'

export function AnalysisWorkspace() {
  const { state, input, configuration, result, actions } = useAnalysisWorkflow()
  const prefersReducedMotion = usePrefersReducedMotion()
  
  const transition: any = prefersReducedMotion 
    ? { duration: 0 } 
    : { duration: 0.3, ease: 'easeInOut' }
    
  return (
    <div className="w-full flex flex-col items-center relative pb-16">
      <SystemStatusPanel state={state} />
      
      {/* Dynamic Header */}
      <div className="mb-8 md:mb-12 text-center mt-4">
        <div className="font-mono text-[10px] tracking-widest uppercase text-muted mb-3">
          Analysis Workspace / 01
        </div>
        <h1 className="font-display text-4xl lg:text-5xl tracking-wider text-primary">
          {state === 'idle' || state === 'ingesting' || state === 'validated'
            ? 'START A NEW ANALYSIS'
            : state === 'configuring'
            ? 'CONFIGURE ANALYSIS'
            : state === 'confirmed'
            ? 'ANALYSIS READY'
            : state === 'complete' && result
            ? 'ANALYSIS COMPLETE'
            : state === 'error'
            ? 'ANALYSIS INTERRUPTED'
            : 'ANALYZING CLINICAL DATA'}
        </h1>
        <p className="mt-3 text-sm text-secondary mx-auto max-w-md leading-relaxed">
          {state === 'idle' || state === 'ingesting' || state === 'validated'
            ? 'Provide clinical data and let HQD-Net prepare a hybrid classical–quantum diagnostic analysis.'
            : state === 'configuring'
            ? 'Select the quantum analysis pathway for this validated input.'
            : state === 'complete' && result
            ? 'Review the simulated diagnostic outcome and evidence.'
            : state === 'error'
            ? 'Quantum backend unavailable.'
            : 'HQD-Net is executing the selected hybrid diagnostic pipeline.'}
        </p>
        
        {/* Technical line during analysis */}
        {['preprocessing', 'encoding', 'quantum', 'postprocessing', 'explainability'].includes(state) && (
          <p className="mt-4 font-mono text-[10px] tracking-widest uppercase text-muted">
            {configuration.engine} · {configuration.qubits} QUBITS · {configuration.execution}
          </p>
        )}
      </div>

      {/* Main Workspace Surface */}
      <div className="w-full max-w-[760px] mx-auto flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Input State */}
          {(state === 'idle' || state === 'ingesting' || state === 'validated') && (
            <motion.div
              key="input-stage"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } as any : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } as any : { opacity: 0, scale: 0.98 }}
              transition={transition}
              className="w-full flex flex-col items-center justify-center"
            >
               <DiagnosticInput 
                 state={state}
                 input={input}
                 onUpload={actions.handleUpload}
                 onContinue={actions.handleContinueToConfiguration}
               />
            </motion.div>
          )}
          
          {/* Configure Stage */}
          {state === 'configuring' && (
            <motion.div
              key="configure-stage"
              initial={prefersReducedMotion ? { opacity: 1 } as any : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } as any : { opacity: 0, scale: 0.98 }}
              transition={transition}
              className="w-full flex flex-col items-center justify-center"
            >
               <EngineSelector 
                 input={input}
                 selectedEngine={configuration.engine}
                 onSelect={actions.handleSelectEngine}
                 onConfirm={actions.handleConfirmEngine}
               />
            </motion.div>
          )}

          {/* Confirm Stage */}
          {state === 'confirmed' && (
            <motion.div
              key="confirm-stage"
              initial={prefersReducedMotion ? { opacity: 1 } as any : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } as any : { opacity: 0, scale: 0.98 }}
              transition={transition}
              className="w-full flex flex-col items-center justify-center"
            >
               <AnalysisConfirmation 
                 input={input}
                 configuration={configuration}
                 onStart={actions.handleStartAnalysis}
               />
            </motion.div>
          )}
          
          {/* Analysis/Pipeline Stage */}
          {(state === 'preprocessing' || state === 'encoding' || state === 'quantum' || state === 'postprocessing' || state === 'explainability' || (state === 'complete' && !result)) && (
            <motion.div
              key="analysis-stage"
              initial={prefersReducedMotion ? { opacity: 1 } as any : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } as any : { opacity: 0, scale: 0.98 }}
              transition={transition}
              className="w-full flex flex-col items-center justify-center"
            >
               <ComputationalPipeline state={state} />
            </motion.div>
          )}

          {/* Result Stage */}
          {state === 'complete' && result && (
            <motion.div
              key="result-stage"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } as any : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } as any : { opacity: 0, scale: 0.98 }}
              transition={transition}
              className="w-full flex flex-col items-center justify-center pt-4"
            >
               <AnalysisResult result={result} onReset={actions.handleReset} />
            </motion.div>
          )}
          
          {/* Error Stage */}
          {state === 'error' && (
            <motion.div
              key="error-stage"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } as any : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } as any : { opacity: 0, scale: 0.98 }}
              transition={transition}
              className="w-full"
            >
              <div className="p-8 border border-danger/30 rounded-md bg-danger/5 flex flex-col items-center justify-center text-center">
                 <p className="text-danger font-mono text-xs uppercase tracking-wider mb-2">Simulation Interrupted</p>
                 <p className="text-xs text-secondary mb-4">The computational backend could not complete execution.</p>
                 <button onClick={actions.handleReset} className="px-6 py-2.5 bg-accent text-accent-fg font-mono text-xs uppercase tracking-wider hover:bg-accent-hover transition-colors">
                   Reset Workspace
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
