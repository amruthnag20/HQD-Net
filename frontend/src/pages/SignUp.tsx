import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useSession } from '@/features/auth/useSession'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { PasswordField } from '@/features/auth/components/PasswordField'
import type { AuthStatusState } from '@/layouts/AuthLayout'
import { usePrefersReducedMotion } from '@/lib/utils/usePrefersReducedMotion'

/**
 * Sign Up — identity creation gateway.
 */
export function SignUp() {
  const navigate = useNavigate()
  const { signIn } = useSession()
  const { setAuthStatus } = useOutletContext<{ setAuthStatus: (s: AuthStatusState) => void }>()
  const prefersReducedMotion = usePrefersReducedMotion()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [buttonText, setButtonText] = useState('CREATE ACCESS')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    // Fake inline validation
    if (name.length < 2) {
      setError('Enter your full name.')
      return
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    setAuthStatus('verifying')
    setButtonText('AUTHORIZING')

    // Mock network request & transition flow
    setTimeout(() => {
      setAuthStatus('granted')
      setButtonText('ACCOUNT CREATED')
      
      setTimeout(() => {
        // Technically this should be a signUp method, but signIn sets the session mock appropriately.
        signIn() 
        navigate('/app/home')
      }, 500)
    }, 1200)
  }

  // Handle focus states changing the visual field subtly
  const handleFocus = () => setAuthStatus('detected')
  const handleBlur = () => !isSubmitting && setAuthStatus('idle')

  return (
    <motion.div
      initial={{ opacity: prefersReducedMotion ? 1 : 0, x: prefersReducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: prefersReducedMotion ? 1 : 0, x: prefersReducedMotion ? 0 : -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex w-full flex-col"
    >
      <h2 className="font-display text-4xl leading-none tracking-wide text-primary">
        CREATE ACCESS
      </h2>
      <p className="mt-3 text-sm text-secondary">
        Set up your HQD-Net research workspace.
      </p>

      {error && (
        <div className="mt-6 border border-danger/20 bg-danger/5 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthInput
          label="Full Name"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Dr. Alex Rivera"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isSubmitting}
        />
        
        <AuthInput
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="researcher@example.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isSubmitting}
        />
        
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isSubmitting}
        />
        
        <PasswordField
          label="Confirm Password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isSubmitting}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="group focus-ring mt-4 inline-flex w-full items-center justify-center gap-3 border border-accent bg-accent px-6 py-4 font-display text-sm tracking-widest text-accent-fg transition-all duration-200 ease-out hover:bg-accent-hover hover:border-accent-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-80"
          style={{ borderRadius: '2px' }}
        >
          {buttonText}
          {!isSubmitting && (
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2} />
          )}
        </button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-6">
        <div className="flex w-full items-center gap-4">
          <div className="h-px flex-1 bg-border-subtle" />
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">OR</span>
          <div className="h-px flex-1 bg-border-subtle" />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-secondary">Already have access?</span>
          <Link
            to="/auth/sign-in"
            className="focus-ring inline-flex items-center gap-2 font-mono text-xs tracking-widest text-accent uppercase transition-colors hover:text-accent-hover"
            onClick={() => setAuthStatus('idle')}
          >
            Sign In <ArrowRight className="size-3" strokeWidth={2} />
          </Link>
        </div>
      </div>
      
      <div className="mt-12 flex justify-center opacity-40">
        <p className="text-center font-mono text-[10px] tracking-widest text-muted uppercase">
          Research Environment<br />Authorized Access Only
        </p>
      </div>
    </motion.div>
  )
}
