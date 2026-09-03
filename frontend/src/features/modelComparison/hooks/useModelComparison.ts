import { useContext } from 'react'
import {
  ModelComparisonContext,
  type ModelComparisonContextValue,
} from '../context/modelComparison-context'

export function useModelComparison(): ModelComparisonContextValue {
  const context = useContext(ModelComparisonContext)
  if (!context) {
    throw new Error('useModelComparison must be used within a ModelComparisonProvider')
  }
  return context
}
