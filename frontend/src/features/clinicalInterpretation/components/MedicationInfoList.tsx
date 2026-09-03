import { Pill } from 'lucide-react'
import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { ClinicalSection, ClinicalEmptyState } from './ClinicalSection'

/**
 * Medication INFORMATION (Phase 6, Section 19). This is not a prescribing system.
 * The frontend never computes dosage or recommends a medication — it only displays
 * information supplied by an approved external clinical system, clearly framed as
 * information rather than a prescription.
 */
export function MedicationInfoList() {
  const { interpretation } = useClinicalInterpretation()
  const medications = interpretation.medicationInformation

  return (
    <ClinicalSection
      id="medication"
      title="Medication Information"
      actions={
        <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-xs text-muted">
          Information · not a prescription
        </span>
      }
    >
      {medications.length === 0 ? (
        <ClinicalEmptyState message="Medication information is not available for this analysis." />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {medications.map((m) => (
            <li key={m.id} className="rounded-lg border border-line-subtle bg-surface p-3.5">
              <div className="flex items-center gap-2">
                <Pill className="size-4 text-muted" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{m.name}</p>
              </div>
              {m.purpose && (
                <p className="mt-1 text-xs text-secondary">
                  <span className="text-muted">Purpose: </span>
                  {m.purpose}
                </p>
              )}
              {m.context && (
                <p className="mt-0.5 text-xs text-secondary">
                  <span className="text-muted">Context: </span>
                  {m.context}
                </p>
              )}
              {m.contraindicationInfo && (
                <p className="mt-0.5 text-xs text-secondary">
                  <span className="text-muted">Contraindication info: </span>
                  {m.contraindicationInfo}
                </p>
              )}
              {m.warnings.length > 0 && (
                <ul className="mt-1.5 list-inside list-disc text-xs text-warning">
                  {m.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </ClinicalSection>
  )
}
