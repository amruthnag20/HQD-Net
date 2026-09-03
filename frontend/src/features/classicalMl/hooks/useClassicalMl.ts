import { useContext } from 'react'
import { ClassicalMlContext, type ClassicalMlContextValue } from '../context/classicalMl-context'

export function useClassicalMl(): ClassicalMlContextValue {
  const ctx = useContext(ClassicalMlContext)
  if (!ctx) {
    throw new Error('useClassicalMl must be used within a ClassicalMlProvider')
  }
  return ctx
}
