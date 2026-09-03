import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { CsvParseError, parseCsv, type ParsedCsv } from '../lib/csvParser'
import { buildDatasetState, MAX_FILE_SIZE_BYTES } from '../lib/datasetAnalysis'
import { SAMPLE_DATASET_CSV, SAMPLE_DATASET_FILENAME } from '../data/sampleDataset'
import type { DatasetState } from '../types/dataset'
import {
  DatasetIngestionContext,
  type IngestionStage,
  type DatasetIngestionContextValue,
} from './dataset-context'

type LoadedCsv = { file: File; parsed: ParsedCsv }

function validateFileBeforeReading(file: File): string | null {
  const looksLikeCsv = file.name.toLowerCase().endsWith('.csv')
  if (!looksLikeCsv) {
    return 'Only .csv files are supported in this phase.'
  }
  if (file.size === 0) {
    return 'The selected file is empty.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large (${(file.size / (1024 * 1024)).toFixed(0)} MB). The limit is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`
  }
  return null
}

export function DatasetIngestionProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<IngestionStage>('empty')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<LoadedCsv | null>(null)
  const [targetColumn, setTargetColumn] = useState<string | null>(null)

  const loadFile = useCallback(async (file: File) => {
    const preflightError = validateFileBeforeReading(file)
    if (preflightError) {
      setStage('error')
      setErrorMessage(preflightError)
      return
    }

    setStage('loading')
    setErrorMessage(null)

    try {
      const text = await file.text()
      const parsed = parseCsv(text)
      setLoaded({ file, parsed })
      setTargetColumn(null)
      setStage('ready')
    } catch (err) {
      const message = err instanceof CsvParseError
        ? err.message
        : 'The CSV structure could not be parsed.'
      setStage('error')
      setErrorMessage(message)
      setLoaded(null)
    }
  }, [])

  const loadSample = useCallback(() => {
    const file = new File([SAMPLE_DATASET_CSV], SAMPLE_DATASET_FILENAME, { type: 'text/csv' })
    void loadFile(file)
  }, [loadFile])

  const selectTarget = useCallback((column: string | null) => {
    setTargetColumn(column)
  }, [])

  const reset = useCallback(() => {
    setStage('empty')
    setErrorMessage(null)
    setLoaded(null)
    setTargetColumn(null)
  }, [])

  const dataset: DatasetState | null = useMemo(() => {
    if (!loaded) return null
    return buildDatasetState({ file: loaded.file, parsed: loaded.parsed, targetColumn })
  }, [loaded, targetColumn])

  // Target selection is optional for this milestone — it belongs to a future
  // supervised-training stage, not to ingestion/preprocessing. A dataset is
  // ready to continue once it's structurally valid, target or no target.
  const canContinue = dataset !== null && dataset.validationStatus !== 'invalid'

  const value: DatasetIngestionContextValue = useMemo(() => ({
    stage,
    errorMessage,
    dataset,
    canContinue,
    actions: { loadFile, loadSample, selectTarget, reset },
  }), [stage, errorMessage, dataset, canContinue, loadFile, loadSample, selectTarget, reset])

  return (
    <DatasetIngestionContext.Provider value={value}>
      {children}
    </DatasetIngestionContext.Provider>
  )
}
