import { Cpu, Terminal } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import type { ModelOutputSummary } from '../types/modelComparison'

export type ComputationalProfileProps = {
  classical: ModelOutputSummary | null
  quantum: ModelOutputSummary | null
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-primary">{value}</span>
    </div>
  )
}

export function ComputationalProfile({ classical, quantum }: ComputationalProfileProps) {
  return (
    <Panel eyebrow="Execution telemetry" title="Computational profile">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-line-subtle bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-line-subtle pb-2.5 text-sm font-semibold text-primary">
            <Terminal className="size-4 text-accent" />
            <span>Classical runtime profile</span>
          </div>

          {classical ? (
            <div className="space-y-2">
              <Row label="Model algorithm" value={classical.modelType} />
              <Row label="Execution engine" value={classical.computationalMetadata.framework} />
              <Row label="Environment" value={classical.computationalMetadata.executionEnvironment} />
              <Row label="Precision" value={classical.computationalMetadata.numericPrecision} />
              <Row label="Input features" value={`${classical.featureCount} dimensions`} />
            </div>
          ) : (
            <p className="text-sm italic text-muted">Classical execution profile unavailable.</p>
          )}
        </div>

        <div className="rounded-xl border border-line-subtle bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-line-subtle pb-2.5 text-sm font-semibold text-primary">
            <Cpu className="size-4 text-accent" />
            <span>Quantum VQC runtime profile</span>
          </div>

          {quantum ? (
            <div className="space-y-2">
              <Row label="Ansatz architecture" value="StronglyEntanglingLayers" />
              <Row label="Circuit qubits" value={`${quantum.computationalMetadata.qubits ?? 10} wires`} />
              <Row label="Variational layers" value={`${quantum.computationalMetadata.layers ?? 2} layers`} />
              <Row label="Simulator" value={quantum.computationalMetadata.device ?? 'default.qubit'} />
              <Row label="Framework" value={quantum.computationalMetadata.framework} />
              <Row label="State vector precision" value={quantum.computationalMetadata.numericPrecision} />
            </div>
          ) : (
            <p className="text-sm italic text-muted">Quantum execution profile unavailable.</p>
          )}
        </div>
      </div>
    </Panel>
  )
}
