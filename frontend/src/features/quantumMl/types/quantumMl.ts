/** Phase 3B — Quantum ML branch. Integrates the EXISTING, frozen quantum
 *  model (quantum_core/hqd_quantum.py's DressedVQC, checkpoint at
 *  quantum_core/vqc_model_weights.pth) with the same ProcessedDataset
 *  Phase 2 hands to Classical ML. Unlike Phase 3A, no new model is built
 *  here — this only describes and connects to what already exists.
 *
 *  The repository audit (see lib/quantumModelFacts.ts) found no callable
 *  path from a browser to that model today: the Python quantum stack isn't
 *  installed in this environment, there is no HTTP/service boundary
 *  reaching it, and the classical→10-D projection step it requires
 *  (classical_preprocessing/unified_projection, Stage 8) has no fitted,
 *  reusable artifact saved anywhere in the repo. This module represents
 *  that state honestly rather than fabricating an execution. */

export type QuantumModelStatus =
  | 'idle'
  /** Phase 2 produced zero model-ready features — nothing to project. */
  | 'input-incompatible'
  /** The real, current state: the model and its architecture are known
   *  and documented, but nothing exists yet to actually call it from here. */
  | 'integration-pending'
  | 'ready'
  | 'executing'
  | 'complete'
  | 'error'

export type QuantumModelType = 'dressed-vqc'

/** Facts read directly from quantum_core/hqd_quantum.py and a read-only
 *  inspection of quantum_core/vqc_model_weights.pth's tensor shapes — never
 *  invented. See lib/quantumModelFacts.ts for the citation of each value. */
export type QuantumCircuitMetadata = {
  modelType: QuantumModelType
  qubits: number
  layers: number
  ansatz: string
  encoding: string
  simulator: string
  checkpointPath: string
  /** Confirmed present during the Phase 3B repository audit — a static
   *  fact from that audit, not something the browser can check at runtime. */
  checkpointConfirmedInAudit: boolean
}

export type QuantumModelMetadata = {
  auditedAt: string
  /** Human-readable summary of exactly why execution can't happen yet. */
  integrationGaps: string[]
}

export type QuantumMetrics = {
  accuracy: number
  precision: number
  recall: number
  f1: number
  rocAuc: number | null
}

/** Nullable throughout — never populated with a placeholder. A field is
 *  null because no real quantum execution has happened, not because a
 *  value was omitted by mistake. */
export type QuantumModelResult = {
  status: QuantumModelStatus
  statusMessage: string | null
  modelType: QuantumModelType | null
  featureCount: number
  featureNames: string[]
  quantumInputDimension: number
  quantumInputVector: number[] | null
  targetColumn: string | null
  prediction: string | null
  probabilities: number[] | null
  metrics: QuantumMetrics | null
  modelMetadata: QuantumModelMetadata | null
  quantumMetadata: QuantumCircuitMetadata | null
}
