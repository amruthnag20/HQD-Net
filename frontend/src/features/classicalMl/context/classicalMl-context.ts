import { createContext } from 'react'
import type { ClassicalModelResult, ClassicalModelStatus } from '../types/classicalMl'

export type ClassicalMlContextValue = {
  status: ClassicalModelStatus
  /** Set for label-required/unsupported-target/error — explains the status
   *  without it reading as a system failure. */
  statusMessage: string | null
  result: ClassicalModelResult | null
  actions: {
    train: () => void
  }
}

export const ClassicalMlContext = createContext<ClassicalMlContextValue | null>(null)
