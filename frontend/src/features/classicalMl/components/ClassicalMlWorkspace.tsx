import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import { ModelInputPanel } from './ModelInputPanel'
import { ClassicalModelPanel } from './ClassicalModelPanel'

type Props = { processed: ProcessedDataset }

export function ClassicalMlWorkspace({ processed }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <ModelInputPanel processed={processed} />
      <ClassicalModelPanel />
    </div>
  )
}
