# HQD-Net: Hybrid Quantum-Classical Diagnostic Network

A cutting-edge quantum-classical hybrid machine learning framework for medical diagnosis and biomarker analysis.

## Project Overview

HQD-Net integrates quantum computing (via PennyLane) with classical deep learning to create interpretable diagnostic models. The system combines:

- **Quantum Core**: Variational Quantum Classifiers (VQC) and Quantum Support Vector Machines (QSVM)
- **Classical Preprocessing**: Feature engineering and normalization
- **Explainability Engine**: Input Jacobian sensitivity analysis for biomarker interpretation
- **Benchmarking Suite**: Comparative evaluation against classical baselines (SVM, Random Forest)
- **Hardware Staging**: Noise simulation for real quantum device compatibility

## Project Structure

```
hqd-net/
├── quantum_core/
│   ├── hqd_quantum.py          # Core VQC implementation
│   ├── qsvm_backend.py         # Quantum kernel-based SVM
│   ├── training_loop.py        # VQC training pipeline
│   ├── dataset_loader.py       # Clinical data ingestion
│   ├── benchmark.py            # Classical baseline comparisons
│   └── hardware_staging.py     # Noise modeling & hardware compatibility
├── explainability/
│   └── explainability.py       # Quantum feature sensitivity analysis
├── classical_preprocessing/    # Feature engineering utilities
├── frontend/                   # UI/visualization (optional)
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

## Installation

### Prerequisites

- Python 3.14+
- pip package manager

### Setup

1. **Clone the repository:**
   ```bash
   cd C:\Users\jonna\OneDrive\Desktop\hqd-net
   ```

2. **Install dependencies:**
   ```bash
   python -m pip install -r requirements.txt
   ```

3. **Optional: Set up a virtual environment**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # On Windows
   pip install -r requirements.txt
   ```

## Key Dependencies

- **PennyLane** (0.45.1): Quantum computing framework
- **PyTorch** (2.13.0): Deep learning backend
- **Scikit-learn** (1.9.0): Classical ML baselines
- **NumPy** (2.5.2): Numerical computing
- **Qiskit** (2.5.2): Hardware abstraction layer

## Usage

### 1. Train Quantum Variational Classifier

```bash
python quantum_core/training_loop.py
```

**Output:**
```
--- VQC Training with Real Clinical Data ---
Epoch 1/10 | Training Loss: 0.7101
...
VQC Test Accuracy: 46.25%
```

### 2. Run Classical Baseline Benchmarks

```bash
python quantum_core/benchmark.py
```

**Output:**
```
--- Classical Baseline Benchmarks ---
Standard SVM  | Accuracy: 87.50% | ROC-AUC: 0.9680
Random Forest | Accuracy: 91.25% | ROC-AUC: 0.9773
```

### 3. Evaluate Hardware Noise Resilience

```bash
python quantum_core/hardware_staging.py
```

**Output:**
```
--- Noisy Hardware Staging Inference ---
PennyLane (Default Mixed Device) with Depolarizing Noise:
Qubit Expectation Outputs: [0.5912, 0.3675, 0.5382, 0.4273]
```

### 4. Compute Feature Explainability

```bash
python explainability/explainability.py
```

**Output:**
```
======================================================================
QUANTUM EXPLAINABILITY ENGINE: Input Feature Sensitivity Analysis
======================================================================

--- Patient 1 ---
Clinical Features: [0.25 -1.05  0.80  0.15]
True Risk Label: High Risk

Feature Importance Ranking (Jacobian-based sensitivity):
  1. Biomarker A: 0.2451
  2. Biomarker C: 0.1823
  3. Biomarker B: 0.0912
  4. Biomarker D: 0.0334
```

## Dataset Specification

The `dataset_loader.py` module generates synthetic clinical data matching real biomedical characteristics:

- **Sample Size**: Configurable (default 400 training + 100 test)
- **Features**: 4 clinical biomarkers, normalized via StandardScaler
- **Classes**: Binary classification (Low Risk vs. High Risk)
- **Data Split**: 80% training, 20% testing

### Load Custom Data

```python
from quantum_core.dataset_loader import load_clinical_data

X_train, X_test, y_train, y_test = load_clinical_data(
    n_samples=500,
    n_features=4
)
```

## Quantum Architecture

### Variational Quantum Classifier (VQC)

- **Encoding**: Angle Embedding with Y-rotation gates
- **Ansatz**: Strongly Entangling Layers (2 layers × 4 qubits × 3 rotations)
- **Readout**: Pauli-Z expectation values
- **Optimization**: Adam optimizer, parameter-shift gradient rule

### Quantum Kernel SVM (QSVM)

- **Kernel**: Bhattacharyya fidelity between quantum state probability distributions
- **Classifier**: Scikit-learn precomputed SVC
- **Scaling**: No. of training samples

## Explainability Method

The quantum explainability engine computes the Jacobian of quantum expectation values with respect to input biomarkers:

$$\mathcal{J} = \frac{\partial \langle \psi(\mathbf{x}) | \sigma_z | \psi(\mathbf{x}) \rangle}{\partial \mathbf{x}}$$

This reveals which clinical features most strongly influence the model's risk predictions.

## Noise Modeling

Hardware staging simulates realistic quantum device errors:

- **Noise Type**: Depolarizing channel (1% per qubit per gate)
- **Device**: PennyLane default.mixed simulator
- **Optional**: Qiskit Aer with customizable noise profiles

## Git Workflow

### Initial Commit

```bash
cd C:\Users\jonna\OneDrive\Desktop\hqd-net
git add quantum_core/ explainability/ requirements.txt README.md
git commit -m "feat: complete quantum core VQC, QSVM, benchmarking, and hardware noise simulation modules"
```

### Configure Remote & Push

```bash
git remote add origin https://github.com/your-username/hqd-net.git
git branch -M main
git push -u origin main
```

## MerMED Model Setup

HQD-Net optionally uses the pretrained **MerMED ViT-B/16** medical imaging model.

The MerMED model weights are approximately 1.6 GB and are therefore **not stored inside this GitHub repository**.

Before running HQD-Net with MerMED enabled, download the official pretrained checkpoint from:

**Hugging Face:** `youngzhou12/MerMED`

The required file is:

```text
MerMED.pth
```

After downloading, place it at:

```text
weights/MerMED.pth
```

The expected project structure is:

```text
HQD-Net/
├── weights/
│   └── MerMED.pth
├── classical_preprocessing/
├── quantum_core/
├── tests/
└── ...
```

### Recommended Setup Order

Run the project in this order:

```text
1. Clone the HQD-Net repository
2. Install the project dependencies
3. Download the official MerMED.pth checkpoint from Hugging Face
4. Place MerMED.pth inside the weights/ directory
5. Run the project/tests
```

### Checkpoint Verification

The expected SHA-256 checksum of the verified checkpoint is:

```text
e7ba97b9328352a705b30e54133e2cfb7e62a6e980f2d6f730033e938380f0a0
```

Users can verify the downloaded file with:

```bash
python -c "import hashlib; print(hashlib.sha256(open('weights/MerMED.pth','rb').read()).hexdigest())"
```

The printed hash should match:

```text
e7ba97b9328352a705b30e54133e2cfb7e62a6e980f2d6f730033e938380f0a0
```

### Important

If `weights/MerMED.pth` is missing while MerMED is enabled, HQD-Net should report a clear checkpoint-not-found error.

Do **not** introduce a random or substitute model fallback.

MerMED remains an optional/additive imaging representation model and does not replace the existing TorchXRayVision pipeline.

## Performance Benchmarks

| Model | Accuracy | ROC-AUC | Training Time |
|-------|----------|---------|---------------|
| Classical SVM | 87.50% | 0.9680 | Fast |
| Random Forest | 91.25% | 0.9773 | Fast |
| Quantum VQC | 46.25% | ~0.50 | Slow (NISQ) |

*Note: Quantum performance on NISQ devices improves with larger datasets and longer training.*

## Phase 8 — Medical Knowledge Ingestion & RAG Hardening

HQD-Net incorporates a provenance-aware, multi-stage medical retrieval engine downstream of the quantum VQC pipeline:

- **Source Registry (`knowledge_base/source_registry.json`)**: Manages verified literature providers, classifying evidence into `VERIFIED_PRIMARY` (NIH/PubMed Central, NCBI), `VERIFIED_SECONDARY` (WHO Clinical Guidance), and `DEMO_SYNTHETIC`.
- **3-Stage Retrieval Pipeline**: BM25 Candidate Recall (top 20) $\to$ Reranking (configurable via `RERANKER_MODE`: `heuristic`, `semantic`, `neural`, `identity`) $\to$ Top-K Selection.
- **Provenance & Citation Validation**: Strict evidence citation validation (`[E1]`, `[E2]`) ensuring LLM narratives never invent citations, PMIDs, or out-of-bounds tags (`[E99]`).
- **Clinical Safety Boundary**: Quantum risk scores, verdicts, and QuXAI Jacobian attributions are strictly pipeline-derived and immutable.

### Medical Disclaimer
*HQD-Net is a decision-support research application. Final diagnostic authority remains solely with attending licensed medical practitioners.*

## Local Clinical LLM Integration — Microsoft MediPhi-Instruct

HQD-Net supports **Microsoft MediPhi-Instruct (`microsoft/MediPhi-Instruct`)** as a local, evidence-grounded clinical language generation layer:

- **Lazy Loading**: `MediPhiLLMProvider` initializes tokenizer and model parameters lazily on the first generation request to prevent memory overhead during import or UI launch.
- **Provider Abstraction**: Implements the `ClinicalLLM` contract and can be configured via environment variables:
  ```bash
  CLINICAL_LLM_PROVIDER=mediphi   # Options: "mock", "api", "mediphi"
  MEDIPHI_MODEL=microsoft/MediPhi-Instruct
  MEDIPHI_DEVICE=auto              # Options: "auto" (detects CUDA), "cuda", "cpu"
  ```
- **Zero-Telemetry Safety Contract**: The LLM consumes structured findings (`ClinicalLLMRequest`), structured evidence, and QuXAI biomarker attributions. It has zero access to raw 10-D latent vectors, variational angles ($\theta$), or quantum circuit parameters.
- **Authoritative Quantum Preservation**: Numerical diagnostic risk scores and verdicts originate strictly from the frozen 10-qubit VQC output and cannot be overridden by LLM narratives.

## Troubleshooting

### ImportError: No module named 'pennylane'
```bash
pip install -r requirements.txt
```

### Slow Quantum Circuit Execution
- Use `default.qubit.jax` device for faster classical simulation
- Reduce circuit depth for real hardware deployment

### CUDA/GPU Not Detected
- Ensure PyTorch is installed with correct CUDA version
- Fallback to CPU for development

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test thoroughly
3. Commit with descriptive messages
4. Submit a pull request to `main`

## License

[Add your license here - e.g., MIT, Apache 2.0]

## Contact

For questions or collaboration inquiries, contact: [your-email@example.com]

## References

- PennyLane Documentation: https://pennylane.readthedocs.io
- Qiskit Documentation: https://qiskit.org/documentation
- PyTorch Documentation: https://pytorch.org/docs
