import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DiagnosticWorkflowNav } from '@/components/navigation/DiagnosticWorkflowNav'
import { ClinicalWorkspace } from '@/features/clinicalInterpretation/components/ClinicalWorkspace'

/**
 * Phase 6 — Clinical Interpretation page (/app/clinical-interpretation).
 *
 * Consumes the shared ClinicalInterpretationProvider (hoisted in
 * AppShellLayout alongside comparison + explainability) so the workspace
 * reads real state without re-uploading, duplicating context, or losing a
 * live result on navigation.
 */
export default function ClinicalInterpretationPage() {
  return (
    <div className="w-full flex flex-col items-center pb-16">
      <DiagnosticWorkflowNav currentStage="clinical" datasetLoaded canContinue />

      <div className="w-full max-w-[960px] mb-4 mt-2">
        <Link
          to="/app/explainability"
          className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Explainability
        </Link>
      </div>

      <div className="w-full max-w-[960px]">
        <ClinicalWorkspace />
      </div>
    </div>
  )
}
