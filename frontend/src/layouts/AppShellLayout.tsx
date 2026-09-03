import { AppShell } from '@/components/shell/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { DatasetIngestionProvider } from '@/features/ingestion/context/DatasetIngestionContext'
import { PreprocessingProvider } from '@/features/preprocessing/context/PreprocessingProvider'
import { ClassicalMlProvider } from '@/features/classicalMl/context/ClassicalMlProvider'
import { QuantumMlProvider } from '@/features/quantumMl/context/QuantumMlProvider'
import { ModelComparisonProvider } from '@/features/modelComparison/context/ModelComparisonProvider'
import { ExplainabilityProvider } from '@/features/explainability/context/ExplainabilityProvider'
import { ClinicalInterpretationProvider } from '@/features/clinicalInterpretation/context/ClinicalInterpretationProvider'
import { PatientReportProvider } from '@/features/patientReport/context/PatientReportProvider'

/**
 * One provider tree for the whole authenticated app. Each stage's context
 * used to be re-mounted fresh on every page (ModelComparisonProvider,
 * ExplainabilityProvider, etc. were wrapped inside individual page
 * components) — that reset live state (e.g. a run native VQC verification)
 * the moment the user navigated away, so the "live" pipeline never actually
 * carried a real result from one stage to the next. Hoisting every stage's
 * provider here, in dependency order, makes state persist across the whole
 * workflow the way DatasetIngestion/Preprocessing/ClassicalMl/QuantumMl
 * already did.
 */
export function AppShellLayout() {
  return (
    <DatasetIngestionProvider>
      <PreprocessingProvider>
        <ClassicalMlProvider>
          <QuantumMlProvider>
            <ModelComparisonProvider>
              <ExplainabilityProvider>
                <ClinicalInterpretationProvider>
                  <PatientReportProvider>
                    <AppShell>
                      <div data-lenis-prevent className="mx-auto w-full max-w-[var(--container-max)] px-6 py-8 md:px-10">
                        <PageTransition />
                      </div>
                    </AppShell>
                  </PatientReportProvider>
                </ClinicalInterpretationProvider>
              </ExplainabilityProvider>
            </ModelComparisonProvider>
          </QuantumMlProvider>
        </ClassicalMlProvider>
      </PreprocessingProvider>
    </DatasetIngestionProvider>
  )
}
