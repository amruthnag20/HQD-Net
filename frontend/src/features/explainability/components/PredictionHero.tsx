import { useExplainability } from '../hooks/useExplainability'
import { getExplanationCoverage, getTopContributors, formatContribution } from '../lib/explanationEngine'
import { ExplanationStatus } from './ExplanationStatus'

/**
 * The single glanceable summary for this page — replaces the old header
 * context-ribbon and the separate "Explanation Snapshot" card, which repeated
 * the same prediction/probability/top-features data twice. The probability is
 * the one number on this page that earns the display face.
 */
export function PredictionHero() {
  const { result } = useExplainability()
  const { predictionLabel, probabilities, sampleId, datasetName, status, computationalMetadata } = result
  const { covered, total } = getExplanationCoverage(result)
  const isHighRisk = predictionLabel === 'High Risk'

  const prob = probabilities
    ? predictionLabel === 'Normal'
      ? probabilities.Normal
      : probabilities['High Risk']
    : null

  const topFeatures = result.featureAttributions ? getTopContributors(result.featureAttributions, 3) : []

  return (
    <section
      aria-label="Prediction summary"
      className="grid gap-6 rounded-2xl border border-line-subtle bg-surface p-6 shadow-sm md:grid-cols-[auto_1fr] md:items-center md:p-8"
    >
      {/* Headline number */}
      <div className="flex flex-col gap-2">
        {predictionLabel ? (
          <>
            <span
              className={
                isHighRisk
                  ? 'inline-flex w-fit items-center rounded-full bg-danger-muted px-2.5 py-0.5 text-xs font-medium text-danger'
                  : 'inline-flex w-fit items-center rounded-full bg-success-muted px-2.5 py-0.5 text-xs font-medium text-success'
              }
            >
              {predictionLabel}
            </span>
            <p className="font-display text-6xl leading-none text-primary md:text-7xl">
              {prob !== null ? `${(prob * 100).toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-muted">Model probability — not a clinical diagnosis</p>
          </>
        ) : (
          <p className="text-sm text-muted">Run a model to see a prediction here.</p>
        )}
      </div>

      {/* Meta + status + top signals */}
      <div className="flex flex-col gap-4 border-t border-line-subtle pt-4 md:border-t-0 md:border-l md:pl-8 md:pt-0">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <p className="text-xs text-muted">Sample</p>
            <p className="mt-0.5 text-sm font-medium text-primary">{sampleId}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Dataset</p>
            <p className="mt-0.5 max-w-[16rem] truncate text-sm font-medium text-primary">{datasetName}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Explanation</p>
            <ExplanationStatus status={status} className="mt-0.5" />
          </div>
          {total > 0 && (
            <div>
              <p className="text-xs text-muted">Coverage</p>
              <p className="mt-0.5 text-sm font-medium text-primary">
                {covered} / {total} features
              </p>
            </div>
          )}
          {computationalMetadata?.explanationMethod && (
            <div>
              <p className="text-xs text-muted">Method</p>
              <p className="mt-0.5 text-sm font-medium text-primary">{computationalMetadata.explanationMethod}</p>
            </div>
          )}
        </div>

        {topFeatures.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted">Top signals</p>
            <div className="flex flex-wrap gap-1.5">
              {topFeatures.map((f) => (
                <span
                  key={f.featureName}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-medium text-secondary"
                >
                  <span className="font-mono text-primary">{f.featureName}</span>
                  <span
                    className={
                      f.direction === 'positive'
                        ? 'text-success'
                        : f.direction === 'negative'
                          ? 'text-danger'
                          : 'text-muted'
                    }
                  >
                    {formatContribution(f.contribution)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
