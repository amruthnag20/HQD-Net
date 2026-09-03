import type { QuantumCircuitMetadata } from '../types/quantumMl'

/** Every value below is cited to a real source read during the Phase 3B
 *  repository audit — nothing here is invented or estimated.
 *
 *  - qubits, ansatz, encoding, simulator: quantum_core/hqd_quantum.py
 *    (n_qubits=10; qml.AngleEmbedding(..., rotation='Y');
 *    qml.StronglyEntanglingLayers; qml.device("default.qubit", wires=10))
 *  - layers=2: read directly from quantum_core/vqc_model_weights.pth via
 *    `torch.load(...)["q_layer.weights"].shape` == (2, 10, 3) — verified
 *    with a read-only inspection (no pennylane needed to read tensor
 *    shapes), consistent with training_loop.py's DressedVQC(n_layers=2)
 *    and train_vqc_on_csv.py's DressedVQC(n_layers=2).double().
 *  - checkpointPath: the exact path quantum_core/hqd_quantum.py's callers
 *    (classical_preprocessing/quantum_handoff/adapter.py) load from.
 *  - QUANTUM_INPUT_DIMENSION=10: classical_preprocessing/constants.py's
 *    QUANTUM_INPUT_DIM, matching hqd_quantum.py's n_qubits. */
export const QUANTUM_CIRCUIT_METADATA: QuantumCircuitMetadata = {
  modelType: 'dressed-vqc',
  qubits: 10,
  layers: 2,
  ansatz: 'StronglyEntanglingLayers',
  encoding: 'AngleEmbedding (Y-rotation)',
  simulator: 'PennyLane default.qubit (local simulator)',
  checkpointPath: 'quantum_core/vqc_model_weights.pth',
  checkpointConfirmedInAudit: true,
}

export const QUANTUM_INPUT_DIMENSION = 10

/** The date this repository audit was performed (Phase 3B). Static — this
 *  is not a live timestamp, since nothing here re-runs the audit. */
export const QUANTUM_AUDIT_DATE = '2026-09-03'

/** The two independent, real gaps found during the audit — neither is a
 *  simple "wire up an API call" fix, and neither should be worked around
 *  by inventing a substitute here. */
export const INTEGRATION_GAPS: string[] = [
  'No HTTP/service boundary exposes the quantum model to a browser — the only existing caller (engine_controller.py, via a Streamlit script) invokes it in-process in Python, not over a network the frontend could reach.',
  "The classical→10-D projection this model requires (classical_preprocessing/unified_projection's Stage 8 Unified10DProjector) is a trainable component that must be fit before use, and no fitted instance is saved anywhere in the repository — only the VQC's own weights (quantum_core/vqc_model_weights.pth) are persisted.",
  'PennyLane (required to execute the quantum circuit itself) is not installed in this environment — confirmed via `pip show pennylane`.',
]
