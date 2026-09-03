import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useClassicalMl } from '@/features/classicalMl/hooks/useClassicalMl'
import { usePreprocessing } from '@/features/preprocessing/hooks/usePreprocessing'
import {
  checkQuantumBackend,
  runNativeVqcVerification,
  type NativeQuantumPredictResponse,
} from '@/features/quantumMl/api/quantumApi'
import {
  buildLiveComparisonResult,
  DETERMINISTIC_FIXTURES,
} from '../api/comparisonAdapter'
import {
  ModelComparisonContext,
  type ModelComparisonContextValue,
} from './modelComparison-context'

export function ModelComparisonProvider({ children }: { children: ReactNode }) {
  const { result: classicalResult } = useClassicalMl()
  const { processed } = usePreprocessing()

  const [activeFixtureKey, setActiveFixtureKey] = useState<string>('live')
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0)
  const [quantumNativeResult, setQuantumNativeResult] = useState<NativeQuantumPredictResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false)

  // Initial check of quantum backend connectivity
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        await checkQuantumBackend()
        if (!cancelled) {
          setIsBackendOnline(true)
          // Attempt to fetch row 0 native verification if available
          try {
            const resp = await runNativeVqcVerification(selectedRowIndex)
            if (!cancelled) {
              setQuantumNativeResult(resp)
            }
          } catch {
            // non-blocking
          }
        }
      } catch {
        if (!cancelled) {
          setIsBackendOnline(false)
        }
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [selectedRowIndex])

  const checkBackendConnection = async () => {
    try {
      await checkQuantumBackend()
      setIsBackendOnline(true)
    } catch {
      setIsBackendOnline(false)
    }
  }

  const runQuantumVerification = async (rowIndex: number = selectedRowIndex) => {
    setIsLoading(true)
    try {
      const resp = await runNativeVqcVerification(rowIndex)
      setQuantumNativeResult(resp)
      setIsBackendOnline(true)
    } catch {
      setIsBackendOnline(false)
    } finally {
      setIsLoading(false)
    }
  }

  const comparisonResult = useMemo(() => {
    if (activeFixtureKey !== 'live' && DETERMINISTIC_FIXTURES[activeFixtureKey]) {
      return DETERMINISTIC_FIXTURES[activeFixtureKey]
    }
    return buildLiveComparisonResult(
      classicalResult,
      quantumNativeResult,
      processed,
      selectedRowIndex
    )
  }, [activeFixtureKey, classicalResult, quantumNativeResult, processed, selectedRowIndex])

  const value: ModelComparisonContextValue = useMemo(
    () => ({
      comparisonResult,
      activeFixtureKey,
      setActiveFixtureKey,
      selectedRowIndex,
      setSelectedRowIndex,
      isLoading,
      isBackendOnline,
      checkBackendConnection,
      runQuantumVerification,
      quantumNativeResult,
    }),
    [
      comparisonResult,
      activeFixtureKey,
      selectedRowIndex,
      isLoading,
      isBackendOnline,
      quantumNativeResult,
    ]
  )

  return (
    <ModelComparisonContext.Provider value={value}>
      {children}
    </ModelComparisonContext.Provider>
  )
}
