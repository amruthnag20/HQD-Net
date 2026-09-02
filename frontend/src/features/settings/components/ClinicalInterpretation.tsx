import { SettingsSection } from './SettingsSection'
import type { ClinicalSettings } from '../types/settings'

type Props = {
  settings: ClinicalSettings
  updateSettings: (update: Partial<ClinicalSettings>) => void
  onSave: () => void
  onReset: () => void
  hasChanges: boolean
}

export function ClinicalInterpretation({ settings, updateSettings, onSave, onReset, hasChanges }: Props) {
  return (
    <SettingsSection title="Clinical Interpretation" description="Control how model output is translated and presented for research review.">
      
      <div className="flex flex-col gap-10 max-w-2xl">
        
        {/* Detail Level */}
        <div className="flex flex-col gap-4">
          <label className="font-mono text-xs text-primary uppercase tracking-widest">INTERPRETATION DETAIL</label>
          <div className="relative group w-full md:max-w-xs">
            <select
              value={settings.interpretationDetail}
              onChange={(e) => updateSettings({ interpretationDetail: e.target.value as any })}
              className="w-full appearance-none bg-surface border border-line pl-4 pr-10 py-3 font-mono text-xs tracking-widest text-primary focus:outline-none focus:border-primary cursor-pointer transition-colors"
            >
              <option value="CONCISE">CONCISE</option>
              <option value="STANDARD">STANDARD</option>
              <option value="DETAILED">DETAILED</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-muted" />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-6 pt-6 border-t border-line-subtle">
           <div className="flex items-center justify-between">
             <div className="flex flex-col">
               <span className="font-mono text-xs text-secondary uppercase tracking-widest">SHOW KEY EVIDENCE</span>
               <span className="font-sans text-xs text-muted mt-1">Display feature-level classical evidence in results.</span>
             </div>
             <button 
               onClick={() => updateSettings({ showKeyEvidence: !settings.showKeyEvidence })}
               className={`w-12 h-6 rounded-full p-1 transition-colors relative flex-shrink-0 ${settings.showKeyEvidence ? 'bg-primary' : 'bg-surface-elevated border border-line'}`}
             >
               <div className={`w-4 h-4 rounded-full transition-transform ${settings.showKeyEvidence ? 'bg-surface translate-x-6' : 'bg-muted translate-x-0'}`} />
             </button>
           </div>
           
           <div className="flex items-center justify-between">
             <div className="flex flex-col">
               <span className="font-mono text-xs text-secondary uppercase tracking-widest">SHOW ATTRIBUTION</span>
               <span className="font-sans text-xs text-muted mt-1">Display granular classical and quantum attribution scores.</span>
             </div>
             <button 
               onClick={() => updateSettings({ showAttribution: !settings.showAttribution })}
               className={`w-12 h-6 rounded-full p-1 transition-colors relative flex-shrink-0 ${settings.showAttribution ? 'bg-primary' : 'bg-surface-elevated border border-line'}`}
             >
               <div className={`w-4 h-4 rounded-full transition-transform ${settings.showAttribution ? 'bg-surface translate-x-6' : 'bg-muted translate-x-0'}`} />
             </button>
           </div>
        </div>

        {/* Language Selection */}
        <div className="flex flex-col gap-4 pt-6 border-t border-line-subtle">
          <label className="font-mono text-xs text-primary uppercase tracking-widest">CLINICAL LANGUAGE</label>
          <div className="relative group w-full md:max-w-xs">
            <select
              value={settings.clinicalLanguage}
              onChange={(e) => updateSettings({ clinicalLanguage: e.target.value as any })}
              className="w-full appearance-none bg-surface border border-line pl-4 pr-10 py-3 font-mono text-xs tracking-widest text-primary focus:outline-none focus:border-primary cursor-pointer transition-colors"
            >
              <option value="TECHNICAL">TECHNICAL</option>
              <option value="RESEARCH">RESEARCH</option>
              <option value="CLINICAL">CLINICAL</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-muted" />
          </div>
        </div>

        {/* Safety Disclaimer Toggle */}
        <div className="flex items-center justify-between p-6 border border-line-subtle bg-surface-subtle mt-4">
           <div className="flex flex-col">
             <span className="font-mono text-xs text-danger uppercase tracking-widest">DISPLAY RESEARCH DISCLAIMER</span>
             <span className="font-sans text-xs text-secondary mt-1">Append research-only safety warning to all outputs.</span>
           </div>
           
           {/* Enforced toggle (mock functionality requires it to remain ON logically) */}
           <button 
             disabled
             className="w-12 h-6 rounded-full p-1 transition-colors relative flex-shrink-0 bg-danger opacity-80 cursor-not-allowed"
             title="Mandatory for this research configuration"
           >
             <div className="w-4 h-4 rounded-full bg-surface translate-x-6" />
           </button>
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
