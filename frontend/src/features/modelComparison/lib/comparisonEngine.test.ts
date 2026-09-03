import { describe, expect, it } from 'vitest'
import {
  calculateDifference,
  checkDomainCompatibility,
  determineAgreement,
  determineComparisonStatus,
  determineReviewPriority,
} from './comparisonEngine'
import type { ModelOutputSummary } from '../types/modelComparison'

describe('comparisonEngine pure logic', () => {
  const classicalFeatures = ['age', 'bmi', 'glucose', 'blood_pressure', 'smoker']
  const quantumNativeFeatures = [
    'biomarker_04',
    'biomarker_01',
    'biomarker_00',
    'biomarker_02',
    'biomarker_03',
  ]

  it('detects disjoint input domains and flags incompatible-domains', () => {
    const check = checkDomainCompatibility(
      classicalFeatures,
      quantumNativeFeatures,
      'sampleDataset.ts',
      'clinical_data_synthetic.csv'
    )
    expect(check.isCompatible).toBe(false)
    expect(check.status).toBe('incompatible-domains')
    expect(check.featureOverlapCount).toBe(0)
    expect(check.reason).toContain('disjoint')
  })

  it('identifies compatible domains when features align', () => {
    const check = checkDomainCompatibility(
      ['feat_a', 'feat_b', 'feat_c'],
      ['feat_a', 'feat_b', 'feat_c'],
      'benchmark.csv',
      'benchmark.csv'
    )
    expect(check.isCompatible).toBe(true)
    expect(check.status).toBe('compatible')
    expect(check.featureOverlapCount).toBe(3)
  })

  it('refuses to declare agreement when domains are not compatible', () => {
    const agreement = determineAgreement('Normal', 'Normal', false)
    expect(agreement).toBe('not-comparable')
  })

  it('determines agreement when compatible and labels match', () => {
    const agreement = determineAgreement('Normal', 'Normal', true)
    expect(agreement).toBe('agree')
  })

  it('determines disagreement when compatible and labels differ', () => {
    const agreement = determineAgreement('Normal', 'High Risk', true)
    expect(agreement).toBe('disagree')
  })

  it('calculates probability differences accurately and neutrally', () => {
    const classical: ModelOutputSummary = {
      modelName: 'Logistic Regression',
      modelType: 'logistic-regression',
      executionStatus: 'trained',
      predictionLabel: 'Normal',
      confidencePercent: 72,
      probabilities: { Normal: 0.72, 'High Risk': 0.28 },
      featureCount: 5,
      featureNames: classicalFeatures,
      inputDomain: 'clinical_demo',
      metrics: null,
      computationalMetadata: { architecture: 'Linear', framework: 'JS', executionEnvironment: 'Browser', numericPrecision: 'float64' },
    }

    const quantum: ModelOutputSummary = {
      modelName: 'DressedVQC',
      modelType: 'dressed-vqc',
      executionStatus: 'complete',
      predictionLabel: 'Normal',
      confidencePercent: 71.95,
      probabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
      featureCount: 10,
      featureNames: quantumNativeFeatures,
      inputDomain: 'synthetic_vqc',
      metrics: null,
      computationalMetadata: { architecture: 'DressedVQC', framework: 'PennyLane', executionEnvironment: 'Python', numericPrecision: 'float64' },
    }

    const diff = calculateDifference(classical, quantum, true)
    expect(diff).not.toBeNull()
    expect(diff?.predictedClassMatches).toBe(true)
    expect(diff?.probabilityGapPercentagePoints).toBeCloseTo(0.05, 2)
  })

  it('assigns review-required priority on model disagreement', () => {
    const priority = determineReviewPriority('disagree', null, null)
    expect(priority).toBe('review-required')
  })

  it('assigns low priority on unanimous Normal agreement', () => {
    const classical: Partial<ModelOutputSummary> = { predictionLabel: 'Normal' }
    const priority = determineReviewPriority('agree', classical as ModelOutputSummary, null)
    expect(priority).toBe('low')
  })

  it('assigns high priority on unanimous High Risk agreement', () => {
    const classical: Partial<ModelOutputSummary> = { predictionLabel: 'High Risk' }
    const priority = determineReviewPriority('agree', classical as ModelOutputSummary, null)
    expect(priority).toBe('high')
  })

  it('determines correct ComparisonStatus across states', () => {
    expect(determineComparisonStatus(false, false, true, false, false)).toBe('idle')
    expect(determineComparisonStatus(true, false, true, false, false)).toBe('classical-only')
    expect(determineComparisonStatus(false, true, true, false, false)).toBe('quantum-only')
    expect(determineComparisonStatus(true, true, false, false, false)).toBe('incompatible-domains')
    expect(determineComparisonStatus(true, true, true, false, false)).toBe('compatible')
    expect(determineComparisonStatus(true, true, true, true, false)).toBe('loading')
    expect(determineComparisonStatus(true, true, true, false, true)).toBe('error')
  })
})
