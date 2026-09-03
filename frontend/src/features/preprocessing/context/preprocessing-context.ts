import { createContext } from 'react'
import type {
  CategoricalImputeStrategy,
  EncodingStrategy,
  MissingValueMode,
  NumericImputeStrategy,
  PreprocessingConfig,
  ProcessedDataset,
  ScalingStrategy,
} from '../types/preprocessing'

export type PreprocessingPhase = 'idle' | 'processing' | 'complete' | 'error'

export const PROCESSING_STEPS = ['Cleaning…', 'Encoding…', 'Filtering…', 'Scaling…', 'Validating…'] as const

export type PreprocessingContextValue = {
  config: PreprocessingConfig
  phase: PreprocessingPhase
  /** Index into PROCESSING_STEPS while phase === 'processing'; null otherwise. */
  processingStepIndex: number | null
  processed: ProcessedDataset | null
  errorMessage: string | null
  actions: {
    setMissingValueMode: (mode: MissingValueMode) => void
    setNumericImputeStrategy: (strategy: NumericImputeStrategy) => void
    setCategoricalImputeStrategy: (strategy: CategoricalImputeStrategy) => void
    setEncodingStrategy: (strategy: EncodingStrategy) => void
    setScalingStrategy: (strategy: ScalingStrategy) => void
    setVarianceThreshold: (value: number) => void
    setCorrelationThreshold: (value: number) => void
    setFeatureIncluded: (name: string, included: boolean) => void
    clearFeatureOverride: (name: string) => void
    apply: () => void
    reset: () => void
  }
}

export const PreprocessingContext = createContext<PreprocessingContextValue | null>(null)
