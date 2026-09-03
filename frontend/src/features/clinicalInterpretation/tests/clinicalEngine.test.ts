import { describe, expect, it } from 'vitest'
import {
  formatContribution,
  formatProbabilityPercent,
  getClinicalInterpretationStatus,
  getEvidenceForFinding,
  getEvidenceStatus,
  getFindingsForEvidence,
  getRecommendationStatus,
  interpretationStatusMessage,
  isFiniteNumber,
  priorityLabel,
  relevanceLabel,
  sourceTypeLabel,
  strengthLabel,
  validateClinicalPayload,
} from '../lib/clinicalEngine'
import { CLINICAL_INTERPRETATION_FIXTURES } from '../api/clinicalInterpretationAdapter'
import type { ClinicalInterpretationResult } from '../types/clinicalInterpretation'

const complete = CLINICAL_INTERPRETATION_FIXTURES.COMPLETE_CLINICAL_INTERPRETATION
const evidenceUnavailable = CLINICAL_INTERPRETATION_FIXTURES.EVIDENCE_UNAVAILABLE
const interpUnavailable = CLINICAL_INTERPRETATION_FIXTURES.INTERPRETATION_UNAVAILABLE
const errored = CLINICAL_INTERPRETATION_FIXTURES.CLINICAL_ERROR

describe('isFiniteNumber', () => {
  it('accepts finite numbers only', () => {
    expect(isFiniteNumber(0)).toBe(true)
    expect(isFiniteNumber(-1.5)).toBe(true)
    expect(isFiniteNumber(NaN)).toBe(false)
    expect(isFiniteNumber(Infinity)).toBe(false)
    expect(isFiniteNumber(null)).toBe(false)
    expect(isFiniteNumber('3')).toBe(false)
  })
})

describe('formatProbabilityPercent', () => {
  it('formats and clamps', () => {
    expect(formatProbabilityPercent(0.7195)).toBe('71.95%')
    expect(formatProbabilityPercent(1.4)).toBe('100.00%')
    expect(formatProbabilityPercent(-0.2)).toBe('0.00%')
  })
  it('returns dash for non-finite', () => {
    expect(formatProbabilityPercent(null)).toBe('—')
    expect(formatProbabilityPercent(NaN)).toBe('—')
    expect(formatProbabilityPercent(Infinity)).toBe('—')
  })
})

describe('formatContribution', () => {
  it('adds a sign for positive values', () => {
    expect(formatContribution(0.31)).toBe('+0.31')
    expect(formatContribution(-0.07)).toBe('-0.07')
    expect(formatContribution(null)).toBe('—')
  })
})

describe('getClinicalInterpretationStatus', () => {
  it('returns not_started when missing', () => {
    expect(getClinicalInterpretationStatus(null)).toBe('not_started')
  })
  it('passes through loading/error/not_started', () => {
    expect(getClinicalInterpretationStatus(errored)).toBe('error')
  })
  it('reports available for a complete fixture', () => {
    expect(getClinicalInterpretationStatus(complete)).toBe('available')
  })
  it('downgrades available-without-evidence to partial', () => {
    expect(getClinicalInterpretationStatus(evidenceUnavailable)).toBe('partial')
  })
  it('reports unavailable for prediction-only', () => {
    expect(getClinicalInterpretationStatus(interpUnavailable)).toBe('unavailable')
  })
})

describe('interpretationStatusMessage', () => {
  it('has a message for each status', () => {
    for (const s of ['not_started', 'loading', 'available', 'partial', 'unavailable', 'error'] as const) {
      expect(interpretationStatusMessage(s).length).toBeGreaterThan(0)
    }
  })
})

describe('evidence status + mapping', () => {
  it('unavailable when no evidence', () => {
    expect(getEvidenceStatus([])).toBe('unavailable')
    expect(getEvidenceStatus(evidenceUnavailable.evidence)).toBe('unavailable')
  })
  it('available when evidence has relevance', () => {
    expect(getEvidenceStatus(complete.evidence)).toBe('available')
  })
  it('maps findings to evidence and back', () => {
    const forFinding = getEvidenceForFinding('finding-primary', complete.evidence)
    expect(forFinding.map((e) => e.id)).toContain('DEMO-EVIDENCE-001')
    const findings = getFindingsForEvidence('DEMO-EVIDENCE-002', complete.evidence)
    expect(findings).toContain('finding-secondary')
  })
})

describe('getRecommendationStatus', () => {
  it('available with rationale', () => {
    expect(getRecommendationStatus(complete)).toBe('available')
  })
  it('unavailable when empty', () => {
    expect(getRecommendationStatus({ recommendations: [] })).toBe('unavailable')
  })
})

describe('label helpers', () => {
  it('formats priority, relevance, strength, source type', () => {
    expect(priorityLabel('urgent')).toBe('Urgent')
    expect(priorityLabel('undetermined')).toBe('Priority not determined')
    expect(relevanceLabel(null)).toBe('Relevance not provided')
    expect(relevanceLabel('high')).toBe('High')
    expect(strengthLabel(null)).toBe('Strength not provided')
    expect(sourceTypeLabel('systematic-review')).toBe('Systematic Review')
  })
})

describe('validateClinicalPayload', () => {
  it('accepts a clean fixture', () => {
    expect(validateClinicalPayload(complete)).toEqual([])
  })
  it('flags missing payload', () => {
    expect(validateClinicalPayload(null).length).toBeGreaterThan(0)
  })
  it('flags non-finite probabilities and confidence', () => {
    const bad: ClinicalInterpretationResult = {
      ...complete,
      modelProbabilities: { Normal: NaN, 'High Risk': 0.5 },
      interpretationConfidence: Infinity,
    }
    const problems = validateClinicalPayload(bad)
    expect(problems.some((p) => /probabilities/i.test(p))).toBe(true)
    expect(problems.some((p) => /confidence/i.test(p))).toBe(true)
  })
})
