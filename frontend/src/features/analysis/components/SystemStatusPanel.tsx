import { motion } from 'framer-motion'
import type { WorkflowState } from '../types/analysis'

type Props = {
  state: WorkflowState
}

export function SystemStatusPanel({ state }: Props) {
  const getStatusText = () => {
    switch (state) {
      case 'idle':
      case 'ingesting':
        return 'READY'
      case 'validated':
      case 'configuring':
      case 'confirmed':
        return 'INPUT VALIDATED'
      case 'complete':
        return 'ANALYSIS COMPLETE'
      case 'error':
        return 'BACKEND DEGRADED'
      default:
        // preprocessing, encoding, quantum, postprocessing, explainability
        return 'EXECUTION ACTIVE'
    }
  }

  const getStatusColor = () => {
    switch (state) {
      case 'error':
        return 'bg-danger shadow-[0_0_4px_var(--color-danger)]'
      case 'preprocessing':
      case 'encoding':
      case 'quantum':
      case 'postprocessing':
      case 'explainability':
        return 'bg-accent shadow-[0_0_4px_var(--color-accent)]'
      case 'complete':
        return 'bg-success shadow-[0_0_4px_var(--color-success)]'
      default:
        return 'bg-success shadow-[0_0_4px_var(--color-success)]'
    }
  }

  const isPulsing = ['preprocessing', 'encoding', 'quantum', 'postprocessing', 'explainability'].includes(state)

  return (
    <div className="hidden sm:flex absolute top-0 right-0 flex-col items-end pointer-events-none">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-widest text-muted uppercase">SYSTEM</span>
        <div className="relative flex items-center justify-center">
          <motion.div 
            className={`size-2 rounded-full ${getStatusColor()}`}
            layout
          />
          {isPulsing && (
            <motion.div
              className={`absolute inset-0 rounded-full ${getStatusColor()}`}
              animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </div>
      </div>
      <div className="mt-1 font-mono text-[10px] tracking-widest uppercase text-secondary">
        {getStatusText()}
      </div>
    </div>
  )
}
