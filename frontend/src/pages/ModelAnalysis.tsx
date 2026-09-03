import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { DiagnosticWorkflowNav } from '@/components/navigation/DiagnosticWorkflowNav'
import { Badge } from '@/components/ui/Badge'
import { usePreprocessing } from '@/features/preprocessing/hooks/usePreprocessing'
import { ClassicalMlWorkspace } from '@/features/classicalMl/components/ClassicalMlWorkspace'
import { QuantumMlWorkspace } from '@/features/quantumMl/components/QuantumMlWorkspace'

/** Stage 03 — Model Analysis. Phase 3A implemented Classical ML (a real
 *  frontend model, since none existed). Phase 3B integrates the EXISTING,
 *  frozen quantum model instead of building a new one — both branches
 *  consume the same Phase 2 model-ready dataset, never a separate copy. */
export function ModelAnalysis() {
  const { phase, processed } = usePreprocessing()

  if (phase !== 'complete' || !processed) {
    return (
      <div className="w-full flex flex-col items-center pb-16">
        <DiagnosticWorkflowNav currentStage="quantum" datasetLoaded={true} />
        <div className="mx-auto mt-6 w-full max-w-[520px]">
          <div className="rounded-2xl border border-line-subtle bg-surface p-8 text-center shadow-sm">
            <div className="mb-4 mx-auto flex size-12 items-center justify-center rounded-full bg-danger-muted text-danger">
              <AlertCircle className="size-6 stroke-[1.5]" />
            </div>
            <h1 className="text-xl font-semibold text-primary mb-2">Model-ready dataset required</h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-secondary mb-6">
              Apply classical preprocessing before continuing to model analysis.
            </p>
            <Link
              to="/app/preprocessing"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              <ArrowLeft className="size-3.5" />
              Go to preprocessing
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center pb-16">
      <DiagnosticWorkflowNav currentStage="quantum" datasetLoaded={true} canContinue={true} />

      <div className="w-full max-w-[860px] mb-4 mt-2">
        <Link
          to="/app/preprocessing"
          className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Preprocessing
        </Link>
      </div>

      <div className="mb-8 w-full max-w-[860px]">
        <h1 className="font-display text-3xl text-primary">Model-ready dataset</h1>
        <p className="mt-1.5 max-w-lg text-sm text-secondary">
          {processed.processedFeatureCount} features · {processed.processedRows.toLocaleString()} rows — shared by
          both branches below.
        </p>
      </div>

      <div className="flex w-full max-w-[860px] flex-col gap-6">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-secondary">Branch A</span>
            <Badge tone="success">Available</Badge>
          </div>
          <ClassicalMlWorkspace processed={processed} />
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-accent">Branch B — Active</span>
            <Badge tone="info">Quantum</Badge>
          </div>
          <QuantumMlWorkspace />
        </div>

        {/* Continuation banner */}
        <div className="rounded-2xl border border-line-subtle bg-surface p-6 text-center space-y-2">
          <h3 className="text-lg font-semibold text-primary">Compare classical & quantum evidence</h3>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-secondary">
            Synthesize predictions, evaluate agreement, compare probability distributions, and inspect domain
            compatibility in the Model Comparison workspace.
          </p>
          <div className="pt-2">
            <Link
              to="/app/comparison"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              <span>Continue to Model Comparison</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
