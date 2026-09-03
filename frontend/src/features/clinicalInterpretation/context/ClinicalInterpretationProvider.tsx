import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ExplainabilityContext } from '@/features/explainability/context/explainability-context'
import { ModelComparisonContext } from '@/features/modelComparison/context/modelComparison-context'
import { DatasetIngestionContext } from '@/features/ingestion/context/dataset-context'
import {
  buildLiveClinicalInterpretation,
  fetchBackendClinicalAnalysis,
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
 * Priority chain:
 *  1. Fixture mode → deterministic demo content.
 *  2. Backend clinical analysis → real RF + VQC + RAG + clinical report from
 *     POST /api/clinical-analysis (fetched once on mount).
 *  3. Live fallback → honest but sparse result built from upstream
 *     Explainability + Comparison contexts (no narrative / evidence).
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

  // Backend-generated clinical interpretation (null until backend responds)
  const [backendClinical, setBackendClinical] = useState<ClinicalInterpretationResult | null>(null)

  // Fetch backend clinical analysis on mount
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    void fetchBackendClinicalAnalysis().then((result) => {
      if (!cancelled) {
        if (result) {
          setBackendClinical(result)
        }
        setIsLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(() => {
    setIsLoading(true)
    setError(null)
    void fetchBackendClinicalAnalysis().then((result) => {
      if (result) {
        setBackendClinical(result)
      }
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })
  }, [])

  const interpretation = useMemo((): ClinicalInterpretationResult => {
    // 1. Fixtures always win when explicitly selected
    if (activeFixtureKey !== 'live' && CLINICAL_INTERPRETATION_FIXTURES[activeFixtureKey]) {
      return CLINICAL_INTERPRETATION_FIXTURES[activeFixtureKey]
    }

    // 2. Backend clinical analysis (real RF + VQC + RAG pipeline)
    if (activeFixtureKey === 'live' && backendClinical !== null) {
      return backendClinical
    }

    // 3. Live fallback from upstream contexts
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
  }, [activeFixtureKey, backendClinical, explainabilityCtx?.result, comparisonCtx?.comparisonResult, datasetCtx?.dataset])

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
