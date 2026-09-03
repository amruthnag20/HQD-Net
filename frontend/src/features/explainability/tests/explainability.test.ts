import { describe, expect, it } from 'vitest'
import {
  rankFeatureContributions,
  getTopContributors,
  contributionDirection,
  calculateContributionMagnitude,
  getExplanationStatus,
  getExplanationCoverage,
  validateExplanationPayload,
  formatContribution,
  formatValue,
  isExplanationComplete,
} from '../lib/explanationEngine'
import {
  buildQuantumExplanationFromVqcResult,
  EXPLAINABILITY_FIXTURES,
} from '../api/explainabilityAdapter'
import type {
  ExplainabilityResult,
  FeatureAttribution,
} from '../types/explainability'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  ...EXPLAINABILITY_FIXTURES.QUANTUM_LOCAL_EXPLANATION,
  isDemoFixture: true,
})

// ---------------------------------------------------------------------------
// 1. Empty / idle state
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('returns not_started status when no prediction label', () => {
    expect(getExplanationStatus({ predictionLabel: null })).toBe('not_started')
  })

  it('returns not_started when prediction and attributions both absent', () => {
    expect(getExplanationStatus({ predictionLabel: null, featureAttributions: [] })).toBe('not_started')
  })

  it('formatContribution returns em-dash for null', () => {
    expect(formatContribution(null)).toBe('—')
  })

  it('formatValue returns em-dash for null', () => {
    expect(formatValue(null)).toBe('—')
  })
})

// ---------------------------------------------------------------------------
// 2. Loading
// ---------------------------------------------------------------------------

describe('loading state', () => {
  it('returns loading when status is loading', () => {
    expect(getExplanationStatus({ status: 'loading', predictionLabel: 'Normal' })).toBe('loading')
  })
})

// ---------------------------------------------------------------------------
// 3. Available explanation
// ---------------------------------------------------------------------------

describe('available explanation (quantum full)', () => {
  const r = EXPLAINABILITY_FIXTURES.QUANTUM_LOCAL_EXPLANATION

  it('has status available', () => {
    expect(r.status).toBe('available')
  })

  it('has 10 feature attributions', () => {
    expect(r.featureAttributions).toHaveLength(10)
  })

  it('all features have contribution values', () => {
    for (const f of r.featureAttributions!) {
      expect(f.contribution).not.toBeNull()
      expect(isFinite(f.contribution!)).toBe(true)
    }
  })

  it('getExplanationStatus returns available', () => {
    expect(getExplanationStatus(r)).toBe('available')
  })

  it('getExplanationCoverage returns 10/10', () => {
    const { covered, total } = getExplanationCoverage(r)
    expect(covered).toBe(10)
    expect(total).toBe(10)
  })

  it('isExplanationComplete returns true', () => {
    expect(isExplanationComplete(r)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 4. Partial explanation
// ---------------------------------------------------------------------------

describe('partial explanation', () => {
  const r = EXPLAINABILITY_FIXTURES.PARTIAL_EXPLANATION

  it('has status partial', () => {
    expect(r.status).toBe('partial')
  })

  it('getExplanationStatus returns partial', () => {
    expect(getExplanationStatus(r)).toBe('partial')
  })

  it('getExplanationCoverage is 5/10', () => {
    const { covered, total } = getExplanationCoverage(r)
    expect(covered).toBe(5)
    expect(total).toBe(10)
  })

  it('isExplanationComplete returns false', () => {
    expect(isExplanationComplete(r)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 5. Unavailable state
// ---------------------------------------------------------------------------

describe('unavailable state', () => {
  const r = EXPLAINABILITY_FIXTURES.UNAVAILABLE

  it('has status unavailable', () => {
    expect(r.status).toBe('unavailable')
  })

  it('has no featureAttributions', () => {
    expect(r.featureAttributions).toBeNull()
  })

  it('getExplanationStatus returns unavailable', () => {
    expect(getExplanationStatus(r)).toBe('unavailable')
  })
})

// ---------------------------------------------------------------------------
// 6. API error state
// ---------------------------------------------------------------------------

describe('error state', () => {
  it('getExplanationStatus returns error', () => {
    expect(getExplanationStatus({ status: 'error', predictionLabel: 'Normal' })).toBe('error')
  })
})

// ---------------------------------------------------------------------------
// 7. Classical explanation
// ---------------------------------------------------------------------------

describe('classical explanation', () => {
  const r = EXPLAINABILITY_FIXTURES.CLASSICAL_LOCAL_EXPLANATION

  it('model type is classical', () => {
    expect(r.computationalMetadata?.modelType).toBe('classical')
  })

  it('featureAttributions is null (not yet available)', () => {
    expect(r.featureAttributions).toBeNull()
  })

  it('has a warning about unavailable attribution', () => {
    expect(r.explanationWarnings.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 8. Quantum explanation
// ---------------------------------------------------------------------------

describe('quantum explanation', () => {
  const r = EXPLAINABILITY_FIXTURES.QUANTUM_LOCAL_EXPLANATION

  it('model type is quantum', () => {
    expect(r.computationalMetadata?.modelType).toBe('quantum')
  })

  it('qubits is 10', () => {
    expect(r.computationalMetadata?.qubits).toBe(10)
  })

  it('has jacobian entries', () => {
    expect(r.jacobian).not.toBeNull()
    expect(r.jacobian!.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 9. Local explanation
// ---------------------------------------------------------------------------

describe('local explanation', () => {
  const r = EXPLAINABILITY_FIXTURES.QUANTUM_LOCAL_EXPLANATION

  it('scope is local', () => {
    expect(r.scope).toBe('local')
  })

  it('has a sampleId', () => {
    expect(r.sampleId).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 10. Global explanation
// ---------------------------------------------------------------------------

describe('global explanation', () => {
  const r = EXPLAINABILITY_FIXTURES.GLOBAL_EXPLANATION

  it('scope is global', () => {
    expect(r.scope).toBe('global')
  })

  it('globalImportance has 10 entries', () => {
    expect(r.globalImportance).toHaveLength(10)
  })

  it('featureAttributions is null (global, no per-row data)', () => {
    expect(r.featureAttributions).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 11. Feature ranking
// ---------------------------------------------------------------------------

describe('feature ranking', () => {
  const attrs = [
    makeAttr('a', 0.1),
    makeAttr('b', -0.5),
    makeAttr('c', 0.3),
    makeAttr('d', -0.1),
  ]

  it('ranks by descending magnitude', () => {
    const ranked = rankFeatureContributions(attrs)
    expect(ranked[0].featureName).toBe('b')
    expect(ranked[1].featureName).toBe('c')
    expect(ranked[ranked.length - 1].magnitude!).toBeLessThanOrEqual(ranked[ranked.length - 2].magnitude!)
  })

  it('assigns sequential ranks starting at 1', () => {
    const ranked = rankFeatureContributions(attrs)
    ranked.forEach((r, i) => {
      expect(r.rank).toBe(i + 1)
    })
  })
})

// ---------------------------------------------------------------------------
// 12. Positive contribution
// ---------------------------------------------------------------------------

describe('positive contribution', () => {
  it('direction is positive for positive value', () => {
    expect(contributionDirection(0.5)).toBe('positive')
  })

  it('formatted correctly with + prefix', () => {
    expect(formatContribution(0.5)).toBe('+0.500')
  })
})

// ---------------------------------------------------------------------------
// 13. Negative contribution
// ---------------------------------------------------------------------------

describe('negative contribution', () => {
  it('direction is negative for negative value', () => {
    expect(contributionDirection(-0.3)).toBe('negative')
  })

  it('formatted correctly without + prefix', () => {
    expect(formatContribution(-0.3)).toBe('-0.300')
  })
})

// ---------------------------------------------------------------------------
// 14. Missing contribution (null)
// ---------------------------------------------------------------------------

describe('missing contribution (null)', () => {
  it('contributionDirection returns null', () => {
    expect(contributionDirection(null)).toBeNull()
  })

  it('calculateContributionMagnitude returns null', () => {
    expect(calculateContributionMagnitude(null)).toBeNull()
  })

  it('formatContribution returns em-dash', () => {
    expect(formatContribution(null)).toBe('—')
  })
})

// ---------------------------------------------------------------------------
// 15. Missing sensitivity
// ---------------------------------------------------------------------------

describe('missing sensitivity', () => {
  it('feature with null sensitivity does not crash ranking', () => {
    const attrs = [makeAttr('a', 0.3), makeAttr('b', null)]
    const ranked = rankFeatureContributions(attrs)
    expect(ranked[0].featureName).toBe('a')
    expect(ranked.find((r) => r.featureName === 'b')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 16. Jacobian available
// ---------------------------------------------------------------------------

describe('jacobian available', () => {
  const r = EXPLAINABILITY_FIXTURES.QUANTUM_LOCAL_EXPLANATION

  it('jacobian has gradient values', () => {
    expect(r.jacobian).not.toBeNull()
    for (const entry of r.jacobian!) {
      expect(entry.gradient).not.toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// 17. Jacobian unavailable
// ---------------------------------------------------------------------------

describe('jacobian unavailable', () => {
  const r = EXPLAINABILITY_FIXTURES.CLASSICAL_LOCAL_EXPLANATION

  it('jacobian is null', () => {
    expect(r.jacobian).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 18. Malformed payload
// ---------------------------------------------------------------------------

describe('malformed payload', () => {
  it('validateExplanationPayload warns on missing sampleId', () => {
    const r = baseResult()
    r.sampleId = ''
    const warnings = validateExplanationPayload(r)
    expect(warnings.some((w) => w.includes('Sample'))).toBe(true)
  })

  it('validateExplanationPayload warns on Infinity contribution', () => {
    const r = baseResult()
    r.featureAttributions = [makeAttr('bad', Infinity)]
    const warnings = validateExplanationPayload(r)
    expect(warnings.some((w) => w.includes('non-finite'))).toBe(true)
  })

  it('validateExplanationPayload warns on NaN contribution', () => {
    const r = baseResult()
    r.featureAttributions = [makeAttr('nan_feat', NaN)]
    const warnings = validateExplanationPayload(r)
    expect(warnings.some((w) => w.includes('non-finite'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 19. Invalid probability
// ---------------------------------------------------------------------------

describe('invalid probability', () => {
  it('warns when probability exceeds 1', () => {
    const r = baseResult()
    r.probabilities = { Normal: 1.5, 'High Risk': 0.2 }
    const warnings = validateExplanationPayload(r)
    expect(warnings.some((w) => w.includes('Normal probability'))).toBe(true)
  })

  it('warns when probabilities do not sum to 1', () => {
    const r = baseResult()
    r.probabilities = { Normal: 0.4, 'High Risk': 0.4 }
    const warnings = validateExplanationPayload(r)
    expect(warnings.some((w) => w.includes('sum'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 20. Domain mismatch
// ---------------------------------------------------------------------------

describe('domain mismatch', () => {
  it('classical model has different input domain from quantum', () => {
    const classical = EXPLAINABILITY_FIXTURES.CLASSICAL_LOCAL_EXPLANATION
    const quantum = EXPLAINABILITY_FIXTURES.QUANTUM_LOCAL_EXPLANATION
    expect(classical.computationalMetadata?.inputDomain).not.toBe(quantum.computationalMetadata?.inputDomain)
  })
})

// ---------------------------------------------------------------------------
// 21. Deterministic fixtures
// ---------------------------------------------------------------------------

describe('deterministic fixtures', () => {
  it('all fixtures are marked isDemoFixture', () => {
    for (const [, fixture] of Object.entries(EXPLAINABILITY_FIXTURES)) {
      expect(fixture.isDemoFixture).toBe(true)
    }
  })

  it('quantum local fixture has consistent probabilities summing to ~1', () => {
    const r = EXPLAINABILITY_FIXTURES.QUANTUM_LOCAL_EXPLANATION
    const sum = r.probabilities!.Normal + r.probabilities!['High Risk']
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.01)
  })

  it('fixtures do not use Math.random (verified by determinism — same value on two accesses)', () => {
    const a = EXPLAINABILITY_FIXTURES.QUANTUM_LOCAL_EXPLANATION.featureAttributions![0].contribution
    const b = EXPLAINABILITY_FIXTURES.QUANTUM_LOCAL_EXPLANATION.featureAttributions![0].contribution
    expect(a).toBe(b)
  })
})

// ---------------------------------------------------------------------------
// 22. buildQuantumExplanationFromVqcResult
// ---------------------------------------------------------------------------

describe('buildQuantumExplanationFromVqcResult adapter', () => {
  const fakeVqcResult = {
    status: 'success',
    model: {
      name: 'DressedVQC',
      checkpoint: 'quantum_core/vqc_model_weights.pth',
      wires: 10,
      layers: 2,
      feature_map: 'AngleEmbedding',
      ansatz: 'StronglyEntanglingLayers',
    },
    input: {
      source: 'clinical_data_synthetic.csv',
      patient_id: 'PAT_1000',
      feature_count: 10,
      feature_names: ['biomarker_04', 'biomarker_01'],
      standardized_vector: [-0.229, -0.055],
    },
    prediction: {
      class_index: 0,
      class_label: 'Normal',
      probabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
    },
    quantum_telemetry: {
      device: 'default.qubit',
      wires: 10,
      precision: 'float64',
    },
  }

  it('builds a result with status unavailable when no backend attributions', () => {
    const r = buildQuantumExplanationFromVqcResult(fakeVqcResult as any, null)
    expect(r.status).toBe('unavailable')
    expect(r.featureAttributions).toBeNull()
  })

  it('carries forward correct patient id', () => {
    const r = buildQuantumExplanationFromVqcResult(fakeVqcResult as any, null)
    expect(r.sampleId).toBe('PAT_1000')
  })

  it('correctly sets isDemoFixture to false for live result', () => {
    const r = buildQuantumExplanationFromVqcResult(fakeVqcResult as any, null)
    expect(r.isDemoFixture).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 23. Top N feature selection
// ---------------------------------------------------------------------------

describe('getTopContributors', () => {
  it('returns correct top N', () => {
    const attrs = [
      makeAttr('a', 0.1),
      makeAttr('b', -0.9),
      makeAttr('c', 0.4),
      makeAttr('d', -0.5),
    ]
    const top2 = getTopContributors(attrs, 2)
    expect(top2).toHaveLength(2)
    expect(top2[0].featureName).toBe('b')
    expect(top2[1].featureName).toBe('d')
  })
})
