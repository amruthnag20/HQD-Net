import { useMemo, type ReactNode } from 'react'
import { usePreprocessing } from '@/features/preprocessing/hooks/usePreprocessing'
import { buildQuantumResult } from '../lib/buildQuantumResult'
import { QuantumMlContext, type QuantumMlContextValue } from './quantumMl-context'

/** No training/execution action exists here — unlike Classical ML, nothing
 *  in this branch can actually run (see the audit in lib/quantumModelFacts.ts),
 *  so the result is a pure derivation from ProcessedDataset, recomputed only
 *  when a fresh Phase 2 run produces a new one. */
export function QuantumMlProvider({ children }: { children: ReactNode }) {
  const { phase, processed } = usePreprocessing()

  const result = useMemo(() => {
    if (phase !== 'complete' || !processed) return null
    return buildQuantumResult(processed)
  }, [phase, processed])

  const value: QuantumMlContextValue = useMemo(() => ({ result }), [result])

  return (
    <QuantumMlContext.Provider value={value}>
      {children}
    </QuantumMlContext.Provider>
  )
}
