import { Link } from 'react-router-dom'
import {
  HeartPulse,
  User,
  Flag,
  ShieldCheck,
  ClipboardList,
  BarChart3,
  Lightbulb,
  ShieldAlert,
  Pill,
  Star,
  BookOpen,
  RefreshCw,
  MessageSquare,
} from 'lucide-react'
import { usePatientReport } from '../hooks/usePatientReport'
import { isReportRenderable } from '../lib/reportEngine'
import { ClinicalScenarioSelector } from '@/features/clinicalInterpretation/components/ClinicalScenarioSelector'
import { ReportHeader } from './ReportHeader'
import { ReportActions } from './ReportActions'
import { DashboardCard } from './DashboardCard'
import { PatientInformation } from './PatientInformation'
import {
  PredictedConditionCard,
  PriorityActionCard,
  ModelComparisonSection,
  FeedbackStatusCard,
  HumanReadableSummaryCard,
} from './ReportGridCards'
import { ExplainabilitySummary } from './ExplainabilitySummary'
import { CompletenessIndicator } from './CompletenessIndicator'
import { ReviewPanel, ReviewSummaryPrint } from './ReviewPanel'
import { ReportFooter } from './ReportFooter'
import {
  ReportClinicalInterpretation,
  ReportEvidence,
  ReportKeyRiskFactors,
  ReportMedication,
  ReportPrecautions,
  ReportRecommendations,
} from './ReportClinicalSections'

/**
 * Phase 7 — Patient Report. A dashboard-style card grid (13 cards across 4
 * rows), distinct from the interactive Phase 6 workspace. Every card is wired
 * to real adapter data — no invented demographics, no fixed model roster, no
 * implied retraining pipeline. Sections with no real data show an honest
 * empty state instead of filler content.
 */
export function ReportDocument() {
  const { report } = usePatientReport()

  if (!isReportRenderable(report.clinical)) {
    return (
      <div className="flex flex-col gap-6">
        <ClinicalScenarioSelector />
        <div className="rounded-2xl border border-dashed border-line-subtle bg-surface p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-primary">Report data is incomplete.</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
            The report requires clinical interpretation state. Complete the earlier stages, or load a
            demo fixture above to preview the report.
          </p>
          <Link
            to="/app/clinical-interpretation"
            className="focus-ring mt-4 inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Return to Clinical Interpretation
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <ClinicalScenarioSelector />
      <ReportActions />

      <article className="report-print-root flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <ReportHeader />

        {/* Row 1 — at a glance */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard icon={HeartPulse} tone="accent" title="Predicted Condition">
            <PredictedConditionCard />
          </DashboardCard>
          <DashboardCard icon={User} tone="purple" title="Patient / Sample Summary">
            <PatientInformation />
          </DashboardCard>
          <DashboardCard icon={Flag} tone="warning" title="Review Priority">
            <PriorityActionCard />
          </DashboardCard>
        </div>

        {/* Row 2 — factors and comparison */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard icon={ShieldCheck} tone="danger" title="Key Risk Factors">
            <ReportKeyRiskFactors />
          </DashboardCard>
          <DashboardCard icon={ClipboardList} tone="teal" title="Model Input Highlights">
            <ExplainabilitySummary />
          </DashboardCard>
          <DashboardCard icon={BarChart3} tone="accent" title="Model Comparison">
            <ModelComparisonSection />
          </DashboardCard>
        </div>

        {/* Row 3 — interpretation and guidance */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard icon={Lightbulb} tone="warning" title="Explainable AI">
            <ReportClinicalInterpretation />
          </DashboardCard>
          <DashboardCard icon={ShieldAlert} tone="success" title="Precautions">
            <ReportPrecautions />
          </DashboardCard>
          <DashboardCard icon={Pill} tone="purple" title="Medication Information">
            <ReportMedication />
          </DashboardCard>
          <DashboardCard icon={Star} tone="pink" title="Recommendations">
            <ReportRecommendations />
          </DashboardCard>
        </div>

        {/* Row 4 — evidence, review, and summary */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <DashboardCard icon={BookOpen} tone="teal" title="Medical Evidence">
            <ReportEvidence />
          </DashboardCard>
          <DashboardCard icon={RefreshCw} tone="danger" title="Clinical Review & Feedback">
            <FeedbackStatusCard>
              <ReviewPanel />
              <ReviewSummaryPrint />
            </FeedbackStatusCard>
          </DashboardCard>
          <DashboardCard icon={MessageSquare} tone="accent" title="Human-Readable Summary">
            <HumanReadableSummaryCard />
          </DashboardCard>
        </div>

        <div className="report-section border-t border-line-subtle pt-4">
          <CompletenessIndicator />
        </div>

        <ReportFooter />
      </article>
    </div>
  )
}
