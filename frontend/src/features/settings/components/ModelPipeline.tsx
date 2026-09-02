import { SettingsSection } from './SettingsSection'
import { ArrowDown } from 'lucide-react'

export function ModelPipeline() {
  return (
    <SettingsSection title="Model & Pipeline" description="Review the active diagnostic workflow configuration and feature representations.">
      
      <div className="flex flex-col gap-12 max-w-2xl">
        
        {/* Pipeline Visual */}
        <div className="flex flex-col items-center p-8 bg-surface-subtle border border-line-subtle relative">
           
           <div className="absolute top-4 left-4 font-mono text-[10px] text-muted tracking-widest uppercase">
             PIPELINE STAGES
           </div>
           
           <div className="flex flex-col items-center gap-2 mt-4">
              <span className="font-mono text-xs text-primary uppercase tracking-widest px-4 py-2 border border-line bg-surface">INPUT</span>
              <ArrowDown className="w-4 h-4 text-muted" />
              <span className="font-mono text-xs text-primary uppercase tracking-widest px-4 py-2 border border-line bg-surface">PREPROCESS</span>
              <ArrowDown className="w-4 h-4 text-muted" />
              <span className="font-mono text-xs text-secondary uppercase tracking-widest px-4 py-2 border border-line border-dashed">FEATURE COMPRESSION</span>
              <ArrowDown className="w-4 h-4 text-accent" />
              <span className="font-mono text-xs text-accent uppercase tracking-widest px-4 py-2 border border-accent bg-accent/5">QUANTUM ENCODING</span>
              <ArrowDown className="w-4 h-4 text-accent" />
              <span className="font-mono text-xs text-accent uppercase tracking-widest px-4 py-2 border border-accent bg-accent/5">VQC / QSVM</span>
              <ArrowDown className="w-4 h-4 text-muted" />
              <span className="font-mono text-xs text-primary uppercase tracking-widest px-4 py-2 border border-line bg-surface">POST-PROCESS</span>
              <ArrowDown className="w-4 h-4 text-muted" />
              <span className="font-mono text-xs text-primary uppercase tracking-widest px-4 py-2 border border-line bg-surface">EXPLAINABILITY</span>
           </div>

        </div>

        {/* Read-only settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
          <div className="flex flex-col gap-1 border-b border-line-subtle pb-2">
            <span className="font-sans text-[10px] text-secondary uppercase">FEATURE EXTRACTION</span>
            <span className="font-mono text-xs text-primary uppercase tracking-widest">AUTOMATIC</span>
          </div>
          <div className="flex flex-col gap-1 border-b border-line-subtle pb-2">
            <span className="font-sans text-[10px] text-secondary uppercase">FEATURE COMPRESSION</span>
            <span className="font-mono text-xs text-primary uppercase tracking-widest">AUTOMATIC</span>
          </div>
          <div className="flex flex-col gap-1 border-b border-line-subtle pb-2">
            <span className="font-sans text-[10px] text-secondary uppercase">QUANTUM ENCODING</span>
            <span className="font-mono text-xs text-accent uppercase tracking-widest">ANGLE EMBEDDING</span>
          </div>
          <div className="flex flex-col gap-1 border-b border-line-subtle pb-2">
            <span className="font-sans text-[10px] text-secondary uppercase">QUANTUM MODEL</span>
            <span className="font-mono text-xs text-accent uppercase tracking-widest">VQC / QSVM</span>
          </div>
          <div className="flex flex-col gap-1 border-b border-line-subtle pb-2">
            <span className="font-sans text-[10px] text-secondary uppercase">EXPLAINABILITY</span>
            <span className="font-mono text-xs text-primary uppercase tracking-widest">ENABLED</span>
          </div>
          <div className="flex flex-col gap-1 border-b border-line-subtle pb-2">
            <span className="font-sans text-[10px] text-secondary uppercase">MODEL VERSION</span>
            <span className="font-mono text-xs text-muted uppercase tracking-widest">HQD-NET DEMO / 0.1</span>
          </div>
        </div>

      </div>
    </SettingsSection>
  )
}
