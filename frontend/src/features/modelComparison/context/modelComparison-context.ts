import { createContext } from 'react'
import type { ModelComparisonResult } from '../types/modelComparison'
import type { NativeQuantumPredictResponse } from '@/features/quantumMl/api/quantumApi'

export type ModelComparisonContextValue = {
  comparisonResult: ModelComparisonResult
  activeFixtureKey: string
  setActiveFixtureKey: (key: string) => void
  selectedRowIndex: number
  setSelectedRowIndex: (idx: number) => void
  isLoading: boolean
  isBackendOnline: boolean
  checkBackendConnection: () => Promise<void>
  runQuantumVerification: (rowIndex?: number) => Promise<void>
  /** Raw native VQC response — available when backend is online and verification has run. */
  quantumNativeResult: NativeQuantumPredictResponse | null
}

export const ModelComparisonContext = createContext<ModelComparisonContextValue | null>(null)
