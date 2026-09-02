import type { ReactNode, RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { popoverVariants } from '@/lib/motion/variants'
import { useDismissable } from '@/lib/utils/useDismissable'
import { cn } from '@/lib/utils/cn'

export type PopoverProps = {
  isOpen: boolean
  onClose: () => void
  /** Wraps the trigger + this popover so clicking the trigger isn't treated as an outside click. */
  containerRef: RefObject<HTMLElement | null>
  align?: 'start' | 'end'
  width?: number
  ariaLabel: string
  children: ReactNode
}

/** Generic positioned-panel primitive. NotificationPopover/ProfilePopover configure it. */
export function Popover({
  isOpen,
  onClose,
  containerRef,
  align = 'end',
  width = 320,
  ariaLabel,
  children,
}: PopoverProps) {
  const prefersReducedMotion = useReducedMotion()
  useDismissable(containerRef, onClose, isOpen)

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          role="dialog"
          aria-label={ariaLabel}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={prefersReducedMotion ? undefined : popoverVariants}
          style={{ width }}
          className={cn(
            'absolute top-full z-popover mt-2 rounded-lg border border-line bg-surface-raised p-2 shadow-popover',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
