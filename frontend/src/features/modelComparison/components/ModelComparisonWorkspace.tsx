import { useModelComparison } from '../hooks/useModelComparison'
import { ComparisonHeader } from './ComparisonHeader'
import { ScenarioSelector } from './ScenarioSelector'
import { InputCompatibility } from './InputCompatibility'
import { DecisionSnapshot } from './DecisionSnapshot'
import { ModelComparisonCard } from './ModelComparisonCard'
import { ProbabilityComparison } from './ProbabilityComparison'
import { ComparisonTable } from './ComparisonTable'
import { ModelPerformance } from './ModelPerformance'
import { ComputationalProfile } from './ComputationalProfile'
import { ExplainabilityHandoff } from './ExplainabilityHandoff'

export function ModelComparisonWorkspace() {
  const { comparisonResult, isBackendOnline } = useModelComparison()

  return (
    <div className="w-full flex flex-col gap-5">
      <ComparisonHeader result={comparisonResult} isBackendOnline={isBackendOnline} />
      <ScenarioSelector />
      <InputCompatibility compatibility={comparisonResult.inputCompatibility} />
      <DecisionSnapshot result={comparisonResult} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ModelComparisonCard
          title="Classical ML decision"
          branchLabel="Branch A — Classical"
          summary={comparisonResult.classical}
          badgeTone="neutral"
        />
        <ModelComparisonCard
          title="Quantum VQC decision"
          branchLabel="Branch B — Quantum"
          summary={comparisonResult.quantum}
          badgeTone="info"
        />
      </div>

      <ProbabilityComparison
        classical={comparisonResult.classical}
        quantum={comparisonResult.quantum}
        isCompatible={comparisonResult.inputCompatibility.isCompatible}
      />

      <ComparisonTable classical={comparisonResult.classical} quantum={comparisonResult.quantum} />
      <ModelPerformance classical={comparisonResult.classical} quantum={comparisonResult.quantum} />
      <ComputationalProfile classical={comparisonResult.classical} quantum={comparisonResult.quantum} />

      <ExplainabilityHandoff />
    </div>
  )
}
