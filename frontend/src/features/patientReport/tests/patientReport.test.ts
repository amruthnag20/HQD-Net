import { describe, expect, it } from 'vitest'
import { CLINICAL_INTERPRETATION_FIXTURES } from '@/features/clinicalInterpretation/api/clinicalInterpretationAdapter'
import type { ModelComparisonResult } from '@/features/modelComparison/types/modelComparison'
import type { ExplainabilityResult } from '@/features/explainability/types/explainability'
import {
  assemblePatientReport,
  emptyFeedback,
} from '../api/patientReportAdapter'
import {
  buildReportSummaryText,
  calculateReportCompleteness,
  completenessLabel,
  getReportStatus,
  isReportRenderable,
  reportStatusLabel,
} from '../lib/reportEngine'

const complete = CLINICAL_INTERPRETATION_FIXTURES.COMPLETE_CLINICAL_INTERPRETATION
const notStarted = { ...complete, status: 'not_started' as const, predictionLabel: null }

function comparison(): ModelComparisonResult {
  return {
    status: 'compatible',
    agreement: 'agree',
    priority: 'low',
    patientId: 'PAT-1000',
    targetColumn: 'diagnosis',
    datasetSource: 'demo.csv',
    inputCompatibility: {
      isCompatible: true,
      status: 'compatible',
      reason: 'Same input domain',
      classicalDomain: 'demo.csv',
      quantumDomain: 'demo.csv',
      featureOverlapCount: 10,
    },
    classical: {
      modelName: 'RandomForest',
      modelType: 'classical',
      executionStatus: 'trained',
      predictionLabel: 'Normal',
      confidencePercent: 70,
      probabilities: { Normal: 0.7, 'High Risk': 0.3 },
      featureCount: 10,
      featureNames: [],
      inputDomain: 'demo.csv',
      metrics: null,
      computationalMetadata: {
        architecture: 'RF',
        framework: 'sklearn',
        executionEnvironment: 'py',
        numericPrecision: 'float64',
      },
    },
    quantum: {
      modelName: 'DressedVQC',
      modelType: 'quantum',
      executionStatus: 'success',
      predictionLabel: 'Normal',
      confidencePercent: 71.95,
      probabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
      featureCount: 10,
      featureNames: [],
      inputDomain: 'demo.csv',
      metrics: null,
      computationalMetadata: {
        architecture: 'VQC',
        framework: 'pennylane',
        executionEnvironment: 'py',
        numericPrecision: 'float64',
      },
    },
    difference: {
      predictedClassMatches: true,
      normalProbabilityDelta: -0.0195,
      probabilityGapPercentagePoints: 1.95,
      confidenceDelta: -1.95,
      summaryText: 'Models agree on Normal',
    },
    generatedAt: '2026-09-03T00:00:00.000Z',
  }
}

function explanation(): ExplainabilityResult {
  return {
    ...CLINICAL_INTERPRETATION_FIXTURES.COMPLETE_CLINICAL_INTERPRETATION,
  } as unknown as ExplainabilityResult
}

describe('calculateReportCompleteness', () => {
  it('marks sections complete when data is present', () => {
    const feedback = emptyFeedback('', 'PAT-1000')
    const report = assemblePatientReport({
      clinical: complete,
      comparison: comparison(),
      explanation: explanation(),
      feedback,
      reportId: null,
    })
    const byKey = Object.fromEntries(report.completeness.map((c) => [c.key, c.status]))
    expect(byKey.model).toBe('complete')
    expect(byKey.interpretation).toBe('complete')
    expect(byKey.evidence).toBe('complete')
    expect(byKey.feedback).toBe('pending')
  })

  it('marks model/evidence unavailable when missing', () => {
    const entries = calculateReportCompleteness({
      clinical: { ...complete, evidence: [] },
      modelAnalysis: { available: false, classical: null, quantum: null, agreement: '', compatibility: '' },
      explainability: { available: false, method: null, topFeatures: [], sensitivityAvailable: false, quantumMetadata: null },
      feedback: emptyFeedback('', 'x'),
    })
    const byKey = Object.fromEntries(entries.map((c) => [c.key, c.status]))
    expect(byKey.model).toBe('unavailable')
    expect(byKey.evidence).toBe('unavailable')
  })
})

describe('getReportStatus', () => {
  it('is incomplete when interpretation is unavailable', () => {
    const clinical = CLINICAL_INTERPRETATION_FIXTURES.INTERPRETATION_UNAVAILABLE
    const feedback = emptyFeedback('', 'x')
    const completeness = calculateReportCompleteness({
      clinical,
      modelAnalysis: { available: true, classical: null, quantum: null, agreement: '', compatibility: '' },
      explainability: { available: false, method: null, topFeatures: [], sensitivityAvailable: false, quantumMetadata: null },
      feedback,
    })
    expect(getReportStatus({ clinical, completeness, feedback })).toBe('incomplete')
  })

  it('is reviewed once a clinician reviews', () => {
    const feedback = { ...emptyFeedback('', 'x'), reviewerStatus: 'reviewed' as const }
    const completeness = calculateReportCompleteness({
      clinical: complete,
      modelAnalysis: { available: true, classical: null, quantum: null, agreement: '', compatibility: '' },
      explainability: { available: true, method: 'm', topFeatures: [{ featureName: 'f', contribution: 0.1, direction: 'positive' }], sensitivityAvailable: true, quantumMetadata: null },
      feedback,
    })
    expect(getReportStatus({ clinical: complete, completeness, feedback })).toBe('reviewed')
  })
})

describe('isReportRenderable', () => {
  it('false without prediction / not started', () => {
    expect(isReportRenderable(notStarted)).toBe(false)
  })
  it('true for a complete interpretation', () => {
    expect(isReportRenderable(complete)).toBe(true)
  })
})

describe('buildReportSummaryText', () => {
  it('produces structured plain text with disclaimer and demo note', () => {
    const report = assemblePatientReport({
      clinical: complete,
      comparison: comparison(),
      explanation: explanation(),
      feedback: emptyFeedback('', 'PAT-1000'),
      reportId: null,
    })
    const text = buildReportSummaryText(report)
    expect(text).toContain('HQD-NET — PATIENT ANALYSIS REPORT')
    expect(text).toContain('EXECUTIVE SUMMARY')
    expect(text).toContain('Disclaimer:')
    expect(text).toContain('DEMO / DEVELOPMENT content')
  })
})

describe('label helpers', () => {
  it('reportStatusLabel + completenessLabel', () => {
    expect(reportStatusLabel('ready-for-review')).toBe('Ready for Review')
    expect(completenessLabel('unavailable')).toBe('Not available')
  })
})
