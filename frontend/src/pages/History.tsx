import { HistoryWorkspace } from '@/features/history/components/HistoryWorkspace'

export function History() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--header-height))] relative">
      <HistoryWorkspace />
    </div>
  )
}
