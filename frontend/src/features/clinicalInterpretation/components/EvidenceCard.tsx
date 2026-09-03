import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { relevanceLabel, sourceTypeLabel, strengthLabel } from '../lib/clinicalEngine'
import { ProvenanceBadge } from './ProvenanceBadge'
import type { EvidenceRelevance, MedicalEvidence } from '../types/clinicalInterpretation'

const RELEVANCE_TONE: Record<EvidenceRelevance, string> = {
  high: 'border-success/40 bg-success-muted text-success',
  medium: 'border-info/40 bg-info-muted text-info',
  low: 'border-line-strong bg-surface-subtle text-muted',
}

/**
 * A single medical-evidence card. Displays whatever metadata the backend supplied
 * and nothing more — never fabricates citations, journals, authors, or scores. Demo
 * fixtures are marked with a DEMO badge. Expandable to show the excerpt.
 */
export function EvidenceCard({
  evidence,
  highlighted,
  onHover,
}: {
  evidence: MedicalEvidence
  highlighted?: boolean
  onHover?: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <article
      onMouseEnter={() => onHover?.(evidence.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        'rounded-lg border bg-surface p-4 transition-colors',
        highlighted ? 'border-accent ring-1 ring-accent/30' : 'border-line-subtle',
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[10px] font-medium text-secondary">
          {evidence.citationLabel}
        </span>
        <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-muted">
          {sourceTypeLabel(evidence.sourceType)}
        </span>
        {evidence.relevance && (
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
              RELEVANCE_TONE[evidence.relevance],
            )}
          >
            {relevanceLabel(evidence.relevance)} relevance
          </span>
        )}
        {evidence.isDemo && <ProvenanceBadge provenance="demo-data" />}
      </div>

      <h3 className="mt-2 text-sm font-medium leading-snug text-primary">{evidence.title}</h3>

      <p className="mt-1 text-xs text-muted">
        {[evidence.authors, evidence.year != null ? String(evidence.year) : null, evidence.source]
          .filter(Boolean)
          .join(' · ') || 'Source metadata not provided.'}
      </p>

      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-secondary">
        <div className="flex gap-1">
          <dt className="text-muted">Strength:</dt>
          <dd>{strengthLabel(evidence.strength)}</dd>
        </div>
        {evidence.relevanceScore != null && Number.isFinite(evidence.relevanceScore) && (
          <div className="flex gap-1">
            <dt className="text-muted">Score:</dt>
            <dd>{evidence.relevanceScore.toFixed(2)}</dd>
          </div>
        )}
        {evidence.identifier && (
          <div className="flex gap-1">
            <dt className="text-muted">ID:</dt>
            <dd className="font-mono">{evidence.identifier}</dd>
          </div>
        )}
      </dl>

      {evidence.excerpt && (
        <div className="mt-2">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="focus-ring inline-flex items-center gap-1 rounded font-mono text-[11px] text-accent hover:underline"
          >
            <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
            {open ? 'Hide excerpt' : 'Show excerpt'}
          </button>
          {open && (
            <p className="mt-1.5 rounded-lg bg-surface-subtle p-2.5 text-xs leading-relaxed text-secondary">
              {evidence.excerpt}
            </p>
          )}
        </div>
      )}

      {evidence.url && (
        <a
          href={evidence.url}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring mt-2 inline-flex items-center gap-1 rounded font-mono text-[11px] text-accent hover:underline"
        >
          <ExternalLink className="size-3" />
          Open source
        </a>
      )}
    </article>
  )
}
