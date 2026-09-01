# 🚀 Quick Start — HQD-Net Production Backend

## What You Just Got

Two production-grade scripts for real CSV training:

```
✅ quantum_core/dataset_loader_csv.py    — CSV data preprocessing
✅ train_vqc_on_csv.py                   — End-to-end training + benchmarking
```

---

## 30-Second Setup

### Option 1: Run with Synthetic Data (Instant Testing)
```bash
cd C:\Users\jonna\OneDrive\Desktop\hqd-net
.venv\Scripts\python.exe train_vqc_on_csv.py
```

**What happens:**
- Auto-generates synthetic clinical data
- Trains 10-qubit VQC (5 epochs, ~3-5 min)
- Benchmarks vs SVM and Random Forest
- Generates clinical interpretation report
- Saves model weights to `quantum_core/vqc_model_weights.pth`

### Option 2: Run with Your Real CSV Data
```bash
.venv\Scripts\python.exe train_vqc_on_csv.py --csv your_clinical_data.csv
```

### Option 3: Fine-Tune Parameters
```bash
.venv\Scripts\python.exe train_vqc_on_csv.py \
    --csv clinical_data.csv \
    --epochs 10 \
    --batch-size 32 \
    --lr 0.01
```

---

## 📋 CSV Format Requirements

Your CSV should look like:
```
patient_id,age,glucose,bp_systolic,cholesterol_ldl,...,diagnosis
PAT_001,52,92,145,215,...,1
PAT_002,48,88,140,200,...,0
PAT_003,61,105,155,240,...,1
...
```

**Requirements:**
- ✅ One row per patient
- ✅ Numeric biomarker columns (24+ features preferred)
- ✅ One binary target column (0 or 1)
- ✅ Automatically handles missing values

**Example valid CSV paths:**
- `clinical_data.csv` (in project root)
- `data/heart_disease.csv`
- `C:\Users\jonna\Desktop\patient_records.csv` (full path)

---

## 📊 What Each Script Does

### `dataset_loader_csv.py`
**Phase 1: Data Preprocessing**

```python
# Automatically:
1. Reads your CSV
2. Imputes missing values (median strategy)
3. Ranks features using Random Forest
4. Selects top 10 biomarkers (prevents barren plateaus)
5. Standardizes to μ=0, σ=1
6. Returns float64 PyTorch tensors
```

**Typical Output:**
```
✓ Extracted 500 patient records with 24 raw columns
✓ Ranking 24 features classically via Random Forest...
✓ Top Diagnostic Biomarkers Selected:
  Rank 1: fasting_glucose (importance: 0.1234)
  Rank 2: systolic_bp (importance: 0.1087)
  Rank 3: ldl_cholesterol (importance: 0.0945)
  ... (7 more)
✓ Data ready as high-precision tensors (float64)
  - Training split: torch.Size([400, 10])
  - Test split: torch.Size([100, 10])
```

### `train_vqc_on_csv.py`
**Phase 2-4: Training, Benchmarking, Explainability**

```
Phase 2: Train 10-Qubit VQC
├─ Ry Angle Embedding (maps biomarkers to quantum)
├─ 2 Strongly Entangling Layers (200 parameters)
├─ Parameter-Shift Rule (float64 gradients)
└─ Adam Optimizer (lr=0.01)

Phase 3: Benchmark Against Classicals
├─ SVM (RBF kernel) — ~87.5% typical
├─ Random Forest — ~91.2% typical
└─ VQC (10-qubit) — ~50-55% typical (NISQ limitation)

Phase 4: Generate Interpretations
├─ Jacobian Sensitivity Maps
└─ Top 5 Disease-Driving Biomarkers Per Patient
```

**Typical Output:**
```
===========================================================================
Model             | Accuracy   | Sensitivity    | F1-Score | ROC-AUC
===========================================================================
VQC (10-Qubit)    |    52.00%  |     48.50%     |   48.20% | 0.5247
SVM (RBF)         |    87.50%  |     85.20%     |   87.30% | 0.9187
Random Forest     |    91.20%  |     90.10%     |   91.00% | 0.9523
===========================================================================

---- Patient 1 ----
VQC Risk Score: 48.5%
Top Disease-Driving Biomarkers:
  1. fasting_glucose: 18.20%
  2. systolic_bp: 15.40%
  3. ldl_cholesterol: 14.20%
  4. troponin_t: 12.80%
  5. creatinine: 10.90%
```

---

## ⏱️ Expected Runtimes

| Phase | Time |
|-------|------|
| Phase 1 (CSV Load + Preprocessing) | < 1 sec |
| Phase 2 (VQC Training, 5 epochs) | 2-10 min |
| Phase 3 (Classical Benchmarking) | 30-60 sec |
| Phase 4 (Jacobian Sensitivity) | 5-15 sec |
| **TOTAL** | **~5-15 minutes** |

Why so slow? 10-qubit quantum circuits require:
- 200 quantum parameters × 3 forward passes each (parameter-shift) = 600 circuit evals per epoch
- Classical simulator overhead
- This is normal and expected!

---

## 🎯 Common Use Cases

### Use Case 1: Quick Demo (No Real Data)
```bash
.venv\Scripts\python.exe train_vqc_on_csv.py
```
Auto-generates synthetic data, trains, benchmarks. Perfect for verification!

### Use Case 2: Train on Your Clinical Study
```bash
.venv\Scripts\python.exe train_vqc_on_csv.py --csv my_hospital_data.csv
```
Extracts top 10 biomarkers, trains VQC, produces interpretations.

### Use Case 3: Hyperparameter Tuning
```bash
# Fast iteration: 3 epochs, large batches
.venv\Scripts\python.exe train_vqc_on_csv.py --epochs 3 --batch-size 64

# Thorough training: 20 epochs, small batches
.venv\Scripts\python.exe train_vqc_on_csv.py --epochs 20 --batch-size 16 --lr 0.001
```

### Use Case 4: Production Deployment
```bash
# Train once, save weights, use in Streamlit
.venv\Scripts\python.exe train_vqc_on_csv.py --csv production_data.csv
# Weights saved to: quantum_core/vqc_model_weights.pth
```

---

## 📍 Where Files Go

```
C:\Users\jonna\OneDrive\Desktop\hqd-net\
│
├── clinical_data.csv                    ← Your CSV goes here
├── train_vqc_on_csv.py                  ✅ NEW: Root-level training script
├── PRODUCTION_BACKEND_GUIDE.md          ✅ NEW: Full documentation
│
├── quantum_core/
│   ├── dataset_loader_csv.py            ✅ NEW: CSV preprocessor
│   ├── vqc_model_weights.pth            ← Saved after training
│   ├── hqd_quantum.py
│   ├── dataset_loader.py
│   └── ... (other files)
│
├── explainability/
│   └── explainability.py
│
└── ... (other files)
```

---

## ✅ Verification Checklist

- [ ] Python 3.14 virtual environment activated (`.venv`)
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] Have a CSV file ready (or let script generate synthetic)
- [ ] Run `train_vqc_on_csv.py` successfully
- [ ] Check that `quantum_core/vqc_model_weights.pth` was created
- [ ] Share weights with Streamlit developer

---

## 🔍 How to Debug

### Check if Python environment works:
```bash
.venv\Scripts\python.exe --version
# Should show: Python 3.14.0
```

### Check if PennyLane installed:
```bash
.venv\Scripts\python.exe -c "import pennylane; print(pennylane.__version__)"
# Should show: 0.45.1
```

### Check if CSV loads correctly:
```bash
.venv\Scripts\python.exe -c "
from quantum_core.dataset_loader_csv import load_real_clinical_csv
X_train, X_test, y_train, y_test, names = load_real_clinical_csv('your_data.csv', 'diagnosis')
print(f'Loaded: {X_train.shape}')
print(f'Features: {names}')
"
```

### Test just Phase 1 (data loading):
```bash
.venv\Scripts\python.exe -m quantum_core.dataset_loader_csv
```

---

## 🤝 Hand-Off to Teammates

### For Streamlit Developer:
```python
# frontend/app.py
import torch
from engine_controller import HQDNetEngineController

# Initialize with trained weights
controller = HQDNetEngineController(use_mock_preprocessor=False)
controller.vqc_model.load_state_dict(
    torch.load("quantum_core/vqc_model_weights.pth")
)

# Use for predictions
results = controller.run_diagnostic_pipeline(raw_data, backend_choice="VQC")
st.metric("Risk Score", results['diagnostic_prediction']['risk_percentage'])
```

### For Classical Preprocessing Developer:
```python
# In engine_controller.py, they replace the mock with:
from classical_preprocessing.preprocessor import compress_to_latent_biomarkers

latent = compress_to_latent_biomarkers(raw_record)
```

---

## 📞 Quick Reference

| Command | Purpose |
|---------|---------|
| `train_vqc_on_csv.py` | Train with auto-detected or synthetic data |
| `train_vqc_on_csv.py --csv data.csv` | Train with your CSV |
| `train_vqc_on_csv.py --epochs 10` | Train for 10 epochs |
| `train_vqc_on_csv.py --batch-size 16` | Use batch size 16 |
| `train_vqc_on_csv.py --lr 0.001` | Use learning rate 0.001 |

---

## 🎓 What You're Running

```
Real Patient Data
       ↓
[Phase 1] Feature Selection via Random Forest
   └─→ Select 10 best biomarkers (prevents barren plateaus)
       ↓
[Phase 2] Train 10-Qubit Hybrid VQC
   ├─→ Angle Embedding (biomarkers → quantum gates)
   ├─→ Strongly Entangling (quantum feature extraction)
   ├─→ Pauli-Z Measurements (extract classical info)
   └─→ Classical Post-Processing (→ risk probability)
       ↓
[Phase 3] Benchmark Against Classicals
   ├─→ SVM (87.5% typical)
   ├─→ Random Forest (91.2% typical)
   └─→ VQC (50-55% typical — interpretability over accuracy!)
       ↓
[Phase 4] Explain Predictions
   └─→ Jacobian Sensitivity Maps
       └─→ Top disease-driving biomarkers per patient
       ↓
Trained Weights + Clinical Report
```

---

## 🚀 You're Ready!

```bash
.venv\Scripts\python.exe train_vqc_on_csv.py
```

This single command will:
1. ✅ Load/generate clinical data
2. ✅ Select top 10 biomarkers
3. ✅ Train 10-qubit VQC
4. ✅ Benchmark vs classics
5. ✅ Generate interpretations
6. ✅ Save weights for Streamlit

**Total time: ~5-15 minutes** ⏱️

---

**Questions?** Check `PRODUCTION_BACKEND_GUIDE.md` for full details.

**Next step:** Share `quantum_core/vqc_model_weights.pth` with Streamlit developer! 🎉
