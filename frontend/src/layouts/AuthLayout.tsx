import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AuthVisualField } from '@/features/auth/components/AuthVisualField'
import { useState } from 'react'

export type AuthStatusState = 'idle' | 'detected' | 'verifying' | 'granted'

/**
 * Two-zone composition for authentication.
 * Left: Computational Identity (editorial text, breathing visual field).
 * Right: Auth Surface (embedded form).
 */
export function AuthLayout() {
  // We can lift the status state up or pass it via context if we want the visual field
  // to react to form events in the Outlet. For now, we'll expose a lightweight context.
  const [authStatus, setAuthStatus] = useState<AuthStatusState>('idle')

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Top Nav (Mobile & Desktop) */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-[var(--header-height)] items-center justify-between px-6 lg:px-12">
        <Link
          to="/"
          className="focus-ring font-display text-xl leading-none tracking-[0.12em] text-primary transition-opacity hover:opacity-70"
          aria-label="Return to HQD-Net home"
        >
          HQD-NET
        </Link>
        <Link
          to="/"
          className="group focus-ring inline-flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted uppercase hover:text-primary"
        >
          <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
          Back
        </Link>
      </header>

      {/* Left: Computational Identity */}
      <div className="relative flex min-h-[45vh] flex-col justify-center px-6 pt-24 pb-12 lg:min-h-screen lg:w-[55%] lg:px-12 lg:pt-0 lg:pb-0">
        {/* Abstract background field */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-start overflow-hidden opacity-60">
          <AuthVisualField status={authStatus} className="min-w-[800px]" />
        </div>

        {/* Editorial Text */}
        <div className="relative z-10 max-w-sm">
          <p className="font-mono text-[10px] tracking-widest text-muted uppercase">
            Access / 01
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-wide text-primary lg:text-6xl">
            ENTER THE<br />DIAGNOSTIC<br />ENVIRONMENT
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-secondary">
            Access the protected HQD-Net research workspace.
          </p>

          <div className="mt-12 flex flex-col gap-4">
            <p className="font-mono text-[10px] tracking-widest text-muted uppercase">
              Classical → Quantum → Classical
            </p>
            <div className="flex items-center gap-2">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60" style={{ animation: 'status-ping 2s infinite' }} />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              <span className="font-mono text-[10px] tracking-widest text-success uppercase">
                Local Engine Ready
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Auth Surface */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center bg-surface px-4 py-12 lg:px-12">
        {/* A subtle border separator on desktop */}
        <div className="absolute inset-y-0 left-0 hidden w-px bg-border-subtle lg:block" />
        
        <div className="w-full max-w-[360px]">
          {/* We use an Outlet context to pass the status setter down to the forms */}
          <Outlet context={{ authStatus, setAuthStatus }} />
        </div>
      </div>
    </div>
  )
}
