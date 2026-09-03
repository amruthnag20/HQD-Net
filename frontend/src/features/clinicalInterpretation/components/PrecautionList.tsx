import { AlertTriangle, Info, ShieldAlert, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { ClinicalSection, ClinicalEmptyState } from './ClinicalSection'
import type { PrecautionSeverity } from '../types/clinicalInterpretation'

const SEVERITY: Record<PrecautionSeverity, { tone: string; icon: typeof Info; label: string }> = {
  info: { tone: 'border-info/40 bg-info-muted text-info', icon: Info, label: 'Info' },
  caution: { tone: 'border-line-strong bg-surface-subtle text-secondary', icon: AlertTriangle, label: 'Caution' },
  warning: { tone: 'border-warning/50 bg-warning-muted text-warning', icon: TriangleAlert, label: 'Warning' },
  critical: { tone: 'border-danger/50 bg-danger-muted text-danger', icon: ShieldAlert, label: 'Critical' },
}

/**
 * Precautions (Phase 6, Section 18). Displays backend-supplied precautions with a
 * clear severity hierarchy. No frontend medical reasoning.
 */
export function PrecautionList() {
  const { interpretation } = useClinicalInterpretation()
  const precautions = interpretation.precautions

  return (
    <ClinicalSection id="precautions" title="Precautions">
      {precautions.length === 0 ? (
        <ClinicalEmptyState message="Precaution information unavailable." />
      ) : (
        <ul className="flex flex-col gap-2">
          {precautions.map((p) => {
            const sev = SEVERITY[p.severity ?? 'caution']
            const Icon = sev.icon
            return (
              <li
                key={p.id}
                className={cn('flex items-start gap-2.5 rounded-lg border p-3.5', sev.tone)}
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-primary">{p.title}</p>
                    <span className="font-mono text-[9px] uppercase tracking-wider opacity-80">
                      {sev.label}
                    </span>
                  </div>
                  {p.description && <p className="mt-0.5 text-xs text-secondary">{p.description}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </ClinicalSection>
  )
}
