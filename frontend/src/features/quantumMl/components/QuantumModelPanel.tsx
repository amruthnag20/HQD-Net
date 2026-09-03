import { Info, AlertTriangle } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { useQuantumMl } from '../hooks/useQuantumMl'
import { QuantumInputFlow } from './QuantumInputFlow'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  'input-incompatible': 'Model input incompatible',
  'integration-pending': 'Backend integration pending',
  ready: 'Execution ready',
  executing: 'Executing',
  complete: 'Result available',
  error: 'Execution error',
}

export function QuantumModelPanel() {
  const { result } = useQuantumMl()

  if (!result) {
    return (
      <Panel eyebrow="Quantum ML — Phase 3B" title="Existing quantum model (DressedVQC)">
        <p className="font-mono text-xs text-secondary">No model-ready dataset yet.</p>
      </Panel>
    )
  }

  const { quantumMetadata } = result

  return (
    <Panel eyebrow="Quantum ML — Phase 3B" title="Existing quantum model (DressedVQC)">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={result.status === 'complete' ? 'success' : result.status === 'error' ? 'danger' : 'neutral'}>
          {STATUS_LABEL[result.status]}
        </Badge>
        <span className="text-xs text-muted">frozen · inference-only</span>
      </div>

      {result.statusMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-surface-subtle p-3">
          <Info className="size-4 shrink-0 text-accent" />
          <p className="text-xs leading-relaxed text-secondary">{result.statusMessage}</p>
        </div>
      )}

      {quantumMetadata && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {([
            ['Qubits', String(quantumMetadata.qubits)],
            ['Layers', String(quantumMetadata.layers)],
            ['Ansatz', quantumMetadata.ansatz],
            ['Encoding', quantumMetadata.encoding],
            ['Simulator', quantumMetadata.simulator],
            ['Checkpoint', quantumMetadata.checkpointPath],
          ] as const).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface-subtle p-2.5">
              <div className="text-xs text-muted">{label}</div>
              <div className="mt-0.5 truncate font-mono text-xs text-primary" title={value}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <p className="mb-2 text-xs text-muted">Quantum representation</p>
      <div className="mb-4 overflow-x-auto pb-1">
        <QuantumInputFlow featureCount={result.featureCount} quantumInputDimension={result.quantumInputDimension} />
      </div>

      {result.modelMetadata && result.modelMetadata.integrationGaps.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
            <AlertTriangle className="size-3.5 text-warning" />
            Why this can't execute yet
          </p>
          <ul className="flex flex-col gap-1.5">
            {result.modelMetadata.integrationGaps.map((gap) => (
              <li key={gap} className="rounded-xl bg-surface-subtle px-3 py-2 text-xs leading-relaxed text-secondary">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}
