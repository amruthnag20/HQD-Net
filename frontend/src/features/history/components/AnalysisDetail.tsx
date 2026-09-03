import { ArrowLeft } from 'lucide-react'
import type { AnalysisRecord } from '../types/history'
import { ExecutionAudit } from './ExecutionAudit'
import { BenchmarkComparison } from './BenchmarkComparison'
import { ExplainabilityPanel } from './ExplainabilityPanel'
import { ClinicalTranslation } from './ClinicalTranslation'

type Props = {
  record: AnalysisRecord
  onClose: () => void
}

export function AnalysisDetail({ record, onClose }: Props) {
  const isHighRisk = record.classification === 'HIGH RISK'
  const isFailed = record.status === 'FAILED'

  return (
    <div className="w-full flex flex-col relative">
      {/* Mobile Back Button */}
      <button 
        onClick={onClose}
        className="xl:hidden flex items-center gap-2 font-mono text-xs text-secondary hover:text-primary transition-colors tracking-widest uppercase mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        BACK TO ARCHIVE
      </button>

      {/* Header */}
      <div className="flex flex-col gap-2 mb-10 pb-6 border-b border-line">
        <h2 className="font-mono text-[10px] text-muted tracking-widest uppercase">ANALYSIS {record.id}</h2>
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <span className="font-sans text-sm text-secondary">
            {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="hidden md:inline font-mono text-xs text-muted">—</span>
          <span className="font-mono text-xs text-secondary tracking-widest uppercase">
            {record.engine} · {record.execution.qubits} QUBITS · {record.execution.backend}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <div className={`size-2 rounded-full ${isFailed ? 'bg-danger' : 'bg-success'}`} />
          <span className={`font-mono text-[10px] tracking-widest uppercase ${isFailed ? 'text-danger' : 'text-success'}`}>
            {record.status}
          </span>
        </div>
      </div>

      {/* Desktop Split View / Mobile Stacked */}
      <div className="flex flex-col md:flex-row gap-12 xl:gap-16 pb-24">
        
        {/* Left Col: Metadata / Execution */}
        <div className="w-full md:w-[40%] flex flex-col gap-12">
          <ExecutionAudit record={record} />
        </div>

        {/* Right Col: Result / Evidence */}
        <div className="w-full md:w-[60%] flex flex-col gap-12">
          
          {/* Main Result */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase mb-2">Simulated Result</span>
            {isFailed ? (
              <span className="font-display text-4xl text-danger uppercase tracking-widest">ANALYSIS INTERRUPTED</span>
            ) : (
              <>
                <span className={`font-display text-5xl uppercase tracking-widest ${isHighRisk ? 'text-danger' : 'text-success'}`}>
                  {record.classification}
                </span>
                <span className="font-mono text-sm text-primary tracking-widest">
                  {record.confidence.toFixed(1)}% CONFIDENCE
                </span>
              </>
            )}
          </div>
          
          <BenchmarkComparison record={record} />
          
          <ExplainabilityPanel record={record} />
          
          <ClinicalTranslation record={record} />
          
        </div>
      </div>
    </div>
  )
}
