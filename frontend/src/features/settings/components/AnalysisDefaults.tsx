import { SettingsSection } from './SettingsSection'
import type { AnalysisSettings } from '../types/settings'

type Props = {
  settings: AnalysisSettings
  updateSettings: (update: Partial<AnalysisSettings>) => void
  onSave: () => void
  onReset: () => void
  hasChanges: boolean
}

export function AnalysisDefaults({ settings, updateSettings, onSave, onReset, hasChanges }: Props) {
  return (
    <SettingsSection title="Analysis Defaults" description="Configure the default parameters used when initiating a new analysis in Home.">
      
      <div className="flex flex-col gap-10 max-w-2xl">
        
        {/* Engine Selection */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <span className="font-mono text-xs text-primary uppercase tracking-widest">DEFAULT QUANTUM ENGINE</span>
            <span className="font-sans text-sm text-secondary">The primary model used for classification.</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {(['VQC', 'QSVM'] as const).map(engine => (
              <button
                key={engine}
                onClick={() => updateSettings({ defaultEngine: engine })}
                className={`p-4 border text-left transition-colors ${
                  settings.defaultEngine === engine 
                    ? 'border-primary bg-surface-subtle' 
                    : 'border-line hover:border-line-strong'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-mono text-xs tracking-widest uppercase ${settings.defaultEngine === engine ? 'text-primary' : 'text-secondary'}`}>
                    {engine}
                  </span>
                  <div className={`size-2 rounded-full ${settings.defaultEngine === engine ? 'bg-primary shadow-[0_0_8px_var(--color-primary)]' : 'bg-transparent border border-muted'}`} />
                </div>
                <span className="font-sans text-[10px] text-muted">
                  {engine === 'VQC' ? 'Variational Quantum Circuit' : 'Quantum Support Vector Machine'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Read-only configurations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-line-subtle">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-secondary tracking-widest uppercase">DEFAULT BACKEND</span>
            <input 
              type="text" 
              value={settings.defaultBackend}
              disabled
              className="w-full bg-transparent border-b border-line-subtle py-2 font-mono text-xs text-muted opacity-50 cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-secondary tracking-widest uppercase">DEFAULT ENCODING</span>
            <input 
              type="text" 
              value={settings.defaultEncoding}
              disabled
              className="w-full bg-transparent border-b border-line-subtle py-2 font-mono text-xs text-muted opacity-50 cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-secondary tracking-widest uppercase">DEFAULT QUBITS</span>
            <input 
              type="text" 
              value={`${settings.defaultQubits} QUBITS`}
              disabled
              className="w-full bg-transparent border-b border-line-subtle py-2 font-mono text-xs text-muted opacity-50 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Confirmation Toggle */}
        <div className="flex items-center justify-between pt-8 border-t border-line-subtle">
           <div className="flex flex-col">
             <span className="font-mono text-xs text-primary uppercase tracking-widest">CONFIRM BEFORE EXECUTION</span>
             <span className="font-sans text-sm text-secondary">Require explicit confirmation before running the quantum pipeline.</span>
           </div>
           
           <button 
             onClick={() => updateSettings({ confirmBeforeExecution: !settings.confirmBeforeExecution })}
             className={`w-12 h-6 rounded-full p-1 transition-colors relative ${settings.confirmBeforeExecution ? 'bg-primary' : 'bg-surface-elevated border border-line'}`}
           >
             <div className={`w-4 h-4 rounded-full transition-transform ${settings.confirmBeforeExecution ? 'bg-surface translate-x-6' : 'bg-muted translate-x-0'}`} />
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
