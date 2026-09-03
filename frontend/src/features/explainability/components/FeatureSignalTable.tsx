import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useExplainability } from '../hooks/useExplainability'
import { rankFeatureContributions, formatContribution, formatValue } from '../lib/explanationEngine'
import type { FeatureAttribution } from '../types/explainability'

const DIRECTION_TEXT: Record<string, string> = {
  positive: 'text-success',
  negative: 'text-danger',
  neutral: 'text-muted',
}

function SignalRow({
  attr,
  expanded,
  onToggle,
  targetClass,
}: {
  attr: FeatureAttribution
  expanded: boolean
  onToggle: () => void
  targetClass: string
}) {
  const pct = attr.magnitude != null ? Math.min(attr.magnitude * 200, 100) : 0
  const dirTone = DIRECTION_TEXT[attr.direction ?? 'neutral']
  const barTone =
    attr.direction === 'positive' ? 'bg-success' : attr.direction === 'negative' ? 'bg-danger' : 'bg-muted'

  return (
    <li className="border-b border-line-subtle last:border-b-0">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="focus-ring flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-subtle"
      >
        <span className="w-5 shrink-0 text-right text-xs text-muted">{attr.rank ?? '—'}</span>
        <span className="w-32 shrink-0 truncate font-mono text-sm font-medium text-primary sm:w-40">
          {attr.featureName}
        </span>
        <div className="flex flex-1 items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-subtle">
            <div
              className={cn('h-full rounded-full transition-[width] duration-300', barTone)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={cn('w-16 shrink-0 text-right font-mono text-xs font-medium', dirTone)}>
            {formatContribution(attr.contribution)}
          </span>
        </div>
        <ChevronDown className={cn('size-4 shrink-0 text-muted transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-2 pb-4 pl-10 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Raw value</dt>
            <dd className="font-mono text-xs font-medium text-primary">
              {formatValue(attr.rawValue, attr.unit ?? undefined)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Standardized (z)</dt>
            <dd className="font-mono text-xs font-medium text-primary">{formatValue(attr.standardizedValue)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Magnitude</dt>
            <dd className="font-mono text-xs font-medium text-primary">
              {attr.magnitude !== null ? attr.magnitude.toFixed(3) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Sensitivity (dP/dx)</dt>
            <dd className="font-mono text-xs font-medium text-primary">
              {attr.sensitivity !== null ? attr.sensitivity.toFixed(4) : '—'}
            </dd>
          </div>
          <p className="col-span-2 text-xs leading-relaxed text-muted sm:col-span-4">
            Contributes {attr.direction === 'negative' ? 'away from' : 'toward'}{' '}
            <span className="font-medium text-secondary">{targetClass}</span> in the model output.
          </p>
        </div>
      )}
    </li>
  )
}

/**
 * The one ranked feature-signal list for this page. Replaces four previously
 * separate views of the same ten features (a horizontal bar chart, a vertical
 * ranking-card list, a raw/standardized input table, and a side detail panel)
 * with a single sortable list whose rows expand in place for detail.
 */
export function FeatureSignalTable() {
  const { result, selectedFeature, setSelectedFeature } = useExplainability()
  const [showAll, setShowAll] = useState(false)

  const ranked = useMemo(
    () => (result.featureAttributions ? rankFeatureContributions(result.featureAttributions) : []),
    [result.featureAttributions],
  )

  if (ranked.length === 0) {
    return (
      <section aria-label="Feature signals" className="rounded-2xl border border-line-subtle bg-surface p-6">
        <h2 className="text-sm font-semibold text-primary">Feature signals</h2>
        <p className="mt-2 text-sm text-muted">
          Feature attribution data is unavailable for this execution. A backend explainability endpoint
          must return per-feature values to populate this view.
        </p>
      </section>
    )
  }

  const visible = showAll ? ranked : ranked.slice(0, 8)
  const targetClass = result.selectedClass ?? 'the predicted class'

  return (
    <section aria-label="Feature signals" className="rounded-2xl border border-line-subtle bg-surface p-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-primary">Feature signals</h2>
          <p className="mt-0.5 text-xs text-muted">
            Ranked by contribution toward <span className="font-medium text-secondary">{targetClass}</span>.
            Select a row for detail.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-success" />
            Positive
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-danger" />
            Negative
          </span>
        </div>
      </div>

      <ul>
        {visible.map((attr) => (
          <SignalRow
            key={attr.featureName}
            attr={attr}
            targetClass={targetClass}
            expanded={selectedFeature === attr.featureName}
            onToggle={() => setSelectedFeature(selectedFeature === attr.featureName ? null : attr.featureName)}
          />
        ))}
      </ul>

      {ranked.length > 8 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="focus-ring mt-3 rounded text-xs font-medium text-accent hover:underline"
        >
          {showAll ? 'Show fewer' : `Show all ${ranked.length} features`}
        </button>
      )}
    </section>
  )
}
