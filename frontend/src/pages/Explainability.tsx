import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DiagnosticWorkflowNav } from '@/components/navigation/DiagnosticWorkflowNav'
import { ExplainabilityWorkspace } from '@/features/explainability/components/ExplainabilityWorkspace'

export default function ExplainabilityPage() {
  return (
    <div className="w-full flex flex-col items-center pb-16">
      <DiagnosticWorkflowNav currentStage="explain" datasetLoaded canContinue />

      <div className="w-full max-w-[860px] mb-2">
        <Link
          to="/app/comparison"
          className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Comparison
        </Link>
      </div>

      <div className="w-full max-w-[860px]">
        <ExplainabilityWorkspace />
      </div>
    </div>
  )
}
