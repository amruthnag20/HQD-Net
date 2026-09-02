import { SettingsSection } from './SettingsSection'
import { backendInformation } from '../data/defaultSettings'

export function QuantumBackend() {
  return (
    <SettingsSection title="Quantum Backend" description="Examine the currently configured execution environment.">
      
      <div className="flex flex-col gap-12 max-w-2xl">
        
        {/* Active Backend */}
        <div className="p-6 border border-line bg-surface-subtle flex flex-col gap-6">
          <div className="flex justify-between items-start">
             <div className="flex flex-col gap-1">
               <span className="font-mono text-[10px] text-muted tracking-widest uppercase">ACTIVE BACKEND</span>
               <span className="font-display text-2xl text-primary tracking-widest uppercase">{backendInformation.type}</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="size-2 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
               <span className="font-mono text-[10px] text-success tracking-widest uppercase">AVAILABLE</span>
             </div>
          </div>
          
          <div className="w-full border-t border-line-subtle" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1">
              <span className="font-sans text-[10px] text-secondary uppercase">DEVICE</span>
              <span className="font-mono text-xs text-primary">{backendInformation.device}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-sans text-[10px] text-secondary uppercase">QUBITS</span>
              <span className="font-mono text-xs text-primary">{backendInformation.qubits}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-sans text-[10px] text-secondary uppercase">MODE</span>
              <span className="font-mono text-xs text-primary">{backendInformation.executionMode}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-sans text-[10px] text-secondary uppercase">STATUS</span>
              <span className="font-mono text-xs text-primary">{backendInformation.status}</span>
            </div>
          </div>
        </div>

        {/* Hardware Staging */}
        <div className="flex flex-col gap-4">
           <span className="font-mono text-xs text-secondary tracking-widest uppercase border-b border-line-subtle pb-2">HARDWARE STAGING</span>
           
           <div className="p-6 border border-line-subtle bg-transparent flex flex-col md:flex-row justify-between items-start md:items-center gap-4 opacity-50">
             <div className="flex flex-col">
               <span className="font-mono text-sm text-primary tracking-widest uppercase">REMOTE QUANTUM HARDWARE</span>
               <span className="font-sans text-xs text-muted mt-1">Coming in future research configuration.</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="size-2 rounded-full bg-muted" />
               <span className="font-mono text-[10px] text-muted tracking-widest uppercase">NOT CONNECTED</span>
             </div>
           </div>
        </div>

      </div>
    </SettingsSection>
  )
}
