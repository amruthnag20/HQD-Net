import { ArrowRight } from 'lucide-react'
import type { AnalysisRecord } from '../types/history'

type Props = {
  record: AnalysisRecord
  isSelected: boolean
  onClick: () => void
}

export function AnalysisListItem({ record, isSelected, onClick }: Props) {
  const isHighRisk = record.classification === 'HIGH RISK'
  const isFailed = record.status === 'FAILED'
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left group flex items-center justify-between border-b transition-all duration-150 relative focus-ring ${
        isSelected 
          ? 'border-accent/40 bg-accent/10 shadow-sm' 
          : 'border-line-subtle hover:border-line hover:bg-surface-subtle'
      }`}
    >
      {/* Selection vertical accent bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
      )}
      
      <div className="w-full flex flex-col md:flex-row md:items-center py-4 px-4 md:px-6 gap-2 md:gap-6">
        
        {/* ID & Date */}
        <div className="flex justify-between md:flex-col md:w-32 flex-shrink-0">
          <span className={`font-mono font-medium tracking-wider text-sm ${isSelected ? 'text-primary font-semibold' : 'text-secondary'}`}>
            {record.id}
          </span>
          <span className="font-sans text-xs text-muted">
            {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Engine */}
        <div className="hidden md:flex w-24 flex-shrink-0 font-mono text-xs text-secondary uppercase tracking-widest">
          {record.engine}
        </div>

        {/* Status/Classification */}
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          {isFailed ? (
            <span className="font-mono text-xs text-danger uppercase tracking-widest bg-danger/10 px-2 py-0.5 rounded-sm inline-block w-fit">
              FAILED
            </span>
          ) : (
            <>
              <span className={`font-mono text-xs uppercase tracking-widest font-medium ${isHighRisk ? 'text-danger' : 'text-success'}`}>
                {record.classification}
              </span>
              <span className="font-mono text-xs text-muted">
                {record.confidence.toFixed(1)}% CONF
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Arrow Indicator */}
      <div className="pr-4 md:pr-6 flex-shrink-0">
        <ArrowRight className={`w-4 h-4 transition-transform duration-150 ${isSelected ? 'text-accent translate-x-1' : 'text-muted group-hover:text-primary group-hover:translate-x-0.5'}`} />
      </div>
    </button>
  )
}
