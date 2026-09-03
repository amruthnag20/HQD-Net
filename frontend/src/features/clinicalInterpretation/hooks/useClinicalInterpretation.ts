import { useContext } from 'react'
import { ClinicalContext, type ClinicalContextValue } from '../context/clinical-context'

export function useClinicalInterpretation(): ClinicalContextValue {
  const ctx = useContext(ClinicalContext)
  if (!ctx) {
    throw new Error('useClinicalInterpretation must be used within a ClinicalInterpretationProvider')
  }
  return ctx
}
