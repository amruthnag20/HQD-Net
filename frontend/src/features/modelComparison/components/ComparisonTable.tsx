import { Panel } from '@/components/ui/Panel'
import type { ModelOutputSummary } from '../types/modelComparison'

export type ComparisonTableProps = {
  classical: ModelOutputSummary | null
  quantum: ModelOutputSummary | null
}

export function ComparisonTable({ classical, quantum }: ComparisonTableProps) {
  const rows: Array<{
    metric: string
    classicalVal: string
    quantumVal: string
    highlight?: boolean
  }> = [
    {
      metric: 'Predicted Class',
      classicalVal: classical?.predictionLabel ?? 'N/A',
      quantumVal: quantum?.predictionLabel ?? 'N/A',
      highlight: true,
    },
    {
      metric: 'Prediction Confidence',
      classicalVal: classical?.confidencePercent !== null && classical?.confidencePercent !== undefined ? `${classical.confidencePercent.toFixed(1)}%` : 'N/A',
      quantumVal: quantum?.confidencePercent !== null && quantum?.confidencePercent !== undefined ? `${quantum.confidencePercent.toFixed(1)}%` : 'N/A',
    },
    {
      metric: 'Estimated Normal Prob.',
      classicalVal: classical?.probabilities ? `${(classical.probabilities.Normal * 100).toFixed(1)}%` : 'N/A',
      quantumVal: quantum?.probabilities ? `${(quantum.probabilities.Normal * 100).toFixed(1)}%` : 'N/A',
    },
    {
      metric: 'Estimated High Risk Prob.',
      classicalVal: classical?.probabilities ? `${(classical.probabilities['High Risk'] * 100).toFixed(1)}%` : 'N/A',
      quantumVal: quantum?.probabilities ? `${(quantum.probabilities['High Risk'] * 100).toFixed(1)}%` : 'N/A',
    },
    {
      metric: 'Feature Count',
      classicalVal: classical ? `${classical.featureCount} features` : 'N/A',
      quantumVal: quantum ? `${quantum.featureCount} features` : 'N/A',
    },
    {
      metric: 'Model Architecture',
      classicalVal: classical?.modelType ?? 'N/A',
      quantumVal: quantum?.modelType ?? 'N/A',
    },
    {
      metric: 'Accuracy',
      classicalVal: classical?.metrics?.accuracy !== null && classical?.metrics?.accuracy !== undefined ? `${(classical.metrics.accuracy * 100).toFixed(1)}%` : 'N/A (unverified)',
      quantumVal: quantum?.metrics?.accuracy !== null && quantum?.metrics?.accuracy !== undefined ? `${(quantum.metrics.accuracy * 100).toFixed(1)}%` : 'N/A (unverified)',
    },
    {
      metric: 'Precision',
      classicalVal: classical?.metrics?.precision !== null && classical?.metrics?.precision !== undefined ? `${(classical.metrics.precision * 100).toFixed(1)}%` : 'N/A (unverified)',
      quantumVal: quantum?.metrics?.precision !== null && quantum?.metrics?.precision !== undefined ? `${(quantum.metrics.precision * 100).toFixed(1)}%` : 'N/A (unverified)',
    },
    {
      metric: 'Recall',
      classicalVal: classical?.metrics?.recall !== null && classical?.metrics?.recall !== undefined ? `${(classical.metrics.recall * 100).toFixed(1)}%` : 'N/A (unverified)',
      quantumVal: quantum?.metrics?.recall !== null && quantum?.metrics?.recall !== undefined ? `${(quantum.metrics.recall * 100).toFixed(1)}%` : 'N/A (unverified)',
    },
    {
      metric: 'F1 Score',
      classicalVal: classical?.metrics?.f1 !== null && classical?.metrics?.f1 !== undefined ? `${(classical.metrics.f1 * 100).toFixed(1)}%` : 'N/A (unverified)',
      quantumVal: quantum?.metrics?.f1 !== null && quantum?.metrics?.f1 !== undefined ? `${(quantum.metrics.f1 * 100).toFixed(1)}%` : 'N/A (unverified)',
    },
    {
      metric: 'ROC-AUC',
      classicalVal: classical?.metrics?.rocAuc !== null && classical?.metrics?.rocAuc !== undefined ? classical.metrics.rocAuc.toFixed(3) : 'N/A',
      quantumVal: quantum?.metrics?.rocAuc !== null && quantum?.metrics?.rocAuc !== undefined ? quantum.metrics.rocAuc.toFixed(3) : 'N/A',
    },
    {
      metric: 'Execution Status',
      classicalVal: classical?.executionStatus ?? 'Idle',
      quantumVal: quantum?.executionStatus ?? 'Idle',
    },
  ]

  return (
    <Panel eyebrow="Structured summary" title="Model comparison matrix">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-line-subtle text-xs text-muted">
              <th className="py-2.5 px-3">Evaluation Metric</th>
              <th className="py-2.5 px-3 font-medium text-accent">Classical ML (Logistic Regression)</th>
              <th className="py-2.5 px-3 font-medium text-accent">Quantum ML (DressedVQC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {rows.map((r) => (
              <tr key={r.metric} className={r.highlight ? 'bg-accent-muted/40 font-medium' : 'hover:bg-surface-subtle'}>
                <td className="py-2 px-3 text-secondary">{r.metric}</td>
                <td className="py-2 px-3 text-primary">{r.classicalVal}</td>
                <td className="py-2 px-3 text-primary">{r.quantumVal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
