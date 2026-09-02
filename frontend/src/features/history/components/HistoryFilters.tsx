import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react'
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

  const activeFilterCount = [
    filters.engine !== 'All',
    filters.classification !== 'All',
    filters.status !== 'All',
  ].filter(Boolean).length

  return (
    <div className="w-full flex flex-col gap-3 py-3 border-y border-line-subtle mb-6">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input 
            type="text"
            placeholder="Search by analysis ID, engine, or date..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full bg-surface-subtle border border-line pl-10 pr-9 py-2 rounded-sm font-sans text-sm text-primary placeholder:text-muted focus-ring transition-colors"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => updateFilter('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary p-0.5 rounded"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 border rounded-sm font-mono text-xs tracking-widest uppercase transition-all duration-150 focus-ring ${
              showFilters || activeFilterCount > 0
                ? 'border-accent bg-accent/10 text-accent font-semibold' 
                : 'border-line text-secondary hover:border-line-strong hover:text-primary'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            FILTER {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </button>
          
          <div className="relative flex-1 md:flex-none group">
            <select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="w-full appearance-none bg-surface border border-line rounded-sm pl-3.5 pr-9 py-2 font-mono text-xs tracking-widest uppercase text-secondary hover:border-line-strong hover:text-primary transition-colors focus-ring cursor-pointer"
            >
              <option value="newest">NEWEST</option>
              <option value="oldest">OLDEST</option>
              <option value="highest-risk">HIGHEST RISK</option>
              <option value="lowest-risk">LOWEST RISK</option>
              <option value="highest-confidence">HIGHEST CONFIDENCE</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Filter Expansion Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-line-subtle mt-1">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-muted tracking-widest uppercase">Engine Architecture</label>
                <select 
                  value={filters.engine}
                  onChange={(e) => updateFilter('engine', e.target.value)}
                  className="bg-surface border border-line rounded-sm p-2 font-sans text-sm text-secondary focus-ring cursor-pointer"
                >
                  <option value="All">All Architectures</option>
                  <option value="VQC">VQC (Variational Classifier)</option>
                  <option value="QSVM">QSVM (Quantum SVM)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-muted tracking-widest uppercase">Risk Classification</label>
                <select 
                  value={filters.classification}
                  onChange={(e) => updateFilter('classification', e.target.value)}
                  className="bg-surface border border-line rounded-sm p-2 font-sans text-sm text-secondary focus-ring cursor-pointer"
                >
                  <option value="All">All Classifications</option>
                  <option value="HIGH RISK">High Risk</option>
                  <option value="MEDIUM RISK">Medium Risk</option>
                  <option value="LOW RISK">Low Risk</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-muted tracking-widest uppercase">Execution Status</label>
                <select 
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="bg-surface border border-line rounded-sm p-2 font-sans text-sm text-secondary focus-ring cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="COMPLETE">Complete (Executed)</option>
                  <option value="FAILED">Failed (Interrupted)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
