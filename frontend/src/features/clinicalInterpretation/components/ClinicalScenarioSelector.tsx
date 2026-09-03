import { useState, useRef, useEffect } from 'react'
import { FlaskConical, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { CLINICAL_INTERPRETATION_FIXTURES } from '../api/clinicalInterpretationAdapter'

const FIXTURE_OPTIONS = [
  { key: 'live', label: 'Live data' },
  { key: 'COMPLETE_CLINICAL_INTERPRETATION', label: 'Complete interpretation' },
  { key: 'PARTIAL_INTERPRETATION', label: 'Partial interpretation' },
  { key: 'EVIDENCE_UNAVAILABLE', label: 'Evidence unavailable' },
  { key: 'INTERPRETATION_UNAVAILABLE', label: 'Interpretation unavailable' },
  { key: 'CLINICAL_ERROR', label: 'Error' },
]

/**
 * Development-only scenario selector, tucked into a popover instead of a
 * permanent banner. Shared by both the Clinical Interpretation workspace and
 * the Patient Report (hidden from print via data-dev-only). Live mode
 * consumes real upstream state; fixtures load clearly-labelled DEMO content.
 */
export function ClinicalScenarioSelector() {
  const { activeFixtureKey, setActiveFixtureKey } = useClinicalInterpretation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isLive = activeFixtureKey === 'live'

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const activeLabel = FIXTURE_OPTIONS.find((o) => o.key === activeFixtureKey)?.label ?? 'Live data'

  return (
    <div data-dev-only className="flex justify-end">
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            isLive
              ? 'border-line-subtle bg-surface text-muted hover:text-secondary'
              : 'border-warning/30 bg-warning-muted text-warning',
          )}
        >
          <FlaskConical className="size-3.5" />
          {isLive ? 'Preview scenario' : activeLabel}
          <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute right-0 z-popover mt-2 w-64 overflow-hidden rounded-xl border border-line-subtle bg-surface p-1 shadow-popover">
            {FIXTURE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setActiveFixtureKey(opt.key)
                  setOpen(false)
                }}
                className={cn(
                  'block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-subtle',
                  activeFixtureKey === opt.key ? 'font-medium text-accent' : 'text-secondary',
                )}
              >
                {opt.label}
              </button>
            ))}
            <p className="px-3 pt-1.5 pb-1 text-[11px] leading-relaxed text-muted">
              {Object.keys(CLINICAL_INTERPRETATION_FIXTURES).length} deterministic DEMO fixtures for UI
              verification.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
