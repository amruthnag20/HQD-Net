import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from './useSession'

/** Guards the /app subtree — redirects signed-out visitors to sign-in. */
export function RequireAuth() {
  const { status } = useSession()
  if (status === 'signed_out') return <Navigate to="/auth/sign-in" replace />
  return <Outlet />
}

/** Guards the /auth subtree — redirects already signed-in visitors into the app. */
export function RequireGuest() {
  const { status } = useSession()
  if (status === 'signed_in') return <Navigate to="/app/home" replace />
  return <Outlet />
}
