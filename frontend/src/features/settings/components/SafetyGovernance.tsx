import { SettingsSection } from './SettingsSection'
import type { GovernanceSettings } from '../types/settings'

type Props = {
  settings: GovernanceSettings
  updateSettings: (update: Partial<GovernanceSettings>) => void
  onSave: () => void
  onReset: () => void
  hasChanges: boolean
}

export function SafetyGovernance({ settings, updateSettings, onSave, onReset, hasChanges }: Props) {
  return (
    <SettingsSection title="Safety & Governance" description="Control how HQD-Net communicates uncertainty, research status, and model limitations.">
      
      <div className="flex flex-col gap-10 max-w-2xl">
        
        {/* Research Mode */}
        <div className="flex flex-col gap-4 p-6 border border-primary/30 bg-primary/5">
           <div className="flex justify-between items-center">
             <span className="font-mono text-sm text-primary uppercase tracking-widest">RESEARCH MODE</span>
             <div className="flex items-center gap-2">
               <div className="size-2 rounded-full bg-primary" />
               <span className="font-mono text-[10px] text-primary tracking-widest uppercase">ENABLED</span>
             </div>
           </div>
           <p className="font-sans text-sm text-secondary">
             Analysis outputs are presented for research review and are not clinical diagnoses.
           </p>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-6">
           <div className="flex items-center justify-between">
             <div className="flex flex-col">
               <span className="font-mono text-xs text-secondary uppercase tracking-widest">SHOW CONFIDENCE / UNCERTAINTY</span>
               <span className="font-sans text-xs text-muted mt-1">Display statistical confidence percentages alongside results.</span>
             </div>
             <button 
               onClick={() => updateSettings({ showUncertainty: !settings.showUncertainty })}
               className={`w-12 h-6 rounded-full p-1 transition-colors relative flex-shrink-0 ${settings.showUncertainty ? 'bg-primary' : 'bg-surface-elevated border border-line'}`}
             >
               <div className={`w-4 h-4 rounded-full transition-transform ${settings.showUncertainty ? 'bg-surface translate-x-6' : 'bg-muted translate-x-0'}`} />
             </button>
           </div>
           
           <div className="flex items-center justify-between">
             <div className="flex flex-col">
               <span className="font-mono text-xs text-secondary uppercase tracking-widest">LABEL SIMULATED OUTPUT</span>
               <span className="font-sans text-xs text-muted mt-1">Clearly mark mock frontend data as simulated.</span>
             </div>
             <button 
               onClick={() => updateSettings({ labelSimulatedOutput: !settings.labelSimulatedOutput })}
               className={`w-12 h-6 rounded-full p-1 transition-colors relative flex-shrink-0 ${settings.labelSimulatedOutput ? 'bg-primary' : 'bg-surface-elevated border border-line'}`}
             >
               <div className={`w-4 h-4 rounded-full transition-transform ${settings.labelSimulatedOutput ? 'bg-surface translate-x-6' : 'bg-muted translate-x-0'}`} />
             </button>
           </div>
        </div>

        {/* Strict Warnings */}
        <div className="flex flex-col gap-6 pt-6 border-t border-line-subtle">
           
           <div className="flex flex-col gap-2">
             <span className="font-mono text-xs text-danger tracking-widest uppercase">RESEARCH USE ONLY</span>
             <p className="font-sans text-sm text-secondary border-l-2 border-danger pl-4 py-1">
               HQD-Net outputs are computational research results and must not be interpreted as a standalone clinical diagnosis.
             </p>
           </div>

           <div className="flex flex-col gap-2 mt-4">
             <span className="font-mono text-xs text-primary tracking-widest uppercase">DATA HANDLING</span>
             <p className="font-sans text-sm text-secondary border-l-2 border-primary pl-4 py-1">
               <strong className="block font-sans mb-1 text-primary">LOCAL DEMO ENVIRONMENT</strong>
               No clinical data is transmitted by this frontend.
             </p>
           </div>

        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-4 mt-4 pt-6 border-t border-line-subtle">
           <button 
             onClick={onSave}
             disabled={!hasChanges}
             className="focus-ring px-6 py-3 bg-accent text-accent-fg font-mono text-xs tracking-widest uppercase hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
             SAVE CHANGES
           </button>
           
           {hasChanges && (
             <button 
               onClick={onReset}
               className="focus-ring px-6 py-3 border border-line text-secondary font-mono text-xs tracking-widest uppercase hover:border-line-strong hover:text-primary transition-colors"
             >
               RESET SECTION
             </button>
           )}
        </div>

      </div>
    </SettingsSection>
  )
}
