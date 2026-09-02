import { useMemo, useState, type ReactNode } from 'react'
import { SessionContext, type SessionContextValue, type SessionState, type MockUser } from './session-context'

const MOCK_USER: MockUser = {
  name: 'Alex Rivera',
  role: 'Research Lead',
  workspace: 'HQD Diagnostics Lab',
}

/**
 * Frontend-only mock session — no backend, no persistence. A page refresh
 * resets to signed_out; that's expected for this phase and easy to swap for
 * real auth later without touching call sites (useSession/RequireAuth).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'signed_out', user: null })

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      signIn: () => setState({ status: 'signed_in', user: MOCK_USER }),
      signOut: () => setState({ status: 'signed_out', user: null }),
    }),
    [state],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
