import { DiagnosticWorkflowNav } from '@/components/navigation/DiagnosticWorkflowNav'
import { ReportDocument } from '@/features/patientReport/components/ReportDocument'

/**
 * Phase 7 — Patient Report page (/app/report).
 *
 * Consumes the shared provider stack hoisted in AppShellLayout, so the report
 * reflects real state carried over from every earlier stage rather than a
 * freshly reset context. The workflow nav is marked print-hidden.
 */
export default function PatientReportPage() {
  return (
    <div className="w-full flex flex-col items-center pb-16">
      <div data-print-hide>
        <DiagnosticWorkflowNav currentStage="report" datasetLoaded canContinue />
      </div>

      <div className="w-full max-w-[960px]">
        <ReportDocument />
      </div>
    </div>
  )
}
