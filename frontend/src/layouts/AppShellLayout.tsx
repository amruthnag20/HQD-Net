import { AppShell } from '@/components/shell/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'

export function AppShellLayout() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-8 md:px-10">
        <PageTransition />
      </div>
    </AppShell>
  )
}
