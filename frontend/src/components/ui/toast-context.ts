import { createContext, useContext } from 'react'
import type { Tone } from './Badge'

export type ToastOptions = {
  title: string
  description?: string
  tone?: Tone
  durationMs?: number
}

export type ToastContextValue = {
  show: (options: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
