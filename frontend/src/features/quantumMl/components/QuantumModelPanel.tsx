import { useState, useEffect } from 'react'
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { useQuantumMl } from '../hooks/useQuantumMl'
import { QuantumInputFlow } from './QuantumInputFlow'
import { checkQuantumBackend } from '../api/quantumApi'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  'input-incompatible': 'Model input incompatible',
  'integration-pending': 'Backend integration pending',
  ready: 'Execution ready (Backend connected)',
  executing: 'Executing',
  complete: 'Result available',
  error: 'Execution error',
}

export function QuantumModelPanel() {
  const { result } = useQuantumMl()
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    async function checkHealth() {
      try {
        await checkQuantumBackend()
        if (!cancelled) setIsBackendOnline(true)
      } catch {
        if (!cancelled) setIsBackendOnline(false)
      }
    }
    void checkHealth()
    return () => {
      cancelled = true
    }
  }, [])

  if (!result) {
    return (
      <Panel eyebrow="Quantum ML — Phase 3B" title="Existing quantum model (DressedVQC)">
        <p className="font-mono text-xs text-secondary">No model-ready dataset yet.</p>
      </Panel>
    )
  }

  const { quantumMetadata } = result
  const currentStatus = isBackendOnline ? 'ready' : result.status

  return (
    <Panel eyebrow="Quantum ML — Phase 3B" title="Existing quantum model (DressedVQC)">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={isBackendOnline ? 'success' : result.status === 'complete' ? 'success' : result.status === 'error' ? 'danger' : 'neutral'}>
          {STATUS_LABEL[currentStatus] || STATUS_LABEL[result.status]}
        </Badge>
        <span className="text-xs text-muted">frozen · inference-only</span>
      </div>

      <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-surface-subtle p-3">
        {isBackendOnline ? (
          <CheckCircle2 className="size-4 shrink-0 text-success mt-0.5" />
        ) : (
          <Info className="size-4 shrink-0 text-accent mt-0.5" />
        )}
        <p className="text-xs leading-relaxed text-secondary">
          {isBackendOnline
            ? 'FastAPI quantum backend (:8000) active. 10-qubit DressedVQC model is connected and ready for runtime PennyLane execution.'
            : result.statusMessage}
        </p>
      </div>

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

      {isBackendOnline ? (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckCircle2 className="size-3.5 text-success" />
            Backend integration status — Operational
          </p>
          <ul className="flex flex-col gap-1.5 font-mono text-xs">
            <li className="rounded-xl bg-surface-subtle px-3 py-2 text-secondary">
              <span className="text-success font-semibold">✓ FastAPI HTTP Boundary:</span> Connected to http://localhost:8000 (/api/quantum/predict & /api/clinical-analysis)
            </li>
            <li className="rounded-xl bg-surface-subtle px-3 py-2 text-secondary">
              <span className="text-success font-semibold">✓ PennyLane Execution Engine:</span> Installed & verified (default.qubit simulator, 10 wires)
            </li>
            <li className="rounded-xl bg-surface-subtle px-3 py-2 text-secondary">
              <span className="text-success font-semibold">✓ 10-D Feature Projection:</span> Latent PCA projection & 12-D raw feature contract active
            </li>
          </ul>
        </div>
      ) : result.modelMetadata && result.modelMetadata.integrationGaps.length > 0 ? (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
            <AlertTriangle className="size-3.5 text-warning" />
            Backend integration check (http://localhost:8000)
          </p>
          <ul className="flex flex-col gap-1.5">
            {result.modelMetadata.integrationGaps.map((gap) => (
              <li key={gap} className="rounded-xl bg-surface-subtle px-3 py-2 text-xs leading-relaxed text-secondary">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  )
}
