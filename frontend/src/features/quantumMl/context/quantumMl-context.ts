import { createContext } from 'react'
import type { QuantumModelResult } from '../types/quantumMl'

export type QuantumMlContextValue = {
  /** Null only when there's no model-ready dataset yet (mirrors 'idle'). */
  result: QuantumModelResult | null
}

export const QuantumMlContext = createContext<QuantumMlContextValue | null>(null)
