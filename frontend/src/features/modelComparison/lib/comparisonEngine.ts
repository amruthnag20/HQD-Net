/**
 * Pure comparison logic for Phase 4.
 * Evaluates agreement, domain compatibility, probability differences, and review priority.
 * Implements strict scientific safeguards: incompatible feature spaces are never marked as comparable.
 */

import type {
  AgreementStatus,
  ComparisonStatus,
  DifferenceSummary,
  InputCompatibilityInfo,
  ModelOutputSummary,
  ReviewPriority,
} from '../types/modelComparison'

/**
 * Checks whether the two models were executed on compatible feature domains.
 */
export function checkDomainCompatibility(
  classicalFeatures: string[],
  quantumFeatures: string[],
  classicalDomain: string,
  quantumDomain: string
): InputCompatibilityInfo {
  if (classicalFeatures.length === 0 || quantumFeatures.length === 0) {
    return {
      isCompatible: false,
      status: 'unverified',
      reason: 'Feature manifests are incomplete or missing for one or both models.',
      classicalDomain,
      quantumDomain,
      featureOverlapCount: 0,
    }
  }

  const classicalSet = new Set(classicalFeatures.map((f) => f.trim().toLowerCase()))
  const quantumSet = new Set(quantumFeatures.map((f) => f.trim().toLowerCase()))
  const overlap = [...classicalSet].filter((f) => quantumSet.has(f))

  // Exact domain check
  const isDifferentDataset =
    classicalDomain.toLowerCase() !== quantumDomain.toLowerCase() &&
    !classicalDomain.includes(quantumDomain) &&
    !quantumDomain.includes(classicalDomain)

  if (overlap.length === 0 || (isDifferentDataset && overlap.length < Math.min(classicalFeatures.length, 5))) {
    return {
      isCompatible: false,
      status: 'incompatible-domains',
      reason:
        'Input domains are disjoint. Classical ML evaluated clinical demo features (e.g. age, glucose, bmi) while the frozen VQC evaluated native synthetic biomarkers (biomarker_00..23). Direct clinical comparison is scientifically invalid without a validated projection layer.',
      classicalDomain,
      quantumDomain,
      featureOverlapCount: overlap.length,
    }
  }

  return {
    isCompatible: true,
    status: 'compatible',
    reason: `Evaluated on compatible feature space with ${overlap.length} shared feature dimensions.`,
    classicalDomain,
    quantumDomain,
    featureOverlapCount: overlap.length,
  }
}

/**
 * Determines agreement between models based on predicted class and domain compatibility.
 */
export function determineAgreement(
  classicalLabel: string | null,
  quantumLabel: string | null,
  isCompatible: boolean
): AgreementStatus {
  if (!classicalLabel && !quantumLabel) {
    return 'unavailable'
  }

  if (!classicalLabel || !quantumLabel) {
    return 'pending'
  }

  if (!isCompatible) {
    return 'not-comparable'
  }

  const cNorm = classicalLabel.trim().toLowerCase()
  const qNorm = quantumLabel.trim().toLowerCase()

  if (cNorm === qNorm) {
    return 'agree'
  }

  return 'disagree'
}

/**
 * Calculates probability difference and confidence delta between models.
 */
export function calculateDifference(
  classical: ModelOutputSummary | null,
  quantum: ModelOutputSummary | null,
  isCompatible: boolean
): DifferenceSummary | null {
  if (!classical?.probabilities || !quantum?.probabilities) {
    return null
  }

  const cNormal = classical.probabilities.Normal
  const qNormal = quantum.probabilities.Normal

  const normalDelta = cNormal - qNormal
  const probabilityGapPercentagePoints = Math.abs(normalDelta) * 100

  const cConf = classical.confidencePercent ?? 0
  const qConf = quantum.confidencePercent ?? 0
  const confidenceDelta = cConf - qConf

  const classMatches =
    classical.predictionLabel && quantum.predictionLabel
      ? classical.predictionLabel.trim().toLowerCase() === quantum.predictionLabel.trim().toLowerCase()
      : null

  let summaryText = ''
  if (!isCompatible) {
    summaryText = `Numerical probability delta is ${(probabilityGapPercentagePoints).toFixed(1)} percentage points, but cannot be clinically interpreted due to disjoint feature spaces.`
  } else if (classMatches) {
    summaryText = `Models agree on '${classical.predictionLabel}' with a ${probabilityGapPercentagePoints.toFixed(1)} percentage point probability gap.`
  } else {
    summaryText = `Model divergence: Classical predicts '${classical.predictionLabel}' while Quantum predicts '${quantum.predictionLabel}' (${probabilityGapPercentagePoints.toFixed(1)} pp gap).`
  }

  return {
    predictedClassMatches: classMatches,
    normalProbabilityDelta: normalDelta,
    probabilityGapPercentagePoints,
    confidenceDelta,
    summaryText,
  }
}

/**
 * Determines review priority without fabricating clinical severity.
 */
export function determineReviewPriority(
  agreement: AgreementStatus,
  classical: ModelOutputSummary | null,
  quantum: ModelOutputSummary | null
): ReviewPriority {
  if (agreement === 'not-comparable') {
    return 'undetermined'
  }

  if (agreement === 'disagree') {
    return 'review-required'
  }

  if (agreement === 'agree') {
    const cLabel = classical?.predictionLabel?.toLowerCase()
    if (cLabel === 'high risk' || cLabel === '1') {
      return 'high'
    }
    return 'low'
  }

  // Single model checks
  const single = classical || quantum
  if (single?.predictionLabel?.toLowerCase() === 'high risk') {
    return 'medium'
  }

  return 'undetermined'
}

/**
 * Determines overall comparison status.
 */
export function determineComparisonStatus(
  hasClassical: boolean,
  hasQuantum: boolean,
  isCompatible: boolean,
  isLoading: boolean,
  hasError: boolean
): ComparisonStatus {
  if (hasError) return 'error'
  if (isLoading) return 'loading'
  if (!hasClassical && !hasQuantum) return 'idle'
  if (hasClassical && !hasQuantum) return 'classical-only'
  if (!hasClassical && hasQuantum) return 'quantum-only'
  if (hasClassical && hasQuantum && !isCompatible) return 'incompatible-domains'
  return 'compatible'
}
