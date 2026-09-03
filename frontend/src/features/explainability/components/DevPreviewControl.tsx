import { useState, useRef, useEffect } from 'react'
import { FlaskConical, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useExplainability } from '../hooks/useExplainability'
import { EXPLAINABILITY_FIXTURES } from '../api/explainabilityAdapter'

const FIXTURE_OPTIONS = [
  { key: 'live', label: 'Live data' },
  { key: 'QUANTUM_LOCAL_EXPLANATION', label: 'Quantum — full explanation' },
  { key: 'PARTIAL_EXPLANATION', label: 'Quantum — partial explanation' },
  { key: 'UNAVAILABLE', label: 'Prediction only (no explanation)' },
  { key: 'CLASSICAL_LOCAL_EXPLANATION', label: 'Classical — no explanation' },
  { key: 'GLOBAL_EXPLANATION', label: 'Global cohort importance' },
]

/**
 * QA-only scenario switcher. Tucked into a small closed-by-default popover
 * instead of a permanent banner in the page flow — the same fixture set as
 * before, just out of the way of the real product surface.
 */
export function DevPreviewControl() {
  const { activeFixtureKey, setActiveFixtureKey } = useExplainability()
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
    <div ref={ref} data-dev-only className="relative">
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
            {Object.keys(EXPLAINABILITY_FIXTURES).length} deterministic fixtures for UI verification.
          </p>
        </div>
      )}
    </div>
  )
}
