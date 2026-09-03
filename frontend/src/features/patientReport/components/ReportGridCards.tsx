import type { ReactNode } from 'react'
import { usePatientReport } from '../hooks/usePatientReport'
import { interpretationStatusMessage } from '@/features/clinicalInterpretation/lib/clinicalEngine'
import { PriorityBadge } from '@/features/clinicalInterpretation/components/PriorityBadge'
import { GaugeChart } from './GaugeChart'
import { ModelComparisonChart } from './ModelComparisonChart'
import { FeedbackPipeline } from './FeedbackPipeline'

/** Row 1, card 1 — the headline number. Real model output only. */
export function PredictedConditionCard() {
  const { report } = usePatientReport()
  const s = report.executiveSummary
  const isHighRisk = s.predictionLabel === 'High Risk'
  const percent = report.clinical.modelProbabilities
    ? (isHighRisk ? report.clinical.modelProbabilities['High Risk'] : report.clinical.modelProbabilities.Normal) * 100
    : null

  return (
    <div className="flex flex-col items-center">
      <GaugeChart
        percent={percent}
        tone={s.predictionLabel == null ? 'neutral' : isHighRisk ? 'danger' : 'success'}
        label="Model probability"
      />
      <p className="mt-1 text-base font-semibold text-primary">{s.predictionLabel ?? 'Prediction pending'}</p>
      <p className="mb-3 text-xs text-muted">Not a clinical diagnosis</p>

      {(report.modelAnalysis.classical || report.modelAnalysis.quantum) && (
        <div className="flex w-full items-center justify-center gap-4 border-t border-line-subtle pt-3 text-xs">
          {report.modelAnalysis.classical && (
            <span className="text-secondary">
              Classical <span className="font-semibold text-primary">{report.modelAnalysis.classical.probabilityPercent}</span>
            </span>
          )}
          {report.modelAnalysis.quantum && (
            <span className="text-secondary">
              Quantum <span className="font-semibold text-primary">{report.modelAnalysis.quantum.probabilityPercent}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Row 1, card 3 — priority plus the top supplied recommendation (never frontend-authored advice). */
export function PriorityActionCard() {
  const { report } = usePatientReport()
  const topRecommendation = report.clinical.recommendations[0] ?? null

  return (
    <div className="flex flex-col items-center gap-4">
      <PriorityBadge priority={report.executiveSummary.priority} className="px-4 py-1.5 text-sm" />

      <div className="w-full">
        <p className="mb-1.5 text-xs font-medium text-muted">Recommended action</p>
        {topRecommendation ? (
          <div className="rounded-xl bg-accent-muted p-3 text-sm text-primary">
            <p className="font-medium">{topRecommendation.title}</p>
            {topRecommendation.description && <p className="mt-0.5 text-xs text-secondary">{topRecommendation.description}</p>}
          </div>
        ) : (
          <p className="rounded-xl bg-surface-subtle p-3 text-sm text-muted">
            No recommendation supplied by the clinical knowledge layer yet.
          </p>
        )}
      </div>
    </div>
  )
}

/** Row 2, card 3 — real classical vs. quantum comparison, never a fixed model roster. */
export function ModelComparisonSection() {
  const { report } = usePatientReport()
  const m = report.modelAnalysis

  return (
    <div>
      <ModelComparisonChart rows={[m.classical, m.quantum]} />
      {m.available && (
        <p className="mt-3 border-t border-line-subtle pt-3 text-xs text-secondary">
          <span className="font-medium text-primary">Agreement: </span>
          {m.agreement}
          <br />
          <span className="font-medium text-primary">Input compatibility: </span>
          {m.compatibility}
        </p>
      )}
    </div>
  )
}

/** Row 4, card 2 — honest feedback pipeline plus the real review controls. */
export function FeedbackStatusCard({ children }: { children: ReactNode }) {
  const { report } = usePatientReport()
  return (
    <div className="flex flex-col gap-4">
      <FeedbackPipeline reviewerStatus={report.feedback.reviewerStatus} />
      <div className="border-t border-line-subtle pt-4">{children}</div>
    </div>
  )
}

/** Row 4, card 3 — the plain-language summary supplied by the interpretation layer, plus the disclaimer. */
export function HumanReadableSummaryCard() {
  const { report } = usePatientReport()
  const summary = report.clinical.narrative.summary

  return (
    <div className="flex flex-col gap-3">
      {summary ? (
        <p className="text-sm leading-relaxed text-secondary">{summary}</p>
      ) : (
        <p className="text-sm text-muted">
          {interpretationStatusMessage(report.executiveSummary.interpretationStatus)}
        </p>
      )}
      <div className="rounded-xl bg-surface-subtle p-3 text-xs leading-relaxed text-secondary">
        <p className="font-medium text-primary">Not a final diagnosis</p>
        <p className="mt-0.5">
          AI-generated analysis is intended to support clinical review and does not replace professional
          medical judgment.
        </p>
      </div>
    </div>
  )
}

