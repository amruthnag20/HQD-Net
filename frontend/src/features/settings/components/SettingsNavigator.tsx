import { cn } from '@/lib/utils/cn'
import { SETTINGS_SECTIONS, type SectionId } from '../types/settings'

export type { SectionId }

type Props = {
  activeSection: SectionId
  onSelect: (id: SectionId) => void
}

export function SettingsNavigator({ activeSection, onSelect }: Props) {
  return (
    <div className="w-full lg:w-64 lg:flex-shrink-0">
      {/* Mobile Selector */}
      <div className="lg:hidden w-full mb-6">
        <select
          value={activeSection}
          onChange={(e) => onSelect(e.target.value as SectionId)}
          className="w-full bg-surface border border-line p-3 font-mono text-xs tracking-widest text-primary uppercase focus:outline-none focus:border-primary cursor-pointer"
        >
          {SETTINGS_SECTIONS.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col w-full border-r border-line-subtle pr-4 h-full min-h-[400px]">
        {SETTINGS_SECTIONS.map((section) => {
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => onSelect(section.id)}
              className={cn(
                "w-full flex items-center justify-between text-left py-3 px-3 font-mono text-xs tracking-widest uppercase transition-all duration-200 border-l-2",
                isActive 
                  ? "border-primary text-primary bg-surface-subtle" 
                  : "border-transparent text-muted hover:text-secondary hover:bg-surface-subtle/50"
              )}
            >
              <span>{section.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
