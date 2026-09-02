import { useContext } from 'react'
import {
  DatasetIngestionContext,
  type IngestionStage,
  type DatasetIngestionContextValue,
} from '../context/dataset-context'

export type { IngestionStage, DatasetIngestionContextValue }

export function useDatasetIngestion(): DatasetIngestionContextValue {
  const ctx = useContext(DatasetIngestionContext)
  if (!ctx) {
    throw new Error('useDatasetIngestion must be used within a DatasetIngestionProvider')
  }
  return ctx
}
