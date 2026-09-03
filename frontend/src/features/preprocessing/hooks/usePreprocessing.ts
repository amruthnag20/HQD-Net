import { useContext } from 'react'
import { PreprocessingContext, type PreprocessingContextValue } from '../context/preprocessing-context'

export function usePreprocessing(): PreprocessingContextValue {
  const ctx = useContext(PreprocessingContext)
  if (!ctx) {
    throw new Error('usePreprocessing must be used within a PreprocessingProvider')
  }
  return ctx
}
