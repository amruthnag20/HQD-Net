import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useClinicalInterpretation } from '../hooks/useClinicalInterpretation'
import { getClinicalInterpretationStatus } from '../lib/clinicalEngine'
import { ClinicalScenarioSelector } from './ClinicalScenarioSelector'
import { ClinicalHeader } from './ClinicalHeader'
import { ClinicalStatusBanner } from './ClinicalStatusBanner'
import { ClinicalSummaryCard } from './ClinicalSummaryCard'
import { FindingsList } from './FindingsList'
import { RiskFactorList } from './RiskFactorList'
import { EvidenceList } from './EvidenceList'
import { EvidenceFindingLink } from './EvidenceFindingLink'
import { InterpretationNarrative } from './InterpretationNarrative'
import { RecommendationList } from './RecommendationList'
import { PrecautionList } from './PrecautionList'
import { MedicationInfoList } from './MedicationInfoList'
import { PrioritySection } from './PrioritySection'
import { ClinicalDisclaimer } from './ClinicalDisclaimer'

/**
 * Phase 6 — Clinical Interpretation workspace. An interactive interpretation
 * surface (distinct from the Phase 7 report document). Follows the layout hierarchy:
 * header → summary → findings → risk factors → evidence → evidence↔finding →
 * interpretation → recommendations → precautions → medication → priority →
 * disclaimer → CTA.
 */
export function ClinicalWorkspace() {
  const { interpretation } = useClinicalInterpretation()
  const status = getClinicalInterpretationStatus(interpretation)

  // Graceful setup state for direct route access with no upstream model state.
  if (status === 'not_started') {
    return (
      <div className="flex flex-col gap-6">
        <ClinicalScenarioSelector />
        <ClinicalHeader />
        <div className="rounded-xl border border-dashed border-line-subtle bg-surface p-8 text-center">
          <p className="text-sm font-medium text-primary">
            Run the model and explanation stages before generating clinical interpretation.
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-muted">
            Clinical interpretation consumes the model output and explainability results. Complete the
            earlier stages, or load a demo fixture above to preview this page.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              to="/app/explainability"
              className="focus-ring rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-secondary transition-colors hover:border-accent hover:text-primary"
            >
              ← Back to Explainability
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ClinicalScenarioSelector />
      <ClinicalHeader />
      <ClinicalStatusBanner />
      <ClinicalSummaryCard />

      <FindingsList />
      <RiskFactorList />
      <EvidenceList />
      <EvidenceFindingLink findings={interpretation.keyFindings} evidence={interpretation.evidence} />
      <InterpretationNarrative />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecommendationList />
        <PrecautionList />
      </div>

      <MedicationInfoList />
      <PrioritySection />
      <ClinicalDisclaimer />

      {/* Handoff to Phase 7 */}
      <div className="flex items-center justify-between rounded-xl border border-line-subtle bg-surface p-5">
        <div>
          <p className="text-xs text-muted">Next — Phase 7</p>
          <p className="text-sm font-medium text-primary">Assemble the complete patient report</p>
        </div>
        <Link
          to="/app/report"
          id="continue-to-report-btn"
          className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Continue to Patient Report
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
