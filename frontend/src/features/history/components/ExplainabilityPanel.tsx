import type { AnalysisRecord } from '../types/history'

type Props = {
  record: AnalysisRecord
}

export function ExplainabilityPanel({ record }: Props) {
  if (record.status === 'FAILED') return null

  return (
    <div className="w-full space-y-8">
      <div>
        <h3 className="font-mono text-xs text-muted tracking-widest uppercase border-b border-line-subtle pb-2 mb-4">Explainability</h3>
        
        <div className="space-y-6">
          {/* Classical Attribution */}
          <div>
            <h4 className="font-mono text-[10px] text-secondary tracking-widest uppercase mb-4">Classical Attribution</h4>
            <div className="space-y-3">
              {record.evidence.map((item, i) => (
                <div key={i} className="flex justify-between items-end border-b border-line-subtle pb-2">
                  <span className="text-xs text-secondary font-sans">{item.feature}</span>
                  <span className="font-mono text-[10px] text-primary">+{item.contribution.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quantum Attribution */}
          {record.qubitAttribution.length > 0 && (
            <div className="pt-2">
              <h4 className="font-mono text-[10px] text-secondary tracking-widest uppercase mb-4">Quantum Attribution</h4>
              <div className="space-y-3">
                {record.qubitAttribution.map((item, i) => (
                  <div key={i} className="flex justify-between items-end border-b border-line-subtle pb-2">
                    <span className="text-xs text-secondary font-sans">QUBIT {item.feature}</span>
                    <span className="font-mono text-[10px] text-primary">+{item.contribution.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <p className="text-[10px] text-muted font-mono uppercase tracking-widest text-right">
        SIMULATED ATTRIBUTION
      </p>
    </div>
  )
}
