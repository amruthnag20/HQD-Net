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

## Performance Benchmarks

| Model | Accuracy | ROC-AUC | Training Time |
|-------|----------|---------|---------------|
| Classical SVM | 87.50% | 0.9680 | Fast |
| Random Forest | 91.25% | 0.9773 | Fast |
| Quantum VQC | 46.25% | ~0.50 | Slow (NISQ) |

*Note: Quantum performance on NISQ devices improves with larger datasets and longer training.*

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
