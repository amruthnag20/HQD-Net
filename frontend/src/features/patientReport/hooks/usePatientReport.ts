import { useContext } from 'react'
import { PatientReportContext, type PatientReportContextValue } from '../context/patientReport-context'

export function usePatientReport(): PatientReportContextValue {
  const ctx = useContext(PatientReportContext)
  if (!ctx) {
    throw new Error('usePatientReport must be used within a PatientReportProvider')
  }
  return ctx
}
