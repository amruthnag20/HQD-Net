import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Popover } from '@/components/ui/Popover'
import { Badge, type Tone } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import type { ColumnProfile, DatasetState } from '../types/dataset'

type Props = {
  dataset: DatasetState
  onSelect: (column: string | null) => void
}

function roleBadges(column: ColumnProfile, isSuggested: boolean): { label: string; tone: Tone }[] {
  const badges: { label: string; tone: Tone }[] = []
  if (isSuggested) badges.push({ label: 'SUGGESTED', tone: 'info' })
  if (column.isLikelyIdentifier) badges.push({ label: 'IDENTIFIER', tone: 'warning' })
  if (column.dtype === 'empty') badges.push({ label: 'EMPTY', tone: 'danger' })
  else if (column.isConstant) badges.push({ label: 'CONSTANT', tone: 'warning' })
  else badges.push({ label: column.dtype === 'numeric' ? 'NUMERIC' : 'CATEGORICAL', tone: 'neutral' })
  return badges
}

const TARGET_TYPE_LABEL: Record<NonNullable<DatasetState['targetType']>, string> = {
  binary: 'Binary classification',
  multiclass: 'Multiclass classification',
  continuous: 'Continuous (regression-like)',
}

/** A custom, HQD-Net-styled listbox — deliberately not a native <select>, so
 *  each option can show its detected role (suggested / numeric / categorical
 *  / identifier / empty / constant) as inline badges, per the target column
 *  reference in the ingestion spec. */
export function TargetColumnSelector({ dataset, onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePick = (name: string) => {
    onSelect(name)
    setIsOpen(false)
  }

  return (
    <Panel eyebrow="Target variable" title="Prediction target">
      <div ref={containerRef} className="relative">
        <span id="target-column-label" className="mb-1.5 block text-sm font-medium text-secondary">
          Target column
        </span>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby="target-column-label"
          onClick={() => setIsOpen((open) => !open)}
          className={cn(
            'focus-ring flex h-11 w-full items-center justify-between rounded-md border border-line bg-surface px-3 text-left text-md text-primary',
            'transition-colors duration-150 ease-out hover:border-line-strong',
          )}
        >
          {dataset.targetColumn ? (
            <span className="flex items-center gap-2">
              <span className="font-mono">{dataset.targetColumn}</span>
              {dataset.targetColumn === dataset.suggestedTargetColumn && <Badge tone="info">SUGGESTED</Badge>}
            </span>
          ) : (
            <span className="text-muted">Select a column…</span>
          )}
          <ChevronDown className={cn('size-4 text-muted transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
        </button>

        <Popover isOpen={isOpen} onClose={() => setIsOpen(false)} containerRef={containerRef} align="start" width={340} ariaLabel="Select target column">
          <ul role="listbox" aria-label="Target column" className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {dataset.columns.map((column) => {
              const isSuggested = column.name === dataset.suggestedTargetColumn
              const isSelected = column.name === dataset.targetColumn
              return (
                <li key={column.name} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handlePick(column.name)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors duration-100',
                      isSelected ? 'bg-accent-muted' : 'hover:bg-surface-subtle',
                    )}
                  >
                    <span className="truncate font-mono text-sm text-primary">{column.name}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {roleBadges(column, isSuggested).map((badge) => (
                        <Badge key={badge.label} tone={badge.tone}>
                          {badge.label}
                        </Badge>
                      ))}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Popover>
      </div>

      {dataset.targetColumn && dataset.targetType && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Detected type</span>
            <Badge tone="info">{TARGET_TYPE_LABEL[dataset.targetType]}</Badge>
          </div>
          {dataset.targetClasses && dataset.targetClasses.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Classes</span>
              {dataset.targetClasses.map((cls) => (
                <Badge key={cls} tone="neutral">
                  {cls}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
