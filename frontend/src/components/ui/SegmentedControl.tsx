import { cn } from '@/lib/utils/cn'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
}

/**
 * Calm pill-track segmented control — replaces ad hoc rows of bordered toggle
 * buttons across workspace pages. A single soft-tracked switch reads as one
 * control instead of a cluster of separate buttons. Use `variant="tabs"` when
 * switching between views of the same content, `variant="radio"` when picking
 * one of several settings/strategies.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  ariaLabel,
  variant = 'tabs',
  disabled = false,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  size?: 'sm' | 'md'
  ariaLabel: string
  variant?: 'tabs' | 'radio'
  disabled?: boolean
}) {
  const isRadio = variant === 'radio'

  return (
    <div
      role={isRadio ? 'radiogroup' : 'tablist'}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-surface-subtle p-0.5',
        size === 'sm' ? 'text-xs' : 'text-sm',
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role={isRadio ? 'radio' : 'tab'}
            aria-checked={isRadio ? active : undefined}
            aria-selected={isRadio ? undefined : active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full font-medium transition-colors focus-ring',
              size === 'sm' ? 'px-3 py-1' : 'px-3.5 py-1.5',
              active ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary',
              disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
