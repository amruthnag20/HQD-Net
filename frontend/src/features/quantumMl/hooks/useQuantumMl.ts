import { useContext } from 'react'
import { QuantumMlContext, type QuantumMlContextValue } from '../context/quantumMl-context'

export function useQuantumMl(): QuantumMlContextValue {
  const ctx = useContext(QuantumMlContext)
  if (!ctx) {
    throw new Error('useQuantumMl must be used within a QuantumMlProvider')
  }
  return ctx
}
