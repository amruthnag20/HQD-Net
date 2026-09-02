import { createContext } from 'react'
import type { DatasetState } from '../types/dataset'

export type IngestionStage = 'empty' | 'loading' | 'error' | 'ready'

export type DatasetIngestionContextValue = {
  stage: IngestionStage
  errorMessage: string | null
  dataset: DatasetState | null
  canContinue: boolean
  actions: {
    loadFile: (file: File) => Promise<void>
    loadSample: () => void
    selectTarget: (column: string | null) => void
    reset: () => void
  }
}

export const DatasetIngestionContext = createContext<DatasetIngestionContextValue | null>(null)
