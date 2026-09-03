/**
 * Phase 6 — Clinical interpretation pure utilities.
 *
 * These are presentation-layer helpers ONLY. They format, label, count, and derive
 * display status from data that already exists. They perform NO medical reasoning:
 * no thresholds ("if glucose > X"), no priority inference, no risk classification.
 * Clinical meaning is always supplied upstream by the backend/knowledge layer.
 */

import type {
  ClinicalInterpretationResult,
  ClinicalInterpretationStatus,
  ClinicalPriority,
  EvidenceRelevance,
  EvidenceSourceType,
  EvidenceStrength,
  FindingCategory,
  MedicalEvidence,
  Provenance,
  RecommendationCategory,
} from '../types/clinicalInterpretation'

/** Availability state of a sub-section, used for empty-state rendering. */
export type SectionAvailability = 'available' | 'partial' | 'unavailable'

/** Safe finite-number guard — never let NaN/Infinity reach the DOM. */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Format a 0..1 probability as a percentage string, or a dash when missing. */
export function formatProbabilityPercent(value: number | null | undefined, digits = 2): string {
  if (!isFiniteNumber(value)) return '—'
  const clamped = Math.min(1, Math.max(0, value))
  return `${(clamped * 100).toFixed(digits)}%`
}

/** Format a signed contribution, e.g. +0.31 / -0.07. */
export function formatContribution(value: number | null | undefined, digits = 2): string {
  if (!isFiniteNumber(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}`
}

/**
 * Derive the display status for the interpretation. Prefers the explicit backend
 * status; only downgrades to `partial` when content is thin, and never upgrades a
 * missing interpretation to `available`.
 */
export function getClinicalInterpretationStatus(
  result: ClinicalInterpretationResult | null | undefined,
): ClinicalInterpretationStatus {
  if (!result) return 'not_started'
  if (result.status === 'loading' || result.status === 'error' || result.status === 'not_started') {
    return result.status
  }
  if (result.status === 'unavailable') return 'unavailable'

  const hasNarrative = Object.values(result.narrative).some((s) => s != null && s.trim().length > 0)
  const hasEvidence = result.evidence.length > 0
  const hasRecommendations = result.recommendations.length > 0
  const hasFindings = result.keyFindings.length > 0

  if (!hasNarrative && !hasEvidence && !hasFindings && !hasRecommendations) {
    return 'unavailable'
  }
  if (result.status === 'partial') return 'partial'
  // If backend said available but evidence is missing, reflect the partial reality.
  if (result.status === 'available' && !hasEvidence) return 'partial'
  return 'available'
}

/** Human-readable message for each interpretation status. */
export function interpretationStatusMessage(status: ClinicalInterpretationStatus): string {
  switch (status) {
    case 'not_started':
      return 'Run the model and explanation stages before generating clinical interpretation.'
    case 'loading':
      return 'Preparing clinical interpretation…'
    case 'available':
      return 'Clinical interpretation ready.'
    case 'partial':
      return 'Interpretation is available with limited supporting evidence.'
    case 'unavailable':
      return 'Clinical interpretation is not available for this analysis.'
    case 'error':
      return 'Unable to load clinical interpretation.'
    default:
      return 'Clinical interpretation status unknown.'
  }
}

/** Availability of the evidence section. */
export function getEvidenceStatus(evidence: MedicalEvidence[] | null | undefined): SectionAvailability {
  if (!evidence || evidence.length === 0) return 'unavailable'
  const withRelevance = evidence.filter((e) => e.relevance != null || e.relevanceScore != null)
  if (withRelevance.length === 0) return 'partial'
  return 'available'
}

/** Availability of the recommendations section. */
export function getRecommendationStatus(
  result: Pick<ClinicalInterpretationResult, 'recommendations'> | null | undefined,
): SectionAvailability {
  if (!result || result.recommendations.length === 0) return 'unavailable'
  const withRationale = result.recommendations.filter((r) => r.rationale != null)
  return withRationale.length === 0 ? 'partial' : 'available'
}

/** Evidence items related to a specific finding id. */
export function getEvidenceForFinding(
  findingId: string,
  evidence: MedicalEvidence[],
): MedicalEvidence[] {
  return evidence.filter(
    (e) => e.matchedFindingIds.includes(findingId),
  )
}

/** Finding ids related to a specific evidence id. */
export function getFindingsForEvidence(
  evidenceId: string,
  evidence: MedicalEvidence[],
): string[] {
  const item = evidence.find((e) => e.id === evidenceId)
  return item ? item.matchedFindingIds : []
}

// ---------------------------------------------------------------------------
//  Label helpers — purely cosmetic mappings
// ---------------------------------------------------------------------------

export function priorityLabel(priority: ClinicalPriority): string {
  switch (priority) {
    case 'low':
      return 'Low'
    case 'medium':
      return 'Medium'
    case 'high':
      return 'High'
    case 'urgent':
      return 'Urgent'
    case 'review':
      return 'Review'
    case 'undetermined':
      return 'Priority not determined'
    default:
      return 'Priority not determined'
  }
}

export function relevanceLabel(relevance: EvidenceRelevance | null): string {
  if (!relevance) return 'Relevance not provided'
  return relevance.charAt(0).toUpperCase() + relevance.slice(1)
}

export function strengthLabel(strength: EvidenceStrength | null): string {
  if (!strength) return 'Strength not provided'
  return strength.charAt(0).toUpperCase() + strength.slice(1)
}

export function sourceTypeLabel(type: EvidenceSourceType): string {
  switch (type) {
    case 'clinical-guideline':
      return 'Clinical Guideline'
    case 'peer-reviewed-study':
      return 'Peer-Reviewed Study'
    case 'systematic-review':
      return 'Systematic Review'
    case 'medical-reference':
      return 'Medical Reference'
    case 'institutional-source':
      return 'Institutional Source'
    case 'other':
      return 'Other Source'
    default:
      return 'Source'
  }
}

export function findingCategoryLabel(category: FindingCategory): string {
  switch (category) {
    case 'primary':
      return 'Primary Finding'
    case 'secondary':
      return 'Secondary Finding'
    case 'observation':
      return 'Relevant Observation'
    case 'model-signal':
      return 'Model-Derived Signal'
    default:
      return 'Finding'
  }
}

export function recommendationCategoryLabel(category: RecommendationCategory): string {
  switch (category) {
    case 'follow-up':
      return 'Follow-Up'
    case 'additional-evaluation':
      return 'Additional Evaluation'
    case 'monitoring':
      return 'Monitoring'
    case 'lifestyle':
      return 'Lifestyle'
    case 'clinical-review':
      return 'Clinical Review'
    case 'other':
      return 'Other'
    default:
      return 'Recommendation'
  }
}

export function provenanceLabel(provenance: Provenance): string {
  switch (provenance) {
    case 'model-output':
      return 'Model Output'
    case 'explainability':
      return 'Explainability'
    case 'medical-evidence':
      return 'Medical Evidence'
    case 'ai-interpretation':
      return 'AI Interpretation'
    case 'clinically-interpreted':
      return 'Clinically Interpreted'
    case 'demo-data':
      return 'Demo Data'
    default:
      return 'Source'
  }
}

/**
 * Validate a clinical interpretation payload, returning a list of human-readable
 * problems. Used to guard against malformed backend responses before render.
 * Returns [] when the payload is renderable.
 */
export function validateClinicalPayload(
  result: ClinicalInterpretationResult | null | undefined,
): string[] {
  const problems: string[] = []
  if (!result) {
    problems.push('Clinical interpretation payload is missing.')
    return problems
  }
  if (!result.sampleId) problems.push('Missing sample identifier.')
  if (result.modelProbabilities) {
    const { Normal, 'High Risk': high } = result.modelProbabilities
    if (!isFiniteNumber(Normal) || !isFiniteNumber(high)) {
      problems.push('Model probabilities contain non-finite values.')
    }
  }
  if (
    result.interpretationConfidence != null &&
    !isFiniteNumber(result.interpretationConfidence)
  ) {
    problems.push('Interpretation confidence is not a finite number.')
  }
  return problems
}
