import { describe, expect, it } from 'vitest'
import {
  calculateDifference,
  checkDomainCompatibility,
  determineAgreement,
  determineComparisonStatus,
  determineReviewPriority,
} from '../lib/comparisonEngine'
import {
  buildLiveComparisonResult,
  DETERMINISTIC_FIXTURES,
} from '../api/comparisonAdapter'
import type { ClassicalModelResult } from '@/features/classicalMl/types/classicalMl'
import type { NativeQuantumPredictResponse } from '@/features/quantumMl/api/quantumApi'
import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'

describe('Phase 4 — Model Comparison Comprehensive Test Suite', () => {
  // Test 1: No results (Empty / Idle state)
  it('1. handles no results cleanly with idle status', () => {
    const res = buildLiveComparisonResult(null, null, null)
    expect(res.status).toBe('idle')
    expect(res.agreement).toBe('unavailable')
    expect(res.priority).toBe('undetermined')
    expect(res.classical).toBeNull()
    expect(res.quantum).toBeNull()
  })

  // Test 2: Classical only
  it('2. handles classical only state when quantum has not executed', () => {
    const mockClassical: ClassicalModelResult = {
      status: 'trained',
      modelType: 'logistic-regression',
      featureCount: 5,
      featureNames: ['f1', 'f2', 'f3', 'f4', 'f5'],
      targetColumn: 'diagnosis',
      positiveClass: '1',
      negativeClass: '0',
      predictions: [{ rowIndex: 0, actualClass: '0', predictedClass: '0', predictedProbability: 0.3, correct: true }],
      metrics: null,
      modelMetadata: null,
      errorMessage: null,
    }
    const res = buildLiveComparisonResult(mockClassical, null, null)
    expect(res.status).toBe('classical-only')
    expect(res.agreement).toBe('pending')
    expect(res.classical).not.toBeNull()
    expect(res.quantum).toBeNull()
  })

  // Test 3: Quantum only
  it('3. handles quantum only state when classical is not trained', () => {
    const mockQuantum: NativeQuantumPredictResponse = {
      status: 'complete',
      model: { name: 'DressedVQC', checkpoint: 'pth', wires: 10, layers: 2, feature_map: 'Angle', ansatz: 'Strong' },
      input: { source: 'data.csv', patient_id: 'PAT_1000', feature_count: 10, feature_names: ['b1', 'b2'], standardized_vector: [0.1, 0.2] },
      prediction: { class_index: 0, class_label: 'Normal', probabilities: { Normal: 0.75, 'High Risk': 0.25 } },
      quantum_telemetry: { device: 'default.qubit', wires: 10, precision: 'float64' },
    }
    const res = buildLiveComparisonResult(null, mockQuantum, null)
    expect(res.status).toBe('quantum-only')
    expect(res.agreement).toBe('pending')
    expect(res.classical).toBeNull()
    expect(res.quantum?.predictionLabel).toBe('Normal')
  })

  // Test 4: Both unavailable
  it('4. reports unavailable when both models are uninitiated', () => {
    const status = determineComparisonStatus(false, false, false, false, false)
    expect(status).toBe('idle')
  })

  // Test 5: Compatible results
  it('5. identifies compatible results when feature manifests align', () => {
    const feats = ['biomarker_01', 'biomarker_02', 'biomarker_03']
    const check = checkDomainCompatibility(feats, feats, 'benchmark.csv', 'benchmark.csv')
    expect(check.isCompatible).toBe(true)
    expect(check.status).toBe('compatible')
  })

  // Test 6: Incompatible results (Scientific safeguard)
  it('6. rejects direct comparison for disjoint input domains', () => {
    const check = checkDomainCompatibility(
      ['age', 'bmi', 'glucose'],
      ['biomarker_00', 'biomarker_01', 'biomarker_02'],
      'clinical_demo.csv',
      'clinical_data_synthetic.csv'
    )
    expect(check.isCompatible).toBe(false)
    expect(check.status).toBe('incompatible-domains')
    expect(check.reason).toContain('disjoint')
  })

  // Test 7: Models agree
  it('7. detects model agreement when both predict Normal', () => {
    const agreement = determineAgreement('Normal', 'Normal', true)
    expect(agreement).toBe('agree')
  })

  // Test 8: Models disagree
  it('8. detects model disagreement and flags review-required', () => {
    const agreement = determineAgreement('Normal', 'High Risk', true)
    expect(agreement).toBe('disagree')
    const priority = determineReviewPriority(agreement, null, null)
    expect(priority).toBe('review-required')
  })

  // Test 9: Missing metrics
  it('9. handles missing evaluation metrics without throwing or fabricating zeroes', () => {
    const mockClassical: ClassicalModelResult = {
      status: 'trained',
      modelType: 'logistic-regression',
      featureCount: 2,
      featureNames: ['f1', 'f2'],
      targetColumn: null,
      positiveClass: null,
      negativeClass: null,
      predictions: null,
      metrics: null, // intentionally null
      modelMetadata: null,
      errorMessage: null,
    }
    const res = buildLiveComparisonResult(mockClassical, null, null)
    expect(res.classical?.metrics).toBeNull()
  })

  // Test 10: API failure / Error state
  it('10. propagates error status properly', () => {
    const status = determineComparisonStatus(true, true, true, false, true)
    expect(status).toBe('error')
  })

  // Test 11: Loading state
  it('11. returns loading status during active evaluation', () => {
    const status = determineComparisonStatus(false, false, false, true, false)
    expect(status).toBe('loading')
  })

  // Test 12: Deterministic demo adapter
  it('12. ensures all deterministic fixtures are valid and reproducible', () => {
    for (const [key, fixture] of Object.entries(DETERMINISTIC_FIXTURES)) {
      expect(fixture.isDemoFixture).toBe(true)
      expect(fixture.patientId).toBeTruthy()
      expect(fixture.inputCompatibility).toBeDefined()
      expect(key).toBeTruthy()
    }
  })

  // Test 13: Probability difference calculation
  it('13. computes probability gap accurately', () => {
    const classical = DETERMINISTIC_FIXTURES.COMPATIBLE_AGREEMENT.classical!
    const quantum = DETERMINISTIC_FIXTURES.COMPATIBLE_AGREEMENT.quantum!
    const diff = calculateDifference(classical, quantum, true)
    expect(diff?.probabilityGapPercentagePoints).toBeCloseTo(0.15, 2)
  })

  // Test 14: Comparison status calculation
  it('14. calculates all comparison statuses deterministically', () => {
    expect(determineComparisonStatus(true, true, false, false, false)).toBe('incompatible-domains')
    expect(determineComparisonStatus(true, true, true, false, false)).toBe('compatible')
  })

  // Test 15: Patient identity rendering
  it('15. correctly formats patient identity from dataset index', () => {
    const mockProcessed: Partial<ProcessedDataset> = { datasetName: 'demo.csv' }
    const res0 = buildLiveComparisonResult(null, null, mockProcessed as ProcessedDataset, 0)
    expect(res0.patientId).toBe('PAT_1000')

    const res5 = buildLiveComparisonResult(null, null, mockProcessed as ProcessedDataset, 5)
    expect(res5.patientId).toBe('PAT_1005')
  })

  // Test 16: Priority rules
  it('16. assigns low priority on agreement on Normal and high priority on High Risk', () => {
    const cNormal = { predictionLabel: 'Normal' } as any
    const cHigh = { predictionLabel: 'High Risk' } as any
    expect(determineReviewPriority('agree', cNormal, null)).toBe('low')
    expect(determineReviewPriority('agree', cHigh, null)).toBe('high')
    expect(determineReviewPriority('not-comparable', cNormal, null)).toBe('undetermined')
  })
})
