import { createContext } from 'react'
import type { ExplainabilityResult, ExplanationModel, ExplanationScope } from '../types/explainability'

export type ExplainabilityContextValue = {
  result: ExplainabilityResult
  activeFixtureKey: string
  setActiveFixtureKey: (key: string) => void
  selectedModel: ExplanationModel
  setSelectedModel: (m: ExplanationModel) => void
  scope: ExplanationScope
  setScope: (s: ExplanationScope) => void
  selectedFeature: string | null
  setSelectedFeature: (name: string | null) => void
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export const ExplainabilityContext = createContext<ExplainabilityContextValue | null>(null)
