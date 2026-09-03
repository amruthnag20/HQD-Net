import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function ClinicalInterpretationPreview() {
  return (
    <section
      aria-labelledby="clinical-handoff-heading"
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line-subtle bg-surface p-6"
    >
      <div>
        <p className="text-xs font-medium text-muted">Next — Clinical Interpretation</p>
        <h2 id="clinical-handoff-heading" className="mt-0.5 text-base font-semibold text-primary">
          Combine these findings with medical evidence
        </h2>
        <p className="mt-1 max-w-lg text-sm text-secondary">
          The clinical translation stage combines this explanation with curated medical evidence to build a
          structured, evidence-aware interpretation and report draft.
        </p>
      </div>

      <Link
        to="/app/clinical-interpretation"
        id="continue-to-clinical-btn"
        className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Continue to Clinical Interpretation
        <ArrowRight className="size-4" />
      </Link>
    </section>
  )
}
