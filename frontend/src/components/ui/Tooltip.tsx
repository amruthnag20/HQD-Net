import { cloneElement, isValidElement, useCallback, useRef, useState, type ReactElement } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { tooltipVariants } from '@/lib/motion/variants'
import { cn } from '@/lib/utils/cn'

export type TooltipProps = {
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayMs?: number
  className?: string
  children: ReactElement
}

const sideClass: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
}

export function Tooltip({ content, side = 'top', delayMs = 200, className, children }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayMs)
  }, [delayMs])
  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(false)
  }, [])

  if (!isValidElement(children)) return children

  // oxlint-disable-next-line react/refs
  const trigger = cloneElement(children as ReactElement<Record<string, unknown>>, {
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  })

  return (
    <span className={cn('relative inline-flex', className)}>
      {trigger}
      <AnimatePresence>
        {open ? (
          <motion.span
            role="tooltip"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={prefersReducedMotion ? undefined : tooltipVariants}
            className={cn(
              'pointer-events-none absolute z-popover whitespace-nowrap rounded-sm border border-line bg-surface-raised px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase text-primary shadow-popover',
              sideClass[side],
            )}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  )
}
