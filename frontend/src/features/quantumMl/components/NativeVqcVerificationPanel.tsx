import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, RefreshCw, Zap, ShieldAlert } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import {
  checkQuantumBackend,
  runNativeVqcVerification,
  type NativeQuantumPredictResponse,
} from '../api/quantumApi'

export function NativeVqcVerificationPanel() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [rowIndex, setRowIndex] = useState<number>(0)
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  const [result, setResult] = useState<NativeQuantumPredictResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheckConnection = async () => {
    setBackendStatus('checking')
    setError(null)
    try {
      await checkQuantumBackend()
      setBackendStatus('online')
    } catch {
      setBackendStatus('offline')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function initialCheck() {
      try {
        await checkQuantumBackend()
        if (!cancelled) setBackendStatus('online')
      } catch {
        if (!cancelled) setBackendStatus('offline')
      }
    }
    void initialCheck()
    return () => {
      cancelled = true
    }
  }, [])

  const handleRunVerification = async () => {
    setIsExecuting(true)
    setError(null)
    setResult(null)

    try {
      const resp = await runNativeVqcVerification(rowIndex)
      setResult(resp)
      setBackendStatus('online')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Quantum backend execution failed'
      setError(msg)
      if (msg.includes('health') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setBackendStatus('offline')
      }
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <Panel eyebrow="Technical verification" title="Native VQC verification (synthetic domain)">
      {/* Header status bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle pb-3">
        <div className="flex items-center gap-2">
          <Badge tone={backendStatus === 'online' ? 'success' : backendStatus === 'checking' ? 'neutral' : 'danger'}>
            {backendStatus === 'online' ? 'Backend online (:8000)' : backendStatus === 'checking' ? 'Checking backend…' : 'Backend offline'}
          </Badge>
          <span className="text-xs text-muted">PennyLane default.qubit · 10 wires</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleCheckConnection()}
          disabled={isExecuting || backendStatus === 'checking'}
          leftIcon={<RefreshCw className={`size-3 ${backendStatus === 'checking' ? 'animate-spin' : ''}`} />}
        >
          Check connection
        </Button>
      </div>

      {/* Scientific honesty disclaimer banner */}
      <div className="mb-4 rounded-xl bg-surface-subtle p-3.5">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="size-4 shrink-0 text-accent mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary">Synthetic training-domain model verification</p>
            <p className="text-xs leading-relaxed text-secondary">
              This panel executes the frozen <code className="font-mono font-semibold text-primary">DressedVQC</code> on
              its native 24-biomarker training dataset (
              <code className="font-mono text-primary">clinical_data_synthetic.csv</code>) using its exact recovered
              10-feature Random Forest contract and StandardScaler. This is a technical model verification, not a
              clinical patient prediction.
            </p>
          </div>
        </div>
      </div>

      {/* Execution controls */}
      <div className="mb-6 rounded-xl bg-surface-subtle p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs text-muted">Target dataset</div>
            <div className="font-mono text-xs font-semibold text-primary">clinical_data_synthetic.csv</div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Select patient:</span>
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setRowIndex(idx)}
                className={cn(
                  'h-7 rounded-full px-2.5 font-mono text-xs transition-colors',
                  rowIndex === idx
                    ? 'bg-accent text-accent-fg font-medium'
                    : 'bg-surface text-secondary hover:text-primary',
                )}
              >
                PAT_{1000 + idx} (Row {idx})
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="accent"
            size="md"
            onClick={() => void handleRunVerification()}
            disabled={isExecuting || backendStatus === 'offline'}
            loading={isExecuting}
            loadingText="Executing VQC in PennyLane…"
            leftIcon={<Zap className="size-4" />}
          >
            Run native VQC verification
          </Button>

          {backendStatus === 'offline' && (
            <span className="flex items-center gap-1.5 text-xs text-danger">
              <AlertCircle className="size-3.5" />
              Start standalone backend:{' '}
              <code className="font-mono text-primary">uvicorn backend.app.main:app --port 8000</code>
            </span>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-danger-muted p-3.5">
          <AlertCircle className="size-4 shrink-0 text-danger mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-danger">Quantum backend error</div>
            <p className="text-xs leading-relaxed text-secondary">{error}</p>
          </div>
        </div>
      )}

      {/* Real Quantum Result */}
      {result && (
        <div className="rounded-xl border border-accent/20 bg-surface p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-accent" />
              <span className="text-sm font-semibold text-primary">Real quantum inference output</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Patient:</span>
              <span className="font-mono text-xs font-semibold text-accent">{result.input.patient_id}</span>
              <Badge tone={result.prediction.class_label === 'Normal' ? 'success' : 'danger'}>
                {result.prediction.class_label}
              </Badge>
            </div>
          </div>

          {/* Probabilities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-subtle p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-secondary">Normal</span>
                <span className="font-mono text-sm font-semibold text-primary">
                  {(result.prediction.probabilities.Normal * 100).toFixed(2)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-subtle">
                <div
                  className="h-full rounded-full bg-success transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, result.prediction.probabilities.Normal * 100))}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl bg-surface-subtle p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-secondary">High Risk</span>
                <span className="font-mono text-sm font-semibold text-primary">
                  {(result.prediction.probabilities['High Risk'] * 100).toFixed(2)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-subtle">
                <div
                  className="h-full rounded-full bg-danger transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, result.prediction.probabilities['High Risk'] * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Model Telemetry */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-surface-subtle p-2.5">
              <div className="text-xs text-muted">Simulator</div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-primary">{result.quantum_telemetry.device}</div>
            </div>
            <div className="rounded-xl bg-surface-subtle p-2.5">
              <div className="text-xs text-muted">Qubits / wires</div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-primary">{result.model.wires}</div>
            </div>
            <div className="rounded-xl bg-surface-subtle p-2.5">
              <div className="text-xs text-muted">Ansatz layers</div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-primary">{result.model.layers}</div>
            </div>
            <div className="rounded-xl bg-surface-subtle p-2.5">
              <div className="text-xs text-muted">Precision</div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-primary">{result.quantum_telemetry.precision}</div>
            </div>
          </div>

          {/* Native VQC Input Features */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted">Native VQC input features (exact qubit mapping)</span>
              <span className="text-xs text-muted">Ordered by RF Gini importance</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {result.input.feature_names.map((name, idx) => (
                <div key={name} className="flex flex-col rounded-xl bg-surface-subtle px-2.5 py-2">
                  <span className="text-[10px] text-muted">Qubit {idx}</span>
                  <span className="font-mono text-xs font-medium text-primary">{name}</span>
                  <span className="mt-0.5 font-mono text-[11px] text-accent">
                    z = {result.input.standardized_vector[idx]?.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}
