import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockHistoryData } from '../data/mockHistory'
import { HistoryTrend } from './HistoryTrend'
import { HistoryFilters, type FilterState } from './HistoryFilters'
import { AnalysisList } from './AnalysisList'
import { HistoryEmptyState } from './HistoryEmptyState'
import { AnalysisDetail } from './AnalysisDetail'

export function HistoryWorkspace() {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    engine: 'All',
    classification: 'All',
    status: 'All',
    sort: 'newest'
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Derived filtered & sorted data
  const processedData = useMemo(() => {
    let result = [...mockHistoryData]

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        r => 
          r.id.toLowerCase().includes(q) || 
          r.engine.toLowerCase().includes(q) ||
          r.classification?.toLowerCase().includes(q) ||
          new Date(r.date).toLocaleDateString().includes(q)
      )
    }

    // Dropdown filters
    if (filters.engine !== 'All') {
      result = result.filter(r => r.engine === filters.engine)
    }
    if (filters.classification !== 'All') {
      result = result.filter(r => r.classification === filters.classification)
    }
    if (filters.status !== 'All') {
      result = result.filter(r => r.status === filters.status)
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sort) {
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'highest-risk':
          return b.riskScore - a.riskScore
        case 'lowest-risk':
          return a.riskScore - b.riskScore
        case 'highest-confidence':
          return b.confidence - a.confidence
        case 'newest':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
    })

    return result
  }, [filters])

  const selectedRecord = useMemo(() => {
    return mockHistoryData.find(r => r.id === selectedId) || null
  }, [selectedId])

  const handleClearFilters = () => {
    setFilters({
      search: '',
      engine: 'All',
      classification: 'All',
      status: 'All',
      sort: 'newest'
    })
  }

  return (
    <div className="w-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="font-display text-4xl text-primary tracking-wide">INVESTIGATION ARCHIVE</h1>
        <div className="flex items-center gap-3">
          <div className="size-2 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
          <span className="font-mono text-[10px] text-muted tracking-widest uppercase">
            ARCHIVE READY
          </span>
        </div>
        <p className="mt-4 font-sans text-sm text-secondary max-w-xl">
          Review previous analyses, execution details, evidence, and model behavior.
        </p>
      </div>

      {mockHistoryData.length === 0 ? (
        <HistoryEmptyState type="no-history" />
      ) : (
        <div className="flex flex-col xl:flex-row gap-12 relative w-full pb-24">
          
          {/* Left Column (List & Trend) */}
          <div className={`flex flex-col transition-all duration-300 w-full ${selectedId ? 'xl:w-[40%]' : 'xl:w-full'}`}>
            <HistoryTrend 
              data={processedData} 
              selectedId={selectedId} 
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)} 
            />
            <HistoryFilters filters={filters} setFilters={setFilters} />
            
            {processedData.length === 0 ? (
              <HistoryEmptyState type="no-results" onClearFilters={handleClearFilters} />
            ) : (
              <AnalysisList 
                analyses={processedData} 
                selectedId={selectedId} 
                onSelect={(id) => setSelectedId(id === selectedId ? null : id)} 
              />
            )}
          </div>

          {/* Right Column (Detail View) */}
          <AnimatePresence>
            {selectedId && selectedRecord && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="w-full xl:w-[60%] flex flex-col xl:border-l xl:border-line-subtle xl:pl-12"
              >
                <AnalysisDetail record={selectedRecord} onClose={() => setSelectedId(null)} />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  )
}
