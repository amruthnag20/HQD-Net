import { SettingsSection } from './SettingsSection'
import type { ResearchSettings } from '../types/settings'

type Props = {
  settings: ResearchSettings
  updateSettings: (update: Partial<ResearchSettings>) => void
  onSave: () => void
  onReset: () => void
  hasChanges: boolean
}

export function AdvancedResearch({ settings, updateSettings, onSave, onReset, hasChanges }: Props) {
  return (
    <SettingsSection title="Advanced / Research" description="Technical controls for the research environment and execution telemetry.">
      
      <div className="flex flex-col gap-8 max-w-2xl">
        
        {/* Toggles */}
        <div className="flex flex-col gap-6">
           <div className="flex items-center justify-between">
             <div className="flex flex-col">
               <span className="font-mono text-xs text-secondary uppercase tracking-widest">SHOW ADVANCED ANALYSIS INFORMATION</span>
               <span className="font-sans text-xs text-muted mt-1">Expose underlying technical metadata in History and Home.</span>
             </div>
             <button 
               onClick={() => updateSettings({ showAdvancedInfo: !settings.showAdvancedInfo })}
               className={`w-12 h-6 rounded-full p-1 transition-colors relative flex-shrink-0 ${settings.showAdvancedInfo ? 'bg-primary' : 'bg-surface-elevated border border-line'}`}
             >
               <div className={`w-4 h-4 rounded-full transition-transform ${settings.showAdvancedInfo ? 'bg-surface translate-x-6' : 'bg-muted translate-x-0'}`} />
             </button>
           </div>
           
           <div className="flex items-center justify-between">
             <div className="flex flex-col">
               <span className="font-mono text-xs text-secondary uppercase tracking-widest">SHOW EXECUTION TELEMETRY</span>
               <span className="font-sans text-xs text-muted mt-1">Display precise execution timestamps and backend trace logs.</span>
             </div>
             <button 
               onClick={() => updateSettings({ showExecutionTelemetry: !settings.showExecutionTelemetry })}
               className={`w-12 h-6 rounded-full p-1 transition-colors relative flex-shrink-0 ${settings.showExecutionTelemetry ? 'bg-primary' : 'bg-surface-elevated border border-line'}`}
             >
               <div className={`w-4 h-4 rounded-full transition-transform ${settings.showExecutionTelemetry ? 'bg-surface translate-x-6' : 'bg-muted translate-x-0'}`} />
             </button>
           </div>
        </div>

        {/* Visual Detail Level */}
        <div className="flex flex-col gap-4 pt-6 border-t border-line-subtle">
          <label className="font-mono text-xs text-primary uppercase tracking-widest">QUANTUM VISUAL DETAIL</label>
          <div className="relative group w-full md:max-w-xs">
            <select
              value={settings.quantumVisualDetail}
              onChange={(e) => updateSettings({ quantumVisualDetail: e.target.value as any })}
              className="w-full appearance-none bg-surface border border-line pl-4 pr-10 py-3 font-mono text-xs tracking-widest text-primary focus:outline-none focus:border-primary cursor-pointer transition-colors"
            >
              <option value="MINIMAL">MINIMAL</option>
              <option value="STANDARD">STANDARD</option>
              <option value="DETAILED">DETAILED</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-muted" />
          </div>
        </div>

        {/* Experimental Warning */}
        <div className="mt-8 p-4 border border-accent/30 bg-accent/5">
           <span className="font-mono text-[10px] text-accent tracking-widest uppercase">EXPERIMENTAL</span>
           <p className="mt-2 font-mono text-xs text-secondary leading-relaxed">
             Research-only interface features may change between versions without maintaining backwards compatibility.
           </p>
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
