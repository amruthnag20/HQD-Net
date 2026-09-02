import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { SessionProvider } from '@/features/auth/SessionContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { LivingComputationalBackground } from '@/components/motion/LivingComputationalBackground'
import { useLenisSetup } from '@/lib/motion/lenis'

function App() {
  useLenisSetup()

  return (
    <ErrorBoundary>
      <SessionProvider>
        <ToastProvider>
          <LivingComputationalBackground />
          <RouterProvider router={router} />
        </ToastProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}

export default App
