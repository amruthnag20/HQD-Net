import { useState, forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { AuthInput, type AuthInputProps } from './AuthInput'

export const PasswordField = forwardRef<HTMLInputElement, AuthInputProps>(
  function PasswordField(props, ref) {
    const [show, setShow] = useState(false)

    return (
      <div className="relative">
        <AuthInput
          {...props}
          ref={ref}
          type={show ? 'text' : 'password'}
          className="pr-10"
        />
        <button
          type="button"
          className="focus-ring absolute bottom-0 right-0 flex h-11 w-10 items-center justify-center text-muted transition-colors hover:text-secondary"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? (
            <EyeOff className="size-4" strokeWidth={1.5} />
          ) : (
            <Eye className="size-4" strokeWidth={1.5} />
          )}
        </button>
      </div>
    )
  }
)
