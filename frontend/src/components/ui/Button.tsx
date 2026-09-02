import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  loadingText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-canvas hover:bg-secondary active:bg-secondary/90',
  secondary:
    'bg-transparent text-primary border border-line hover:border-line-strong hover:bg-surface-raised active:bg-surface',
  ghost: 'bg-transparent text-secondary hover:bg-surface-subtle hover:text-primary',
  accent: 'bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-hover/90',
  danger: 'bg-danger text-canvas hover:bg-danger/90 active:bg-danger/80',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 font-mono uppercase tracking-wider',
  md: 'h-10 px-4 text-xs gap-2 font-mono uppercase tracking-wider',
  lg: 'h-12 px-6 text-sm gap-2.5 font-mono uppercase tracking-widest',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    loadingText,
    disabled = false,
    leftIcon,
    rightIcon,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'focus-ring group inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-all duration-150 ease-out',
        'active:scale-[0.985] disabled:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      <span>{loading && loadingText ? loadingText : children}</span>
      {!loading && rightIcon ? (
        <span className="transition-transform duration-150 ease-out group-hover:translate-x-0.5">
          {rightIcon}
        </span>
      ) : null}
    </button>
  )
})
