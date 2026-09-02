import { SettingsSection } from './SettingsSection'
import type { ProfileSettings } from '../types/settings'

type Props = {
  settings: ProfileSettings
  updateSettings: (update: Partial<ProfileSettings>) => void
  onSave: () => void
  onReset: () => void
  hasChanges: boolean
}

export function ProfileWorkspace({ settings, updateSettings, onSave, onReset, hasChanges }: Props) {
  return (
    <SettingsSection title="Profile & Workspace" description="Manage identity and research workspace information.">
      
      <div className="flex flex-col gap-8 max-w-2xl">
        <div className="flex items-center gap-6 pb-6 border-b border-line-subtle">
           <div className="w-16 h-16 rounded-full bg-surface-elevated border border-line flex items-center justify-center text-primary font-display text-xl uppercase tracking-widest">
              {settings.name.charAt(0) || 'U'}
           </div>
           <div className="flex flex-col">
             <span className="font-mono text-[10px] text-muted tracking-widest uppercase">ACCOUNT AVATAR</span>
             <span className="font-sans text-sm text-secondary">Determined by profile initials</span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs text-secondary tracking-widest uppercase">Full Name</label>
            <input 
              type="text" 
              value={settings.name}
              onChange={e => updateSettings({ name: e.target.value })}
              className="w-full bg-transparent border-b border-line py-2 font-sans text-sm text-primary focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs text-secondary tracking-widest uppercase">Email (Read Only)</label>
            <input 
              type="email" 
              value={settings.email}
              disabled
              className="w-full bg-transparent border-b border-line-subtle py-2 font-sans text-sm text-muted opacity-50 cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs text-secondary tracking-widest uppercase">Role</label>
            <input 
              type="text" 
              value={settings.role}
              onChange={e => updateSettings({ role: e.target.value })}
              className="w-full bg-transparent border-b border-line py-2 font-sans text-sm text-primary focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs text-secondary tracking-widest uppercase">Organization</label>
            <input 
              type="text" 
              value={settings.organization}
              onChange={e => updateSettings({ organization: e.target.value })}
              className="w-full bg-transparent border-b border-line py-2 font-sans text-sm text-primary focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="mt-8 p-6 border border-line-subtle bg-surface-subtle flex flex-col gap-4">
           <span className="font-mono text-[10px] text-muted tracking-widest uppercase">WORKSPACE CONTEXT</span>
           
           <div className="grid grid-cols-3 gap-4">
             <div className="flex flex-col gap-1">
               <span className="font-sans text-[10px] text-secondary">WORKSPACE</span>
               <span className="font-mono text-xs text-primary">{settings.organization}</span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="font-sans text-[10px] text-secondary">ENVIRONMENT</span>
               <span className="font-mono text-xs text-primary">RESEARCH</span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="font-sans text-[10px] text-secondary">SESSION</span>
               <span className="font-mono text-xs text-primary">LOCAL</span>
             </div>
           </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-line-subtle">
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
