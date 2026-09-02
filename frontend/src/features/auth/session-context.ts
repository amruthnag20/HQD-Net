import { createContext } from 'react'

export type SessionStatus = 'signed_out' | 'signed_in'

export type MockUser = {
  name: string
  role: string
  workspace: string
}

export type SessionState = {
  status: SessionStatus
  user: MockUser | null
}

export type SessionContextValue = SessionState & {
  signIn: () => void
  signOut: () => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)
