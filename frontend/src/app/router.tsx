import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppShellLayout } from '@/layouts/AppShellLayout'
import { RequireAuth, RequireGuest } from '@/features/auth/RouteGuard'
import { Landing } from '@/pages/Landing'
import { SignIn } from '@/pages/SignIn'
import { SignUp } from '@/pages/SignUp'
import { Home } from '@/pages/Home'
import { History } from '@/pages/History'
import { Settings } from '@/pages/Settings'
import { DataIngestion } from '@/pages/DataIngestion'
import { Preprocessing } from '@/pages/Preprocessing'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [{ index: true, element: <Landing /> }],
  },
  {
    element: <RequireGuest />,
    children: [
      {
        path: 'auth',
        element: <AuthLayout />,
        children: [
          { index: true, element: <Navigate to="sign-in" replace /> },
          { path: 'sign-in', element: <SignIn /> },
          { path: 'sign-up', element: <SignUp /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: 'app',
        element: <AppShellLayout />,
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: 'home', element: <Home /> },
          { path: 'data', element: <DataIngestion /> },
          { path: 'preprocessing', element: <Preprocessing /> },
          { path: 'history', element: <History /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
