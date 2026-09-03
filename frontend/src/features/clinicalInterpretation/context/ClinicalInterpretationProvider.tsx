import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ExplainabilityContext } from '@/features/explainability/context/explainability-context'
import { ModelComparisonContext } from '@/features/modelComparison/context/modelComparison-context'
import { DatasetIngestionContext } from '@/features/ingestion/context/dataset-context'
import {
  buildLiveClinicalInterpretation,
  CLINICAL_INTERPRETATION_FIXTURES,
} from '../api/clinicalInterpretationAdapter'
import { ClinicalContext, type ClinicalContextValue } from './clinical-context'
import type { ClinicalInterpretationResult } from '../types/clinicalInterpretation'

const NOT_STARTED: ClinicalInterpretationResult = {
  status: 'not_started',
  sampleId: '—',
  datasetName: '—',
  selectedModel: '—',
  predictionLabel: null,
  modelProbabilities: null,
  narrative: {
    summary: null,
    keyFindings: null,
    riskInterpretation: null,
    evidenceContext: null,
    recommendedNextSteps: null,
  },
  keyFindings: [],
  riskFactors: [],
  evidence: [],
  recommendations: [],
  precautions: [],
  medicationInformation: [],
  priority: 'undetermined',
  interpretationConfidence: null,
  warnings: [],
  metadata: { model: null, modelVersion: null, generatedAt: null, source: 'pending' },
  generatedAt: null,
  isDemoFixture: false,
  fixtureName: null,
  backendInterpretationAvailable: false,
}

/**
 * Assembles the shared clinical interpretation state.
 *
 * In LIVE mode it consumes the real upstream Explainability + Model Comparison
 * results and produces an honest result: model output is shown, but the clinical
 * interpretation layer (narrative, evidence, recommendations, precautions,
 * medication, priority) is reported as unavailable because no validated backend
 * clinical/RAG/LLM endpoint is connected. Selecting a fixture swaps in deterministic,
 * clearly-labelled DEMO content for UI verification.
 */
export function ClinicalInterpretationProvider({ children }: { children: ReactNode }) {
  const explainabilityCtx = useContext(ExplainabilityContext)
  const comparisonCtx = useContext(ModelComparisonContext)
  const datasetCtx = useContext(DatasetIngestionContext)

  const [activeFixtureKey, setActiveFixtureKey] = useState<string>('live')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    // No backend clinical endpoint exists yet — refresh only clears transient error.
    setIsLoading(true)
    setError(null)
    setIsLoading(false)
  }, [])

  const interpretation = useMemo((): ClinicalInterpretationResult => {
    if (activeFixtureKey !== 'live' && CLINICAL_INTERPRETATION_FIXTURES[activeFixtureKey]) {
      return CLINICAL_INTERPRETATION_FIXTURES[activeFixtureKey]
    }

    const explanation = explainabilityCtx?.result ?? null
    if (!explanation) return NOT_STARTED

    const comparison = comparisonCtx?.comparisonResult ?? null
    const datasetName =
      explanation.datasetName ??
      comparison?.datasetSource ??
      datasetCtx?.dataset?.datasetName ??
      '—'
    const sampleId = explanation.sampleId ?? comparison?.patientId ?? '—'
    const model =
      explanation.computationalMetadata?.model ??
      (explanation.model === 'quantum' ? 'Quantum' : 'Classical')

    return buildLiveClinicalInterpretation({
      explanation,
      comparison,
      sampleId,
      datasetName,
      model,
    })
  }, [activeFixtureKey, explainabilityCtx?.result, comparisonCtx?.comparisonResult, datasetCtx?.dataset])

  const value = useMemo(
    (): ClinicalContextValue => ({
      interpretation,
      activeFixtureKey,
      setActiveFixtureKey,
      isLoading,
      error,
      refresh,
      selectedFindingId,
      setSelectedFindingId,
      selectedEvidenceId,
      setSelectedEvidenceId,
    }),
    [interpretation, activeFixtureKey, isLoading, error, refresh, selectedFindingId, selectedEvidenceId],
  )

  return <ClinicalContext.Provider value={value}>{children}</ClinicalContext.Provider>
}
