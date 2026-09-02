# Phase 1 Classical Preprocessing Foundation & Quantum Input Contract

## 1. Purpose of Phase 1

Phase 1 provides the classical ingestion, validation, compression, and angle-projection architecture for the HQD-Net Sandwich Architecture. It prepares heterogeneous clinical inputs (tabular data, medical imaging, DICOM/NIfTI traces) into a validated, 10-dimensional, float64 representation bounded within $[-\pi, \pi]$ for handoff to the 10-qubit Quantum Core.

> **IMMUTABILITY GUARANTEE**: The existing Quantum Core (`quantum_core/hqd_quantum.py`, `quantum_core/qsvm_backend.py`, `quantum_core/vqc_model_weights.pth`) is **strictly immutable**. Phase 1 adapts all classical inputs to match the existing quantum model boundary, without modifying quantum circuit parameters or architecture.

---

## 2. Package Structure

```text
classical_preprocessing/
├── __init__.py
├── contracts.py
├── constants.py
├── router/
│   ├── __init__.py
│   └── input_router.py
├── tabular/
│   ├── __init__.py
│   ├── validator.py
│   ├── imputer.py
│   ├── encoder.py
│   └── pipeline.py
├── feature_selection/
│   ├── __init__.py
│   ├── config.py
│   ├── selector.py
│   ├── ranking.py
│   └── provenance.py
├── compression/
│   ├── __init__.py
│   ├── config.py
│   ├── tabular_compressor.py
│   └── evaluation.py
├── imaging_2d/
│   ├── __init__.py
│   ├── config.py
│   ├── validator.py
│   ├── preprocessing.py
│   ├── encoder.py
│   └── pipeline.py
├── imaging_3d/
│   ├── __init__.py
│   ├── config.py
│   ├── loader.py
│   ├── validator.py
│   ├── preprocessing.py
│   ├── encoder.py
│   └── pipeline.py
├── unified_projection/
│   ├── __init__.py
│   ├── config.py
│   ├── alignment.py
│   ├── fusion.py
│   ├── projector.py
│   └── evaluation.py
├── quantum_handoff/
│   ├── __init__.py
│   └── adapter.py
├── imaging/
│   └── __init__.py
├── projection/
│   ├── __init__.py
│   └── unified_projection.py
├── validation/
│   ├── __init__.py
│   └── contract_validator.py
└── README.md
```

---

## 3. Architecture Overview

```text
                           RAW CLINICAL DATA
                                  ↓
                           Stage 2 — Router
                                  ↓
              ┌───────────────────┼───────────────────┐
              ↓                   ↓                   ↓
          TABULAR             2D IMAGE            3D IMAGE
              ↓                   ↓                   ↓
          Stage 3             Stage 6             Stage 7
              ↓                   ↓                   ↓
          Stage 4          Image Embedding      Volume Embedding
              ↓                   ↓                   ↓
          Stage 5                 │                   │
              ↓                   │                   │
       Tabular Embedding           │                   │
              └────────────────────┼───────────────────┘
                                   ↓
                    Stage 8 — Unified Projection
                                   ↓
                         EXACTLY 10 DIMENSIONS (z ∈ R^10)
                                   ↓
                  Stage 9 — Quantum Handoff Adapter
                                   ↓
                  CANONICAL MAP: theta = pi * tanh(z)
                                   ↓
                     Stage 1 Quantum Contract
                                   ↓
                     EXISTING IMMUTABLE QUANTUM CORE (DressedVQC)
```

---

## 4. Stage 9 Quantum Handoff & Immutable Quantum Core Integration

The `QuantumHandoffAdapter` bridges Stage 8 classical 10-D representations ($z \in \mathbb{R}^{10}$) to the frozen, 10-qubit `DressedVQC` quantum core model (`quantum_core/hqd_quantum.py`).

### Key Features
- **Canonical Angle Transformation**: Applies $\theta = \pi \cdot \tanh(z)$ mapping real-valued 10-D latent vectors $z \in \mathbb{R}^{10}$ to rotation angles $\theta \in (-\pi, \pi)^{10}$.
- **Strict Non-Mutation**: Does NOT mutate caller input tensors in-place; creates explicit derived float64 tensors (`z.clone().detach().to(dtype=torch.float64)`).
- **Quantum Contract Validation**: Enforces exact shape checks (`(10,)` or `(B, 10)`), float64 dtype conversion, non-finite rejection (`NaN`/`Inf`), and range validation ($-\pi \le \theta \le \pi$) via Stage 1 contract `validate_quantum_input`. Zero silent clipping.
- **Frozen Quantum Execution**: Executes `DressedVQC` in evaluation mode (`with torch.no_grad():`) using pre-trained weights (`quantum_core/vqc_model_weights.pth`), returning validated class probability predictions of shape `(B, 2)`.

---

## 5. Current Implementation Scope

- **Stage 1**: Data contracts, constants, contract validator, projection utility.
- **Stage 2**: Input Router, format classification, extension handling, routing decisions.
- **Stage 3**: Tabular preprocessing, schema validator, imputer, categorical encoder, scaler pipeline.
- **Stage 4**: Multi-Signal Feature Selection (MI, L1, RF rank aggregation).
- **Stage 5**: Tabular Representation Compression (PCA baseline, variance target, reconstruction evaluation).
- **Stage 6**: 2D Medical Imaging Pipeline (Validation, deterministic preprocessor, PyTorch CNN encoder, batching, image latent output).
- **Stage 7**: 3D Volumetric Imaging Pipeline (NIfTI/DICOM loader, 3D validator, CT HU / MRI Z-score preprocessor, PyTorch 3D CNN encoder, volume latent output).
- **Stage 8**: Unified Multimodal 10-D Projection (Sample alignment, presence masking, PyTorch fusion network, PCA fallback, serialization, signal retention evaluation).
- **Stage 9**: Quantum Handoff Adapter ($\theta = \pi \cdot \tanh(z)$, float64 conversion, Stage 1 contract validation, frozen `DressedVQC` execution, probability output validation).

---

## 6. Deferred Work

- **Stage 10**: Comprehensive Phase 1 Pipeline Integration & End-to-End Test Verification.
