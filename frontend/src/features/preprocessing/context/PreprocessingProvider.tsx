import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDatasetIngestion } from '@/features/ingestion/hooks/useDatasetIngestion'
import { buildProcessedDataset } from '../lib/buildProcessedDataset'
import { DEFAULT_PREPROCESSING_CONFIG, type PreprocessingConfig, type ProcessedDataset } from '../types/preprocessing'
import { PROCESSING_STEPS, PreprocessingContext, type PreprocessingContextValue, type PreprocessingPhase } from './preprocessing-context'

const STEP_DURATION_MS = 220

export function PreprocessingProvider({ children }: { children: ReactNode }) {
  const { dataset } = useDatasetIngestion()

  const [config, setConfig] = useState<PreprocessingConfig>(DEFAULT_PREPROCESSING_CONFIG)
  const [phase, setPhase] = useState<PreprocessingPhase>('idle')
  const [processingStepIndex, setProcessingStepIndex] = useState<number | null>(null)
  const [processed, setProcessed] = useState<ProcessedDataset | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  // A config change after a completed run invalidates that result until the
  // user explicitly re-applies — Phase 2 never silently reprocesses.
  const invalidateIfComplete = useCallback(() => {
    setPhase((p) => (p === 'complete' || p === 'error' ? 'idle' : p))
  }, [])

  const updateConfig = useCallback((patch: Partial<PreprocessingConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
    invalidateIfComplete()
  }, [invalidateIfComplete])

  const setFeatureIncluded = useCallback((name: string, included: boolean) => {
    setConfig((prev) => ({ ...prev, featureOverrides: { ...prev.featureOverrides, [name]: included } }))
    invalidateIfComplete()
  }, [invalidateIfComplete])

  const clearFeatureOverride = useCallback((name: string) => {
    setConfig((prev) => {
      const next = { ...prev.featureOverrides }
      delete next[name]
      return { ...prev, featureOverrides: next }
    })
    invalidateIfComplete()
  }, [invalidateIfComplete])

  const apply = useCallback(() => {
    if (!dataset || intervalRef.current) return

    setPhase('processing')
    setErrorMessage(null)
    setProcessingStepIndex(0)

    let stepIndex = 0
    intervalRef.current = setInterval(() => {
      stepIndex += 1
      if (stepIndex >= PROCESSING_STEPS.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = null
        setProcessingStepIndex(null)
        try {
          const result = buildProcessedDataset(dataset, config)
          setProcessed(result)
          setPhase('complete')
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : 'Preprocessing could not complete.')
          setPhase('error')
        }
        return
      }
      setProcessingStepIndex(stepIndex)
    }, STEP_DURATION_MS)
  }, [dataset, config])

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setConfig(DEFAULT_PREPROCESSING_CONFIG)
    setPhase('idle')
    setProcessingStepIndex(null)
    setProcessed(null)
    setErrorMessage(null)
  }, [])

  const value: PreprocessingContextValue = useMemo(() => ({
    config,
    phase,
    processingStepIndex,
    processed,
    errorMessage,
    actions: {
      setMissingValueMode: (mode) => updateConfig({ missingValueMode: mode }),
      setNumericImputeStrategy: (strategy) => updateConfig({ numericImputeStrategy: strategy }),
      setCategoricalImputeStrategy: (strategy) => updateConfig({ categoricalImputeStrategy: strategy }),
      setEncodingStrategy: (strategy) => updateConfig({ encodingStrategy: strategy }),
      setScalingStrategy: (strategy) => updateConfig({ scalingStrategy: strategy }),
      setVarianceThreshold: (v) => updateConfig({ varianceThreshold: v }),
      setCorrelationThreshold: (v) => updateConfig({ correlationThreshold: v }),
      setFeatureIncluded,
      clearFeatureOverride,
      apply,
      reset,
    },
  }), [config, phase, processingStepIndex, processed, errorMessage, updateConfig, setFeatureIncluded, clearFeatureOverride, apply, reset])

  return (
    <PreprocessingContext.Provider value={value}>
      {children}
    </PreprocessingContext.Provider>
  )
}
