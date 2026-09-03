import { useExplainability } from '../hooks/useExplainability'
import { getTopContributors } from '../lib/explanationEngine'

/** Plain-language summary sentence + any backend warnings. The scientific disclaimer lives once, in ScientificDisclaimer. */
export function ExplanationSummary() {
  const { result } = useExplainability()
  const { featureAttributions, predictionLabel, probabilities, explanationWarnings } = result
  const top = featureAttributions ? getTopContributors(featureAttributions, 3) : []
  const targetClass = result.selectedClass ?? predictionLabel

  const prob =
    probabilities && predictionLabel
      ? predictionLabel === 'Normal'
        ? probabilities.Normal
        : probabilities['High Risk']
      : null

  if (!predictionLabel || prob === null) return null

  return (
    <section aria-label="Explanation summary" className="rounded-2xl border border-line-subtle bg-surface p-6">
      <h2 className="mb-2 text-sm font-semibold text-primary">Summary</h2>
      <p className="text-sm leading-relaxed text-secondary">
        The model predicted <strong className="text-primary">{predictionLabel}</strong> with a model
        probability of <strong className="text-primary">{(prob * 100).toFixed(2)}%</strong>.{' '}
        {top.length > 0 && (
          <>
            The strongest contributions came from{' '}
            {top.map((f, i) => (
              <span key={f.featureName}>
                <span className="font-mono text-primary">{f.featureName}</span>
                {i < top.length - 2 ? ', ' : i === top.length - 2 ? ' and ' : ''}
              </span>
            ))}
            {targetClass && (
              <>
                , toward the predicted class <strong className="text-primary">{targetClass}</strong>
              </>
            )}
            .
          </>
        )}
      </p>

      {explanationWarnings.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5" aria-label="Explanation warnings">
          {explanationWarnings.map((w, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-muted px-3 py-2 text-xs text-warning"
              role="alert"
            >
              <span aria-hidden="true">⚠</span>
              {w}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
