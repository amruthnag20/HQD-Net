import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DiagnosticWorkflowNav } from '@/components/navigation/DiagnosticWorkflowNav'
import { ModelComparisonWorkspace } from '@/features/modelComparison/components/ModelComparisonWorkspace'

export function ModelComparison() {
  return (
    <div className="w-full flex flex-col items-center pb-16">
      <DiagnosticWorkflowNav
        currentStage="predict"
        datasetLoaded={true}
        canContinue={true}
      />

      <div className="w-full max-w-[860px] mb-4 mt-2">
        <Link
          to="/app/model-ready"
          className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Model Analysis
        </Link>
      </div>

      <div className="w-full max-w-[860px]">
        <ModelComparisonWorkspace />
      </div>
    </div>
  )
}
