import { useExplainability } from '../hooks/useExplainability'
import { ExplainabilityHeader } from './ExplainabilityHeader'
import { PredictionHero } from './PredictionHero'
import { FeatureSignalTable } from './FeatureSignalTable'
import { ModelInternals } from './ModelInternals'
import { PreprocessingTrace } from './PreprocessingTrace'
import { GlobalExplanation } from './GlobalExplanation'
import { ExplanationSummary } from './ExplanationSummary'
import { ScientificDisclaimer } from './ScientificDisclaimer'
import { ClinicalInterpretationPreview } from './ClinicalInterpretationPreview'

export function ExplainabilityWorkspace() {
  const { scope } = useExplainability()

  return (
    <div className="flex w-full flex-col gap-5">
      <ExplainabilityHeader />
      <PredictionHero />

      {scope === 'local' ? (
        <>
          <FeatureSignalTable />
          <ModelInternals />
          <PreprocessingTrace />
        </>
      ) : (
        <GlobalExplanation />
      )}

      <ExplanationSummary />
      <ScientificDisclaimer />
      <ClinicalInterpretationPreview />
    </div>
  )
}
