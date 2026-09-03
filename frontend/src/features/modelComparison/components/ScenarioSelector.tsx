import { useState, useRef, useEffect } from 'react'
import { Eye, Check, AlertTriangle, Activity, FlaskConical, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useModelComparison } from '../hooks/useModelComparison'

const SCENARIOS = [
  {
    id: 'live',
    label: 'Live runtime state',
    sub: 'Real app context (incompatible domains)',
    icon: Activity,
  },
  {
    id: 'COMPATIBLE_AGREEMENT',
    label: 'Compatible agreement',
    sub: 'Aligned 10-D benchmarks, normal agreement',
    icon: Check,
  },
  {
    id: 'COMPATIBLE_DISAGREEMENT',
    label: 'Model disagreement',
    sub: 'Borderline case, review required',
    icon: AlertTriangle,
  },
  {
    id: 'CLASSICAL_ONLY',
    label: 'Classical only',
    sub: 'Quantum inference pending',
    icon: Eye,
  },
]

/**
 * QA-only scenario switcher, tucked into a popover instead of a permanent
 * banner. The live-mode patient selector below it is a real feature (it
 * triggers actual quantum verification), so it stays visible in the main flow.
 */
export function ScenarioSelector() {
  const { activeFixtureKey, setActiveFixtureKey, selectedRowIndex, setSelectedRowIndex, runQuantumVerification, isLoading } =
    useModelComparison()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const active = SCENARIOS.find((s) => s.id === activeFixtureKey)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div ref={ref} data-dev-only className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            activeFixtureKey === 'live'
              ? 'border-line-subtle bg-surface text-muted hover:text-secondary'
              : 'border-warning/30 bg-warning-muted text-warning',
          )}
        >
          <FlaskConical className="size-3.5" />
          {activeFixtureKey === 'live' ? 'Preview scenario' : active?.label}
          <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute left-0 z-popover mt-2 w-72 overflow-hidden rounded-xl border border-line-subtle bg-surface p-1 shadow-popover">
            {SCENARIOS.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveFixtureKey(s.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-subtle',
                    activeFixtureKey === s.id && 'bg-surface-subtle',
                  )}
                >
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-muted" />
                  <span>
                    <span
                      className={cn(
                        'block text-sm',
                        activeFixtureKey === s.id ? 'font-medium text-accent' : 'text-primary',
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="block text-xs text-muted">{s.sub}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {activeFixtureKey === 'live' && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted">Patient:</span>
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedRowIndex(idx)
                void runQuantumVerification(idx)
              }}
              disabled={isLoading}
              className={cn(
                'h-7 rounded-full px-2.5 font-mono transition-colors',
                selectedRowIndex === idx
                  ? 'bg-accent text-accent-fg font-medium'
                  : 'bg-surface-subtle text-secondary hover:text-primary',
              )}
            >
              PAT_{1000 + idx}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
