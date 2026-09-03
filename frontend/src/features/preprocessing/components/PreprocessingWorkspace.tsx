import type { DatasetState } from '@/features/ingestion/types/dataset'
import { DatasetSummaryPanel } from '@/features/ingestion/components/DatasetSummaryPanel'
import { usePreprocessing } from '../hooks/usePreprocessing'
import { FeatureProfileTable } from './FeatureProfileTable'
import { LowInformationPanel } from './LowInformationPanel'
import { MissingValuesPanel } from './MissingValuesPanel'
import { CategoricalEncodingPanel } from './CategoricalEncodingPanel'
import { FeatureSelectionPanel } from './FeatureSelectionPanel'
import { ScalingPanel } from './ScalingPanel'
import { ApplyBar } from './ApplyBar'
import { ModelReadySummary } from './ModelReadySummary'

type Props = { dataset: DatasetState }

/** Orchestrates the Phase 2 workspace: dataset summary → feature profile →
 *  missing values → categorical encoding → feature selection → scaling →
 *  apply → model-ready dataset, following the page structure in the Phase
 *  2 spec (section 5). */
export function PreprocessingWorkspace({ dataset }: Props) {
  const { phase, processed } = usePreprocessing()

  return (
    <div className="flex w-full max-w-[860px] flex-col gap-5">
      <DatasetSummaryPanel dataset={dataset} />
      <FeatureProfileTable dataset={dataset} />
      <LowInformationPanel dataset={dataset} />
      <MissingValuesPanel dataset={dataset} />
      <CategoricalEncodingPanel dataset={dataset} />
      <FeatureSelectionPanel />
      <ScalingPanel dataset={dataset} />

      <ApplyBar />

      {phase === 'complete' && processed && <ModelReadySummary processed={processed} />}
    </div>
  )
}
