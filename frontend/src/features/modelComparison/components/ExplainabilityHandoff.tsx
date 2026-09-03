import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Single accurate handoff card to the next stage. Previously this page also
 * carried a separate "Clinical Interpretation Preview" card describing
 * Explainability and Clinical Interpretation as an "upcoming pipeline
 * stage" — both are real, built pages now, so that stale preview copy has
 * been removed rather than left contradicting the actual product.
 */
export function ExplainabilityHandoff() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line-subtle bg-surface p-6">
      <div>
        <p className="text-xs font-medium text-muted">Next — Explainability</p>
        <h2 className="mt-0.5 text-base font-semibold text-primary">
          Inspect biomarker attribution for each model
        </h2>
        <p className="mt-1 max-w-lg text-sm text-secondary">
          See which features drove each prediction, how sensitive the models are to changes in them, and where
          classical and quantum attributions agree or diverge.
        </p>
      </div>

      <Link
        to="/app/explainability"
        className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Continue to Explainability
        <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
