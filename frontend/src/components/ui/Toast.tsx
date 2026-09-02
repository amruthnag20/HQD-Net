import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Tone } from './Badge'
import { ToastContext, type ToastOptions } from './toast-context'
import { toastVariants } from '@/lib/motion/variants'

type ToastItem = {
  id: string
  title: string
  description?: string
  tone: Tone
}

const toneDotClass: Record<Tone, string> = {
  neutral: 'bg-primary',
  success: 'bg-success shadow-[0_0_4px_var(--color-success)]',
  warning: 'bg-warning shadow-[0_0_4px_var(--color-warning)]',
  danger: 'bg-danger shadow-[0_0_4px_var(--color-danger)]',
  signal: 'bg-accent shadow-[0_0_4px_var(--color-accent)]',
  info: 'bg-accent',
}

const toneBorderClass: Record<Tone, string> = {
  neutral: 'border-line',
  success: 'border-success/40',
  warning: 'border-warning/40',
  danger: 'border-danger/40',
  signal: 'border-accent/40',
  info: 'border-accent/40',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const prefersReducedMotion = useReducedMotion()

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    ({ title, description, tone = 'neutral', durationMs = 4000 }: ToastOptions) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, title, description, tone }])
      setTimeout(() => dismiss(id), durationMs)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-toast flex flex-col gap-2 max-w-sm w-full px-4">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                initial="initial"
                animate="animate"
                exit="exit"
                variants={prefersReducedMotion ? undefined : toastVariants}
                className={cn(
                  'pointer-events-auto flex items-start justify-between gap-3 rounded-lg border bg-surface-raised p-3.5 shadow-popover',
                  toneBorderClass[toast.tone],
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={cn('size-2 rounded-full mt-1.5 shrink-0', toneDotClass[toast.tone])} />
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-wider text-primary font-medium">{toast.title}</p>
                    {toast.description ? (
                      <p className="mt-1 font-sans text-xs text-secondary leading-relaxed">{toast.description}</p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="focus-ring rounded p-1 text-muted hover:text-primary transition-colors shrink-0"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
