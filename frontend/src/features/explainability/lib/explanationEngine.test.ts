import { describe, expect, it } from 'vitest'
import {
  calculateContributionMagnitude,
  contributionDirection,
  formatContribution,
  getExplanationCoverage,
  getExplanationStatus,
  getTopContributors,
  rankFeatureContributions,
  validateExplanationPayload,
} from './explanationEngine'
import type { ExplainabilityResult, FeatureAttribution } from '../types/explainability'

const makeAttr = (name: string, contribution: number | null): FeatureAttribution => ({
  featureName: name,
  rank: null,
  rawValue: null,
  standardizedValue: null,
  contribution,
  magnitude: null,
  direction: null,
  sensitivity: null,
  unit: null,
})

const baseResult = (): ExplainabilityResult => ({
  status: 'available',
  scope: 'local',
  model: 'quantum',
  sampleId: 'PAT_1000',
  datasetName: 'clinical_data_synthetic.csv',
  targetColumn: 'diagnosis',
  selectedClass: 'Normal',
  predictionLabel: 'Normal',
  probabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
  featureAttributions: [
    makeAttr('biomarker_04', 0.42),
    makeAttr('biomarker_01', 0.28),
    makeAttr('biomarker_15', 0.17),
    makeAttr('biomarker_18', -0.08),
  ],
  sensitivityCurve: null,
  jacobian: null,
  globalImportance: null,
  preprocessingTrace: null,
  computationalMetadata: null,
  explanationWarnings: [],
  generatedAt: '2026-09-03T00:00:00Z',
  isDemoFixture: true,
  fixtureName: 'test',
  backendExplanationAvailable: false,
})

describe('explanationEngine', () => {
  it('rankFeatureContributions ranks by descending magnitude', () => {
    const attrs = [makeAttr('a', 0.1), makeAttr('b', -0.5), makeAttr('c', 0.3)]
    const ranked = rankFeatureContributions(attrs)
    expect(ranked[0].featureName).toBe('b')
    expect(ranked[0].magnitude).toBeCloseTo(0.5)
    expect(ranked[0].rank).toBe(1)
  })

  it('getTopContributors returns top N by magnitude', () => {
    const attrs = [
      makeAttr('a', 0.1),
      makeAttr('b', -0.5),
      makeAttr('c', 0.3),
      makeAttr('d', 0.05),
      makeAttr('e', -0.4),
    ]
    const top2 = getTopContributors(attrs, 2)
    expect(top2).toHaveLength(2)
    expect(top2[0].featureName).toBe('b')
    expect(top2[1].featureName).toBe('e')
  })

  it('contributionDirection returns correct direction', () => {
    expect(contributionDirection(0.5)).toBe('positive')
    expect(contributionDirection(-0.3)).toBe('negative')
    expect(contributionDirection(0)).toBe('neutral')
    expect(contributionDirection(null)).toBeNull()
  })

  it('calculateContributionMagnitude returns absolute value', () => {
    expect(calculateContributionMagnitude(-0.42)).toBeCloseTo(0.42)
    expect(calculateContributionMagnitude(0.28)).toBeCloseTo(0.28)
    expect(calculateContributionMagnitude(null)).toBeNull()
  })

  it('getExplanationStatus returns available when all features have contributions', () => {
    const result = baseResult()
    expect(getExplanationStatus(result)).toBe('available')
  })

  it('getExplanationStatus returns partial when some features lack contributions', () => {
    const result = baseResult()
    result.featureAttributions = [makeAttr('a', 0.5), makeAttr('b', null)]
    expect(getExplanationStatus(result)).toBe('partial')
  })

  it('getExplanationStatus returns unavailable when no attributions exist', () => {
    const result = baseResult()
    result.featureAttributions = []
    expect(getExplanationStatus(result)).toBe('unavailable')
  })

  it('getExplanationStatus returns not_started when no prediction label', () => {
    const result = baseResult()
    result.predictionLabel = null
    expect(getExplanationStatus(result)).toBe('not_started')
  })

  it('getExplanationCoverage counts correctly', () => {
    const result = baseResult()
    const { covered, total } = getExplanationCoverage(result)
    expect(total).toBe(4)
    expect(covered).toBe(4)
  })

  it('validateExplanationPayload warns on invalid probabilities', () => {
    const result = baseResult()
    result.probabilities = { Normal: 0.5, 'High Risk': 0.7 } // sums to 1.2
    const warnings = validateExplanationPayload(result)
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some((w) => w.includes('sum'))).toBe(true)
  })

  it('validateExplanationPayload warns on non-finite contribution', () => {
    const result = baseResult()
    result.featureAttributions = [makeAttr('bad', Infinity)]
    const warnings = validateExplanationPayload(result)
    expect(warnings.some((w) => w.includes('non-finite'))).toBe(true)
  })

  it('formatContribution shows + prefix for positive values', () => {
    expect(formatContribution(0.42)).toBe('+0.420')
    expect(formatContribution(-0.08)).toBe('-0.080')
    expect(formatContribution(null)).toBe('—')
  })
})
