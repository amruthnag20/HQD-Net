import { useState, type ReactNode } from 'react'
import { Sidebar } from '@/components/navigation/Sidebar'
import { MobileDrawer } from '@/components/navigation/MobileDrawer'
import { Header } from './Header'

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div data-app-root className="flex h-screen min-h-0 overflow-hidden">
      <Sidebar />
      <MobileDrawer isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main
          id="main-scroll-container"
          data-lenis-prevent
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
