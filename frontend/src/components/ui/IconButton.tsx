import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type Variant = 'ghost' | 'secondary'
type Size = 'sm' | 'md'

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ReactNode
  'aria-label': string
  variant?: Variant
  size?: Size
  active?: boolean
}

const variantClass: Record<Variant, string> = {
  ghost: 'bg-transparent text-secondary hover:bg-surface-raised hover:text-primary',
  secondary: 'bg-surface text-secondary border border-line hover:bg-surface-raised hover:text-primary',
}

const sizeClass: Record<Size, string> = {
  sm: 'size-8',
  md: 'size-11', // ~44px minimum touch target
}

/** Square icon-only interaction target. Always requires an aria-label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'ghost', size = 'md', active = false, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'focus-ring inline-flex items-center justify-center rounded-md transition-colors duration-150 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variantClass[variant],
        active && 'bg-accent-muted text-accent',
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
})
