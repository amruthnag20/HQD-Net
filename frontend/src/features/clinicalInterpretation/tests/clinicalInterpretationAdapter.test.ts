import { describe, expect, it } from 'vitest'
import {
  buildLiveClinicalInterpretation,
  CLINICAL_INTERPRETATION_FIXTURES,
  normalizeBackendClinicalResponse,
} from '../api/clinicalInterpretationAdapter'
import type { ExplainabilityResult } from '@/features/explainability/types/explainability'

const FIXTURE_KEYS = [
  'COMPLETE_CLINICAL_INTERPRETATION',
  'PARTIAL_INTERPRETATION',
  'EVIDENCE_UNAVAILABLE',
  'INTERPRETATION_UNAVAILABLE',
  'CLINICAL_ERROR',
]

function explanation(overrides: Partial<ExplainabilityResult> = {}): ExplainabilityResult {
  return {
    status: 'available',
    scope: 'local',
    model: 'quantum',
    sampleId: 'PAT-42',
    datasetName: 'demo.csv',
    targetColumn: 'diagnosis',
    selectedClass: 'Normal',
    predictionLabel: 'Normal',
    probabilities: { Normal: 0.6, 'High Risk': 0.4 },
    featureAttributions: [
      { featureName: 'f1', rank: 1, rawValue: null, standardizedValue: null, contribution: 0.2, magnitude: 0.2, direction: 'positive', sensitivity: null, unit: null },
      { featureName: 'f2', rank: 2, rawValue: null, standardizedValue: null, contribution: -0.1, magnitude: 0.1, direction: 'negative', sensitivity: null, unit: null },
    ],
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
    ...overrides,
  }
}

describe('CLINICAL_INTERPRETATION_FIXTURES', () => {
  it('defines all required deterministic fixtures', () => {
    for (const key of FIXTURE_KEYS) {
      expect(CLINICAL_INTERPRETATION_FIXTURES[key]).toBeDefined()
    }
  })
  it('marks every fixture as demo content', () => {
    for (const key of FIXTURE_KEYS) {
      expect(CLINICAL_INTERPRETATION_FIXTURES[key].isDemoFixture).toBe(true)
    }
  })
  it('uses only synthetic demo evidence identifiers', () => {
    for (const e of CLINICAL_INTERPRETATION_FIXTURES.COMPLETE_CLINICAL_INTERPRETATION.evidence) {
      expect(e.id.startsWith('DEMO-')).toBe(true)
      expect(e.isDemo).toBe(true)
    }
  })
})

describe('buildLiveClinicalInterpretation', () => {
  it('surfaces real model output but reports interpretation unavailable', () => {
    const result = buildLiveClinicalInterpretation({
      explanation: explanation(),
      comparison: null,
      sampleId: 'PAT-42',
      datasetName: 'demo.csv',
      model: 'Quantum',
    })
    expect(result.status).toBe('unavailable')
    expect(result.predictionLabel).toBe('Normal')
    expect(result.modelProbabilities).toEqual({ Normal: 0.6, 'High Risk': 0.4 })
    expect(result.backendInterpretationAvailable).toBe(false)
    // No fabricated clinical content.
    expect(result.evidence).toEqual([])
    expect(result.recommendations).toEqual([])
    expect(result.riskFactors).toEqual([])
    expect(result.priority).toBe('undetermined')
  })

  it('derives model-signal findings from explainability with correct provenance', () => {
    const result = buildLiveClinicalInterpretation({
      explanation: explanation(),
      comparison: null,
      sampleId: 'PAT-42',
      datasetName: 'demo.csv',
      model: 'Quantum',
    })
    expect(result.keyFindings.length).toBe(2)
    expect(result.keyFindings[0].provenance).toBe('explainability')
    expect(result.keyFindings.every((f) => f.relatedEvidenceIds.length === 0)).toBe(true)
  })

  it('returns not_started when there is no model output', () => {
    const result = buildLiveClinicalInterpretation({
      explanation: explanation({ predictionLabel: null, probabilities: null, featureAttributions: null }),
      comparison: null,
      sampleId: '—',
      datasetName: '—',
      model: '—',
    })
    expect(result.status).toBe('not_started')
  })
})

describe('normalizeBackendClinicalResponse', () => {
  it('fills nullable defaults without fabricating content', () => {
    const result = normalizeBackendClinicalResponse(
      { predictionLabel: 'High Risk' },
      { sampleId: 'PAT-9', datasetName: 'd.csv', model: 'Classical' },
    )
    expect(result.sampleId).toBe('PAT-9')
    expect(result.predictionLabel).toBe('High Risk')
    expect(result.evidence).toEqual([])
    expect(result.priority).toBe('undetermined')
    expect(result.backendInterpretationAvailable).toBe(true)
    expect(result.metadata.source).toBe('backend')
  })
})
