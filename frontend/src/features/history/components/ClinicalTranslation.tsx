import type { AnalysisRecord } from '../types/history'

type Props = {
  record: AnalysisRecord
}

export function ClinicalTranslation({ record }: Props) {
  return (
    <div className="w-full space-y-6">
      <h3 className="font-mono text-xs text-muted tracking-widest uppercase border-b border-line-subtle pb-2 mb-4">Clinical Translation</h3>
      
      <div className="flex flex-col items-center text-center gap-6 border border-line-subtle p-6 bg-surface-subtle">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] text-muted tracking-widest uppercase">MODEL OUTPUT</span>
          <span className={`font-display text-2xl tracking-widest uppercase ${record.status === 'FAILED' ? 'text-danger' : record.classification === 'HIGH RISK' ? 'text-danger' : 'text-success'}`}>
            {record.translation.output}
          </span>
        </div>
        
        <div className="w-px h-6 bg-line-subtle" />
        
        <div className="flex flex-col gap-2 max-w-sm mx-auto">
          <span className="font-mono text-[10px] text-muted tracking-widest uppercase">INTERPRETATION</span>
          <p className="font-sans text-sm text-secondary leading-relaxed">
            {record.translation.interpretation}
          </p>
        </div>
      </div>
      
      <div className="w-full text-center">
        <p className="text-[10px] text-danger font-mono uppercase tracking-widest mt-4">
          FOR RESEARCH REVIEW · NOT A CLINICAL DIAGNOSIS
        </p>
      </div>
    </div>
  )
}
