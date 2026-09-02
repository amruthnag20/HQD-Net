import type { AnalysisRecord } from '../types/history'

type Props = {
  record: AnalysisRecord
}

export function BenchmarkComparison({ record }: Props) {
  if (record.status === 'FAILED') return null

  const hqdConf = record.benchmark.hqdNetConfidence
  const baseConf = record.benchmark.classicalBaseline
  
  // Calculate relative widths based on max possible (100)
  const hqdWidth = `${hqdConf}%`
  const baseWidth = `${baseConf}%`

  return (
    <div className="w-full space-y-6">
      <h3 className="font-mono text-xs text-muted tracking-widest uppercase border-b border-line-subtle pb-2">Benchmark</h3>
      
      <div className="space-y-4">
        {/* HQD-Net */}
        <div className="flex flex-col gap-2">
           <div className="flex justify-between items-center">
             <span className="font-sans text-xs text-secondary">HQD-NET / {record.engine}</span>
             <span className="font-mono text-xs text-primary">{hqdConf.toFixed(1)}%</span>
           </div>
           <div className="w-full h-1 bg-surface-subtle overflow-hidden">
             <div className="h-full bg-primary" style={{ width: hqdWidth }} />
           </div>
        </div>

        {/* Classical Baseline */}
        <div className="flex flex-col gap-2">
           <div className="flex justify-between items-center opacity-70">
             <span className="font-sans text-xs text-muted">CLASSICAL BASELINE</span>
             <span className="font-mono text-xs text-muted">{baseConf.toFixed(1)}%</span>
           </div>
           <div className="w-full h-1 bg-surface-subtle overflow-hidden opacity-70">
             <div className="h-full bg-muted" style={{ width: baseWidth }} />
           </div>
        </div>
      </div>
      
      <p className="text-[10px] text-muted font-mono uppercase tracking-widest text-right mt-2">
        SIMULATED / DEMO
      </p>
    </div>
  )
}
