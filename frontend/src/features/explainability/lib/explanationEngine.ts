/**
 * Phase 5 — Explanation Engine.
 * Pure, stateless utilities for ranking, validating, and formatting explainability data.
 * No randomness. No side effects. No JSX.
 */

import type {
  ContributionDirection,
  ExplanationStatus,
  ExplainabilityResult,
  FeatureAttribution,
} from '../types/explainability'

/** Ranks feature attributions by descending contribution magnitude. */
export function rankFeatureContributions(attrs: FeatureAttribution[]): FeatureAttribution[] {
  return [...attrs]
    .map((a, i) => ({
      ...a,
      magnitude: a.contribution !== null ? Math.abs(a.contribution) : null,
      direction: contributionDirection(a.contribution),
      rank: i + 1, // will be reassigned
    }))
    .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))
    .map((a, i) => ({ ...a, rank: i + 1 }))
}

/** Returns top N features by magnitude. */
export function getTopContributors(attrs: FeatureAttribution[], n = 5): FeatureAttribution[] {
  return rankFeatureContributions(attrs).slice(0, n)
}

/** Determines contribution direction from signed value. */
export function contributionDirection(contribution: number | null): ContributionDirection | null {
  if (contribution === null || !isFinite(contribution)) return null
  if (contribution > 0.001) return 'positive'
  if (contribution < -0.001) return 'negative'
  return 'neutral'
}

/** Calculates magnitude from signed contribution. */
export function calculateContributionMagnitude(contribution: number | null): number | null {
  if (contribution === null || !isFinite(contribution)) return null
  return Math.abs(contribution)
}

/** Checks whether the explanation is complete (all features have contributions). */
export function isExplanationComplete(result: ExplainabilityResult): boolean {
  if (!result.featureAttributions || result.featureAttributions.length === 0) return false
  return result.featureAttributions.every((f) => f.contribution !== null && isFinite(f.contribution))
}

/** Returns how many features have contributions out of total. */
export function getExplanationCoverage(result: ExplainabilityResult): {
  covered: number
  total: number
} {
  const total = result.featureAttributions?.length ?? 0
  const covered = result.featureAttributions?.filter(
    (f) => f.contribution !== null && isFinite(f.contribution)
  ).length ?? 0
  return { covered, total }
}

/** Determines ExplanationStatus from a partial result. */
export function getExplanationStatus(result: Partial<ExplainabilityResult>): ExplanationStatus {
  if (result.status === 'error') return 'error'
  if (result.status === 'loading') return 'loading'
  if (!result.predictionLabel) return 'not_started'

  const hasAny = result.featureAttributions && result.featureAttributions.length > 0
  if (!hasAny) return 'unavailable'

  const coverage = getExplanationCoverage(result as ExplainabilityResult)
  if (coverage.covered === coverage.total && coverage.total > 0) return 'available'
  if (coverage.covered > 0) return 'partial'
  return 'unavailable'
}

/** Validates payload sanity — returns string[] of warnings. */
export function validateExplanationPayload(result: ExplainabilityResult): string[] {
  const warnings: string[] = []

  if (!result.sampleId) warnings.push('Sample identity is missing.')
  if (!result.predictionLabel) warnings.push('Prediction label is missing.')

  if (result.probabilities) {
    const { Normal, 'High Risk': highRisk } = result.probabilities
    if (typeof Normal !== 'number' || !isFinite(Normal) || Normal < 0 || Normal > 1)
      warnings.push('Normal probability is invalid.')
    if (typeof highRisk !== 'number' || !isFinite(highRisk) || highRisk < 0 || highRisk > 1)
      warnings.push('High Risk probability is invalid.')
    const sum = Normal + highRisk
    if (Math.abs(sum - 1.0) > 0.02) warnings.push(`Probabilities sum to ${sum.toFixed(3)}, expected ~1.0.`)
  }

  if (result.featureAttributions) {
    for (const f of result.featureAttributions) {
      if (!f.featureName) warnings.push('A feature attribution entry is missing its feature name.')
      if (f.contribution !== null && !isFinite(f.contribution))
        warnings.push(`Feature "${f.featureName}" has non-finite contribution: ${f.contribution}.`)
    }
  }

  return warnings
}

/** Formats a contribution value for display, e.g. "+0.42" or "-0.08". */
export function formatContribution(c: number | null): string {
  if (c === null || !isFinite(c)) return '—'
  return c >= 0 ? `+${c.toFixed(3)}` : c.toFixed(3)
}

/** Formats a numeric value for display. */
export function formatValue(v: number | null, unit?: string | null): string {
  if (v === null || !isFinite(v)) return '—'
  const formatted = v.toFixed(3)
  return unit ? `${formatted} ${unit}` : formatted
}
