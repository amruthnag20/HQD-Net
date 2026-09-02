import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type FilterState = {
  search: string
  engine: string
  classification: string
  status: string
  sort: string
}

type Props = {
  filters: FilterState
  setFilters: (filters: FilterState) => void
}

export function HistoryFilters({ filters, setFilters }: Props) {
  const [showFilters, setShowFilters] = useState(false)

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters({ ...filters, [key]: value })
  }

  return (
    <div className="w-full flex flex-col gap-4 py-4 border-y border-line-subtle mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input 
            type="text"
            placeholder="Search by analysis ID, engine, or date..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full bg-surface-subtle border border-line pl-10 pr-4 py-2 font-sans text-sm text-primary placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 border font-mono text-xs tracking-widest uppercase transition-colors ${
              showFilters || filters.engine !== 'All' || filters.classification !== 'All' || filters.status !== 'All' 
                ? 'border-primary text-primary' 
                : 'border-line text-secondary hover:border-line-strong hover:text-primary'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            FILTER
          </button>
          
          <div className="relative flex-1 md:flex-none group">
            <select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="w-full appearance-none bg-transparent border border-line pl-4 pr-10 py-2 font-mono text-xs tracking-widest uppercase text-secondary hover:border-line-strong hover:text-primary transition-colors focus:outline-none cursor-pointer"
            >
              <option value="newest">NEWEST</option>
              <option value="oldest">OLDEST</option>
              <option value="highest-risk">HIGHEST RISK</option>
              <option value="lowest-risk">LOWEST RISK</option>
              <option value="highest-confidence">HIGHEST CONFIDENCE</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-line-subtle mt-2">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] text-muted tracking-widest uppercase">Engine</label>
                <select 
                  value={filters.engine}
                  onChange={(e) => updateFilter('engine', e.target.value)}
                  className="bg-surface border border-line p-2 font-sans text-sm text-secondary focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="All">All</option>
                  <option value="VQC">VQC</option>
                  <option value="QSVM">QSVM</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] text-muted tracking-widest uppercase">Classification</label>
                <select 
                  value={filters.classification}
                  onChange={(e) => updateFilter('classification', e.target.value)}
                  className="bg-surface border border-line p-2 font-sans text-sm text-secondary focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="All">All</option>
                  <option value="HIGH RISK">High Risk</option>
                  <option value="MEDIUM RISK">Medium Risk</option>
                  <option value="LOW RISK">Low Risk</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] text-muted tracking-widest uppercase">Status</label>
                <select 
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="bg-surface border border-line p-2 font-sans text-sm text-secondary focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="All">All</option>
                  <option value="COMPLETE">Complete</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
