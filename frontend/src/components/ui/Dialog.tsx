import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { backdropVariants, dialogVariants } from '@/lib/motion/variants'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type DialogProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  ariaLabel?: string
  maxWidth?: string
  children: ReactNode
  showCloseButton?: boolean
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  ariaLabel,
  maxWidth = 'max-w-md',
  children,
  showCloseButton = true,
}: DialogProps) {
  const prefersReducedMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const focusable = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    focusable?.[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialog) return

      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [isOpen, onClose])

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-drawer flex items-center justify-center p-4">
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={prefersReducedMotion ? undefined : backdropVariants}
            className="fixed inset-0 bg-canvas/75 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel || title}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={prefersReducedMotion ? undefined : dialogVariants}
            className={cn(
              'relative z-10 w-full border border-line-subtle bg-surface-raised p-6 shadow-popover rounded-2xl',
              maxWidth,
            )}
          >
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="focus-ring absolute top-4 right-4 rounded-md p-1.5 text-muted hover:text-primary transition-colors"
              >
                <X className="size-4" />
              </button>
            )}

            {title && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-primary">
                  {title}
                </h3>
                {description && (
                  <p className="mt-1 font-sans text-xs text-secondary leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            )}

            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
