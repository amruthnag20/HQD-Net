import { useContext } from 'react'
import { ExplainabilityContext, type ExplainabilityContextValue } from '../context/explainability-context'

export function useExplainability(): ExplainabilityContextValue {
  const ctx = useContext(ExplainabilityContext)
  if (!ctx) {
    throw new Error('useExplainability must be used within an ExplainabilityProvider')
  }
  return ctx
}
