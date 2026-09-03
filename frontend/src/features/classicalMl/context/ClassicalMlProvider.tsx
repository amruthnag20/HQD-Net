import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePreprocessing } from '@/features/preprocessing/hooks/usePreprocessing'
import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import { assessTrainability } from '../lib/assessTrainability'
import { trainClassicalModel } from '../lib/trainClassicalModel'
import type { ClassicalModelResult } from '../types/classicalMl'
import { ClassicalMlContext, type ClassicalMlContextValue } from './classicalMl-context'

type TrainingState =
  | { kind: 'training'; forProcessed: ProcessedDataset }
  | { kind: 'result'; forProcessed: ProcessedDataset; result: ClassicalModelResult }

export function ClassicalMlProvider({ children }: { children: ReactNode }) {
  const { phase, processed } = usePreprocessing()

  // A fresh Phase 2 run means any in-flight/finished training belongs to a
  // dataset that no longer exists — derived during render (not an effect)
  // so a stale result never needs to be cleared, only ignored.
  const [trainingState, setTrainingState] = useState<TrainingState | null>(null)
  const current = trainingState && trainingState.forProcessed === processed ? trainingState : null
  const trainingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (trainingTimeoutRef.current) clearTimeout(trainingTimeoutRef.current)
  }, [])

  const assessment = useMemo(() => {
    if (phase !== 'complete' || !processed) return { status: 'idle' as const, message: null }
    return assessTrainability(processed)
  }, [phase, processed])

  const status = current?.kind === 'result' ? current.result.status : current?.kind === 'training' ? 'training' : assessment.status
  const statusMessage = current?.kind === 'result' ? current.result.errorMessage : assessment.message
  const result = current?.kind === 'result' ? current.result : null

  const train = useCallback(() => {
    if (!processed || assessment.status !== 'ready' || trainingTimeoutRef.current) return

    setTrainingState({ kind: 'training', forProcessed: processed })

    // A real, if fast, computation (leave-one-out logistic regression) —
    // deferred one tick so the UI actually paints the "training" state
    // rather than jumping straight to the finished result.
    trainingTimeoutRef.current = setTimeout(() => {
      trainingTimeoutRef.current = null
      const trained = trainClassicalModel(processed)
      setTrainingState({ kind: 'result', forProcessed: processed, result: trained })
    }, 0)
  }, [processed, assessment.status])

  const value: ClassicalMlContextValue = useMemo(() => ({
    status,
    statusMessage,
    result,
    actions: { train },
  }), [status, statusMessage, result, train])

  return (
    <ClassicalMlContext.Provider value={value}>
      {children}
    </ClassicalMlContext.Provider>
  )
}
