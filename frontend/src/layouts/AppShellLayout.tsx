import { AppShell } from '@/components/shell/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { DatasetIngestionProvider } from '@/features/ingestion/context/DatasetIngestionContext'

export function AppShellLayout() {
  return (
    <DatasetIngestionProvider>
      <AppShell>
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-8 md:px-10">
          <PageTransition />
        </div>
      </AppShell>
    </DatasetIngestionProvider>
  )
}
