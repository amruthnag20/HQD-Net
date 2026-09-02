import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

/**
 * Specialized input for the authentication environment.
 * Features a subtle Royal Blue focus ring, eschewing standard
 * generic SaaS styles.
 */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  function AuthInput({ label, error, className, id, required, ...props }, ref) {
    const inputId = id || `auth-input-${label.toLowerCase().replace(/\s+/g, '-')}`

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="font-mono text-[10px] tracking-widest text-muted uppercase transition-colors group-focus-within:text-secondary"
        >
          {label}
        </label>
        <div className="relative group">
          <input
            ref={ref}
            id={inputId}
            required={required}
            className={cn(
              'w-full bg-canvas/50 border border-line-subtle px-4 py-3 text-sm text-primary transition-all duration-200 outline-none placeholder:text-disabled',
              'focus:border-accent focus:bg-canvas focus:shadow-[0_0_0_3px_var(--color-accent-muted)]',
              error && 'border-danger/50 focus:border-danger focus:shadow-[0_0_0_3px_var(--color-danger-muted)]',
              className
            )}
            style={{ borderRadius: '2px' }}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-0.5 text-xs text-danger/90" role="alert" aria-live="polite">
            {error}
          </p>
        )}
      </div>
    )
  }
)
