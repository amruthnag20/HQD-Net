import { motion } from 'framer-motion'
import type { AnalysisRecord } from '../types/history'
import { AnalysisListItem } from './AnalysisListItem'

type Props = {
  analyses: AnalysisRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function AnalysisList({ analyses, selectedId, onSelect }: Props) {
  if (analyses.length === 0) {
    return null // Handled by HistoryEmptyState
  }

  return (
    <div className="w-full flex flex-col border-t border-line-subtle">
      {/* Header Row (Desktop only) */}
      <div className="hidden md:flex items-center py-2 px-6 border-b border-line gap-6 font-mono text-[10px] text-muted tracking-widest uppercase">
        <div className="w-32 flex-shrink-0">Analysis</div>
        <div className="w-24 flex-shrink-0">Engine</div>
        <div className="flex-1">Result</div>
      </div>
      
      {/* List items */}
      <div className="flex flex-col">
        {analyses.map((record, i) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <AnalysisListItem
              record={record}
              isSelected={selectedId === record.id}
              onClick={() => onSelect(record.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
