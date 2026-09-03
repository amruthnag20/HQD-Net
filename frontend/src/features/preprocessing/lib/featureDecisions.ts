import type { ColumnProfile } from '@/features/ingestion/types/dataset'
import type { FeatureDecision, FeatureRole, FeatureStatus } from '../types/preprocessing'

function roleFor(profile: ColumnProfile): FeatureRole {
  if (profile.dtype === 'empty') return 'empty'
  if (profile.isLikelyIdentifier) return 'identifier'
  if (profile.isConstant) return 'constant'
  return profile.dtype
}

function statusFor(role: FeatureRole, missingCount: number): FeatureStatus {
  if (role === 'identifier' || role === 'constant' || role === 'empty') return 'exclude'
  if (role === 'categorical') return 'encode'
  return missingCount > 0 ? 'impute' : 'ready'
}

/** Builds the default per-feature decision (role, status, inclusion) for
 *  every non-target column, then applies any explicit user overrides.
 *  Identifiers and constant columns default to excluded; every role except
 *  empty (which carries no data at all) can be manually overridden via
 *  Feature Filtering. A null targetColumn (the common case at this
 *  milestone — target selection is optional) excludes nothing extra: every
 *  column is a feature candidate. */
export function buildFeatureDecisions(
  columns: ColumnProfile[],
  targetColumn: string | null,
  featureOverrides: Record<string, boolean>,
): FeatureDecision[] {
  return columns
    .filter((c) => targetColumn === null || c.name !== targetColumn)
    .map((c) => {
      const role = roleFor(c)
      const status = statusFor(role, c.missingCount)
      const overridable = role !== 'empty'
      const defaultIncluded = role !== 'identifier' && role !== 'constant' && role !== 'empty'
      const override = featureOverrides[c.name]
      const included = overridable && override !== undefined ? override : defaultIncluded

      return { name: c.name, role, status, missingCount: c.missingCount, included, overridable }
    })
}
