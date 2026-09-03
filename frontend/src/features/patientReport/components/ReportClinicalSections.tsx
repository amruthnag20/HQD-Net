import { usePatientReport } from '../hooks/usePatientReport'
import {
  formatContribution,
  recommendationCategoryLabel,
  strengthLabel,
} from '@/features/clinicalInterpretation/lib/clinicalEngine'
import { EvidenceCard } from '@/features/clinicalInterpretation/components/EvidenceCard'
import { EvidenceFindingLink } from '@/features/clinicalInterpretation/components/EvidenceFindingLink'
import { ProvenanceBadge } from '@/features/clinicalInterpretation/components/ProvenanceBadge'

/**
 * Compact, document-style renderers for the report's clinical content. They read
 * directly from the assembled report (ClinicalContext) — no duplicated logic — and
 * omit their own heading chrome since the dashboard grid card wrapper provides it.
 */

export function ReportKeyRiskFactors() {
  const { report } = usePatientReport()
  const risks = report.clinical.riskFactors
  if (risks.length === 0) {
    return <p className="text-sm text-muted">No clinical risk-factor classification is available.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted">
          <th className="py-1.5 pr-3 font-medium">Factor</th>
          <th className="py-1.5 pr-3 font-medium">Value</th>
          <th className="py-1.5 pr-3 font-medium">Contribution</th>
          <th className="py-1.5 font-medium">Evidence strength</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line-subtle">
        {risks.map((r) => (
          <tr key={r.id}>
            <td className="py-1.5 pr-3 font-medium text-primary">{r.name}</td>
            <td className="py-1.5 pr-3 text-secondary">{r.value ?? '—'}</td>
            <td className="py-1.5 pr-3 font-mono text-xs text-secondary">
              {formatContribution(r.contribution)}
            </td>
            <td className="py-1.5 text-secondary">{strengthLabel(r.evidenceStrength)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ReportClinicalInterpretation() {
  const { report } = usePatientReport()
  const n = report.clinical.narrative
  const sections = [
    { title: 'Summary', text: n.summary },
    { title: 'Key Findings', text: n.keyFindings },
    { title: 'Risk Interpretation', text: n.riskInterpretation },
    { title: 'Evidence Context', text: n.evidenceContext },
    { title: 'Recommended Next Steps', text: n.recommendedNextSteps },
  ].filter((s) => s.text != null && s.text.trim().length > 0)

  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted">
        Clinical interpretation text is not available. It will appear once the medical-knowledge
        backend is connected.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ProvenanceBadge provenance="ai-interpretation" />
      {sections.map((s) => (
        <div key={s.title}>
          <h3 className="text-xs font-medium text-muted">{s.title}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-secondary">{s.text}</p>
        </div>
      ))}
      <EvidenceFindingLink
        findings={report.clinical.keyFindings}
        evidence={report.clinical.evidence}
        compact
      />
    </div>
  )
}

export function ReportEvidence() {
  const { report } = usePatientReport()
  const evidence = report.clinical.evidence
  if (evidence.length === 0) {
    return <p className="text-sm text-muted">No supporting medical evidence was included in this analysis.</p>
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {evidence.map((e) => (
        <EvidenceCard key={e.id} evidence={e} />
      ))}
    </div>
  )
}

export function ReportRecommendations() {
  const { report } = usePatientReport()
  const recs = report.clinical.recommendations
  if (recs.length === 0) {
    return <p className="text-sm text-muted">No recommendations were supplied for this analysis.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {recs.map((r) => (
        <li key={r.id} className="rounded-xl bg-surface-subtle p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">
              {recommendationCategoryLabel(r.category)}
            </span>
            {r.priority && (
              <span className="text-xs text-secondary">
                {r.priority} priority
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-primary">{r.title}</p>
          {r.rationale && <p className="mt-0.5 text-xs italic text-muted">{r.rationale}</p>}
        </li>
      ))}
    </ul>
  )
}

export function ReportPrecautions() {
  const { report } = usePatientReport()
  const precautions = report.clinical.precautions
  if (precautions.length === 0) {
    return <p className="text-sm text-muted">Precaution information unavailable.</p>
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {precautions.map((p) => (
        <li key={p.id} className="rounded-xl bg-surface-subtle p-3 text-sm">
          <span className="text-xs text-muted">
            {p.severity ?? 'caution'}
          </span>
          <p className="mt-0.5 font-medium text-primary">{p.title}</p>
          {p.description && <p className="mt-0.5 text-xs text-secondary">{p.description}</p>}
        </li>
      ))}
    </ul>
  )
}

export function ReportMedication() {
  const { report } = usePatientReport()
  const meds = report.clinical.medicationInformation
  if (meds.length === 0) {
    return <p className="text-sm text-muted">Medication information is not available for this analysis.</p>
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-warning">
        Information only — not a prescription
      </p>
      <ul className="flex flex-col gap-1.5">
        {meds.map((m) => (
          <li key={m.id} className="rounded-xl bg-surface-subtle p-3 text-sm">
            <p className="font-medium text-primary">{m.name}</p>
            {m.purpose && <p className="mt-0.5 text-xs text-secondary">{m.purpose}</p>}
            {m.context && <p className="mt-0.5 text-xs text-muted">{m.context}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
