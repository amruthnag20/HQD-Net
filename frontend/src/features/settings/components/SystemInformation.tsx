import { SettingsSection } from './SettingsSection'
import { systemInformation } from '../data/defaultSettings'

export function SystemInformation() {
  return (
    <SettingsSection title="System Information" description="Read-only diagnostic information about the HQD-Net software environment.">
      
      <div className="flex flex-col gap-8 max-w-2xl">
        
        <div className="flex items-center gap-3 mb-4">
          <div className="size-2 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
          <span className="font-mono text-sm tracking-widest text-primary uppercase">SYSTEM READY</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-6">
          <div className="flex flex-col gap-1 border-l-2 border-line pl-3">
            <span className="font-sans text-[10px] text-secondary uppercase">APPLICATION</span>
            <span className="font-mono text-xs text-primary uppercase">{systemInformation.application}</span>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-line pl-3">
            <span className="font-sans text-[10px] text-secondary uppercase">VERSION</span>
            <span className="font-mono text-xs text-primary uppercase">{systemInformation.version}</span>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-line pl-3">
            <span className="font-sans text-[10px] text-secondary uppercase">ENVIRONMENT</span>
            <span className="font-mono text-xs text-primary uppercase">{systemInformation.environment}</span>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-line pl-3">
            <span className="font-sans text-[10px] text-secondary uppercase">FRONTEND</span>
            <span className="font-mono text-xs text-primary uppercase">{systemInformation.frontend}</span>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-line pl-3">
            <span className="font-sans text-[10px] text-secondary uppercase">RUNTIME</span>
            <span className="font-mono text-xs text-primary uppercase">{systemInformation.runtime}</span>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-line pl-3">
            <span className="font-sans text-[10px] text-secondary uppercase">QUANTUM LAYER</span>
            <span className="font-mono text-xs text-primary uppercase">{systemInformation.quantumLayer}</span>
          </div>
        </div>

        <div className="mt-8 p-4 border border-line bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase">BUILD</span>
            <span className="font-mono text-xs text-secondary">{systemInformation.build}</span>
          </div>
          <div className="flex flex-col md:text-right">
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase">UI STAGE</span>
            <span className="font-mono text-xs text-secondary uppercase">{systemInformation.ui}</span>
          </div>
        </div>

      </div>
    </SettingsSection>
  )
}
