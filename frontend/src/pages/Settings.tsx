import { SettingsWorkspace } from '@/features/settings/components/SettingsWorkspace'

export function Settings() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--header-height))] relative">
      <SettingsWorkspace />
    </div>
  )
}
