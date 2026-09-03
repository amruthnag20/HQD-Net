import { useState, useMemo, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { SettingsNavigator } from './SettingsNavigator'
import { defaultSettings } from '../data/defaultSettings'
import type { Settings, SectionId } from '../types/settings'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

import { ProfileWorkspace } from './ProfileWorkspace'
import { AnalysisDefaults } from './AnalysisDefaults'
import { QuantumBackend } from './QuantumBackend'
import { ModelPipeline } from './ModelPipeline'
import { ClinicalInterpretation } from './ClinicalInterpretation'
import { SafetyGovernance } from './SafetyGovernance'
import { AdvancedResearch } from './AdvancedResearch'
import { SystemInformation } from './SystemInformation'

const validSections: SectionId[] = ['profile', 'analysis', 'quantum', 'model', 'clinical', 'governance', 'research', 'system']

export function SettingsWorkspace() {
  const [savedSettings, setSavedSettings] = useState<Settings>(defaultSettings)
  const [draftSettings, setDraftSettings] = useState<Settings>(defaultSettings)
  
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    const hash = window.location.hash.replace('#', '') as SectionId
    return validSections.includes(hash) ? hash : 'profile'
  })

  const [resetConfirmSection, setResetConfirmSection] = useState<keyof Settings | null>(null)
  const [showToast, setShowToast] = useState(false)

  // Listen to hashchange events (e.g. from Profile popover)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as SectionId
      if (validSections.includes(hash)) {
        setActiveSection(hash)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleSectionChange = (id: SectionId) => {
    setActiveSection(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  // Check for unsaved changes in current section
  const hasChanges = (section: keyof Settings) => {
    return JSON.stringify(savedSettings[section]) !== JSON.stringify(draftSettings[section])
  }

  const handleSave = (section: keyof Settings) => {
    setSavedSettings(prev => ({ ...prev, [section]: draftSettings[section] }))
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handlePromptReset = (section: keyof Settings) => {
    setResetConfirmSection(section)
  }

  const confirmReset = () => {
    if (resetConfirmSection) {
      setDraftSettings(prev => ({ ...prev, [resetConfirmSection]: savedSettings[resetConfirmSection] }))
      setResetConfirmSection(null)
    }
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <ProfileWorkspace 
            settings={draftSettings.profile} 
            updateSettings={u => setDraftSettings(p => ({ ...p, profile: { ...p.profile, ...u } }))} 
            onSave={() => handleSave('profile')}
            onReset={() => handlePromptReset('profile')}
            hasChanges={hasChanges('profile')}
          />
        )
      case 'analysis':
        return (
          <AnalysisDefaults 
            settings={draftSettings.analysis} 
            updateSettings={u => setDraftSettings(p => ({ ...p, analysis: { ...p.analysis, ...u } }))} 
            onSave={() => handleSave('analysis')}
            onReset={() => handlePromptReset('analysis')}
            hasChanges={hasChanges('analysis')}
          />
        )
      case 'quantum':
        return <QuantumBackend />
      case 'model':
        return <ModelPipeline />
      case 'clinical':
        return (
          <ClinicalInterpretation 
            settings={draftSettings.clinical} 
            updateSettings={u => setDraftSettings(p => ({ ...p, clinical: { ...p.clinical, ...u } }))} 
            onSave={() => handleSave('clinical')}
            onReset={() => handlePromptReset('clinical')}
            hasChanges={hasChanges('clinical')}
          />
        )
      case 'governance':
        return (
          <SafetyGovernance 
            settings={draftSettings.governance} 
            updateSettings={u => setDraftSettings(p => ({ ...p, governance: { ...p.governance, ...u } }))} 
            onSave={() => handleSave('governance')}
            onReset={() => handlePromptReset('governance')}
            hasChanges={hasChanges('governance')}
          />
        )
      case 'research':
        return (
          <AdvancedResearch 
            settings={draftSettings.research} 
            updateSettings={u => setDraftSettings(p => ({ ...p, research: { ...p.research, ...u } }))} 
            onSave={() => handleSave('research')}
            onReset={() => handlePromptReset('research')}
            hasChanges={hasChanges('research')}
          />
        )
      case 'system':
        return <SystemInformation />
      default:
        return null
    }
  }

  // Global unsaved changes check
  const globalHasChanges = useMemo(() => {
    return JSON.stringify(savedSettings) !== JSON.stringify(draftSettings)
  }, [savedSettings, draftSettings])

  return (
    <div className="w-full flex flex-col relative">
      
      {/* Save Notification Toast */}
      <AnimatePresence>
        {showToast && (
          <div className="fixed bottom-8 right-8 z-toast bg-success text-success-fg px-6 py-3 font-mono text-xs tracking-widest flex items-center gap-3 rounded shadow-popover">
            <div className="size-2 rounded-full bg-surface shadow-[0_0_8px_var(--color-surface)]" />
            CHANGES SAVED
          </div>
        )}
      </AnimatePresence>
      
      {globalHasChanges && (
        <div className="fixed top-20 right-8 z-30 bg-surface-elevated border border-accent text-accent px-4 py-2 font-mono text-[10px] tracking-widest hidden md:block rounded shadow-sm">
          UNSAVED CHANGES
        </div>
      )}

      {/* Confirmation Dialog for Reset */}
      <ConfirmDialog
        isOpen={Boolean(resetConfirmSection)}
        onClose={() => setResetConfirmSection(null)}
        onConfirm={confirmReset}
        title="Reset Section?"
        description="This will restore the last saved values for this settings section."
        confirmLabel="Reset"
        cancelLabel="Cancel"
      />

      {/* Header */}
      <div className="flex flex-col gap-2 mb-8 md:mb-10">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-muted tracking-widest uppercase">
            SYSTEM CONFIGURATION / 01
          </span>
          <span className="text-muted text-xs">·</span>
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
            <span className="font-mono text-[10px] text-success tracking-widest uppercase">
              CONFIGURATION READY
            </span>
          </div>
        </div>
        <h1 className="font-display text-4xl text-primary tracking-wide">SETTINGS</h1>
        <p className="font-sans text-sm text-secondary max-w-xl">
          Configure your HQD-Net research environment.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 w-full flex-1">
        {/* Navigation Rail */}
        <SettingsNavigator activeSection={activeSection} onSelect={handleSectionChange} />
        
        {/* Content Area */}
        <div className="flex-1 min-w-0 max-w-3xl relative">
          <AnimatePresence mode="wait">
            <div key={activeSection} className="w-full">
              {renderSection()}
            </div>
          </AnimatePresence>
        </div>
      </div>
      
    </div>
  )
}
