import { FileX, SearchX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Props = {
  type: 'no-history' | 'no-results'
  onClearFilters?: () => void
}

export function HistoryEmptyState({ type, onClearFilters }: Props) {
  const navigate = useNavigate()

  if (type === 'no-results') {
    return (
      <div className="w-full flex flex-col items-center justify-center py-24 px-4 text-center border-y border-line-subtle">
        <SearchX className="w-8 h-8 text-muted mb-6" />
        <h3 className="font-mono text-sm tracking-widest text-primary uppercase mb-2">No Matching Analyses</h3>
        <p className="font-sans text-sm text-secondary max-w-sm mb-6">
          Try adjusting your search query or removing active filters to see more results.
        </p>
        {onClearFilters && (
          <button 
            onClick={onClearFilters}
            className="font-mono text-xs text-primary uppercase tracking-widest hover:text-accent transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-24 px-4 text-center border-y border-line-subtle">
      <FileX className="w-8 h-8 text-muted mb-6" />
      <h3 className="font-mono text-sm tracking-widest text-primary uppercase mb-2">No Analyses Yet</h3>
      <p className="font-sans text-sm text-secondary max-w-sm mb-8">
        Completed analyses will appear here after you run your first diagnostic workflow.
      </p>
      <button 
        onClick={() => navigate('/app/home')}
        className="focus-ring px-6 py-3 border border-line text-secondary font-mono text-xs tracking-widest uppercase hover:border-line-strong hover:text-primary transition-colors"
      >
        START NEW ANALYSIS →
      </button>
    </div>
  )
}
