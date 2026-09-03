import { useState, useMemo, useEffect, useCallback, useContext, type ReactNode } from 'react'
import { useClassicalMl } from '@/features/classicalMl/hooks/useClassicalMl'
import { ModelComparisonContext } from '@/features/modelComparison/context/modelComparison-context'
import {
  buildQuantumExplanationFromVqcResult,
  buildClassicalExplanationFromResult,
  EXPLAINABILITY_FIXTURES,
  fetchBackendExplainability,
  type BackendExplainabilityResponse,
} from '../api/explainabilityAdapter'
import {
  ExplainabilityContext,
  type ExplainabilityContextValue,
} from './explainability-context'
import type {
  ExplainabilityResult,
  ExplanationModel,
  ExplanationScope,
} from '../types/explainability'

const UNAVAILABLE_RESULT: ExplainabilityResult = {
  status: 'not_started',
  scope: 'local',
  model: 'quantum',
  sampleId: '—',
  datasetName: '—',
  targetColumn: null,
  selectedClass: null,
  predictionLabel: null,
  probabilities: null,
  featureAttributions: null,
  sensitivityCurve: null,
  jacobian: null,
  globalImportance: null,
  preprocessingTrace: null,
  computationalMetadata: null,
  explanationWarnings: [],
  generatedAt: null,
  isDemoFixture: false,
  fixtureName: null,
  backendExplanationAvailable: false,
}

export function ExplainabilityProvider({ children }: { children: ReactNode }) {
  const { result: classicalResult } = useClassicalMl()
  const comparisonCtx = useContext(ModelComparisonContext)
  const nativeVqcResult = comparisonCtx?.quantumNativeResult ?? null

  const [activeFixtureKey, setActiveFixtureKey] = useState<string>('live')
  const [selectedModel, setSelectedModel] = useState<ExplanationModel>('quantum')
  const [scope, setScope] = useState<ExplanationScope>('local')
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backendAttributions, setBackendAttributions] = useState<BackendExplainabilityResponse | null>(null)

  // Attempt to fetch backend attributions once on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const resp = await fetchBackendExplainability(0, 'quantum')
        if (!cancelled) setBackendAttributions(resp)
      } catch {
        // non-blocking
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const refresh = useCallback(() => {
    setIsLoading(true)
    setError(null)
    fetchBackendExplainability(0, selectedModel)
      .then((resp) => setBackendAttributions(resp))
      .catch(() => setError('Explainability backend connection failed.'))
      .finally(() => setIsLoading(false))
  }, [selectedModel])

  const result = useMemo((): ExplainabilityResult => {
    // Fixture mode
    if (activeFixtureKey !== 'live' && EXPLAINABILITY_FIXTURES[activeFixtureKey]) {
      const f = EXPLAINABILITY_FIXTURES[activeFixtureKey]
      // Apply scope filter for global fixture
      if (scope === 'global') {
        return EXPLAINABILITY_FIXTURES.GLOBAL_EXPLANATION
      }
      return f
    }

    if (scope === 'global') {
      return EXPLAINABILITY_FIXTURES.GLOBAL_EXPLANATION
    }

    // Live mode — quantum (backend status is 'success' per FastAPI contract)
    if (selectedModel === 'quantum' && nativeVqcResult) {
      return buildQuantumExplanationFromVqcResult(nativeVqcResult, backendAttributions)
    }

    // Live mode — classical
    if (selectedModel === 'classical' && classicalResult && classicalResult.status === 'trained') {
      return buildClassicalExplanationFromResult(classicalResult, 0) ?? UNAVAILABLE_RESULT
    }

    return UNAVAILABLE_RESULT
  }, [activeFixtureKey, selectedModel, scope, nativeVqcResult, classicalResult, backendAttributions])

  const value = useMemo((): ExplainabilityContextValue => ({
    result,
    activeFixtureKey,
    setActiveFixtureKey,
    selectedModel,
    setSelectedModel,
    scope,
    setScope,
    selectedFeature,
    setSelectedFeature,
    isLoading,
    error,
    refresh,
  }), [result, activeFixtureKey, selectedModel, scope, selectedFeature, isLoading, error, refresh])

  return (
    <ExplainabilityContext.Provider value={value}>
      {children}
    </ExplainabilityContext.Provider>
  )
}
