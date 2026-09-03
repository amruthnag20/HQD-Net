# Pre-Dataset Integration Repository Audit

**Date:** 2026-09-03  
**System Target:** HQD-Net Multimodal Diagnostic & Reasoning Framework  
**Environment:** Windows OS, ~7.8 GB RAM, Intel Integrated GPU (CPU-only PyTorch)

---

## 1. Executive Summary & Objective

This repository audit evaluates the existing HQD-Net codebase to prepare for integrating four new external datasets:
1. **ECG Dataset** (`julienrund/ecg-dataset`)
2. **Disease Prediction Using Machine Learning** (`kaushil268/disease-prediction-using-machine-learning`)
3. **LLM Influence on Medical Diagnostic Reasoning** (`patricklford/llm-influence-on-medical-diagnostic-reasoning`)
4. **Noisy Medical Document Images OCR** (`devp1866/noisy-medical-document-images-ocr`)

The NIH Chest X-ray dataset is explicitly excluded from this phase.

---

## 2. Reusable Repository Components

- **Quantum Core Execution Layer (`quantum_core/`)**:
  - `quantum_core/hqd_quantum.py`: Protected 10-qubit VQC interface and execution engine.
  - `quantum_core/qsvm_backend.py`: Protected QSVM feature map backend.
  - `quantum_core/dataset_loader_csv.py`: Lightweight CSV data loading and 10D projection adapter.
- **Classical Preprocessing & Feature Engineering (`classical_preprocessing/`)**:
  - `classical_preprocessing/tabular/pipeline.py`: Robust clinical tabular data handling, feature scaling, and feature selection.
  - `classical_preprocessing/unified_projection/projector.py`: Projection of arbitrary latent features into 10D quantum-ready vectors.
  - `classical_preprocessing/unified_projection/fusion.py`: Interface for multi-branch latent fusion into 10D quantum space.
  - `classical_preprocessing/clinical_intelligence/llm.py` & `api_contract.py`: Clinical LLM interaction framework (MediPhi integration).
- **Explainability & Attribution (`explainability/`)**:
  - `explainability/quxai.py`: Finite-difference Jacobian calculation engine for 10D VQC feature attribution.
- **Model Registry & Controller (`engine_controller.py`)**:
  - `engine_controller.py`: Centralized workflow orchestration and model registry interface.

---

## 3. Missing Components / New Additions Planned

To support the four incoming datasets while strictly maintaining architectural purity and hardware compliance, the following new modular files will be created:

1. **ECG Branch**:
   - `classical_preprocessing/ecg/`: Preprocessing module for ECG signals/images/features.
   - `training/train_ecg_model.py`: CPU-compatible model training/evaluation pipeline for ECG data.
2. **Disease Prediction Secondary Benchmark**:
   - `classical_preprocessing/disease_prediction/`: Data loader and custom feature preprocessing module for 42-disease symptom matrix.
   - `training/train_disease_prediction_models.py`: Sequential training runner for Logistic Regression, Random Forest, HistGradientBoosting, and SVM.
3. **LLM Diagnostic Reasoning Benchmark**:
   - `classical_preprocessing/llm_reasoning/`: Parsing and benchmarking framework for medical reasoning case studies.
   - `training/evaluate_llm_reasoning.py`: Evaluation pipeline comparing baseline LLM diagnostic accuracy vs. HQD-Net evidence-guided LLM reasoning.
4. **Medical Document OCR Pipeline**:
   - `classical_preprocessing/ocr/`: Preprocessing, OCR extraction, text normalization, and Common Patient Model mapping.
   - `training/evaluate_ocr_pipeline.py`: Synthetic medical document OCR evaluation script comparing ground truth JSON with OCR extractions.
5. **Documentation & Manifests**:
   - `docs/pre_dataset_integration_audit.md` (this report)
   - `docs/ecg_dataset_audit.md` & `docs/ecg_dataset_status.md`
   - `docs/disease_prediction_audit.md` & `docs/disease_prediction_benchmark.md`
   - `docs/llm_reasoning_dataset_audit.md`
   - `docs/ocr_dataset_audit.md`
   - `docs/dataset_download_manifest.md`
   - `docs/dataset_training_strategy.md`
   - `docs/model_registry.md`

---

## 4. Protected Files — Absolutely Immutable

The following core quantum files and controller scripts are marked as immutable. Their SHA256 hashes were verified prior to initiation and will be re-verified upon completion:

| File Path | Verified SHA256 Hash | Status |
| :--- | :--- | :--- |
| `quantum_core/hqd_quantum.py` | `ab3702865bbe78272d815aedea6072a504214c3052663dded3a011767b362465` | **PROTECTED / IMMUTABLE** |
| `quantum_core/qsvm_backend.py` | `b4766de27aa18b7f07ab5fa57e9a2a1e3290ee82a1f8db5574bfbb208a1b276e` | **PROTECTED / IMMUTABLE** |
| `quantum_core/vqc_model_weights.pth` | `73108e0e92480b98da073fbb36d4b80b99391bd7691e72bdccd188c685e9cb60` | **PROTECTED / IMMUTABLE** |
| `engine_controller.py` | `8cac75bb1f0b6459e1ff14b2e38fe8f516a46c232ce642b96d9a3f6c2e7e046e` | **PROTECTED / IMMUTABLE** |

Any newly trained quantum model or artifact will be saved in separate dedicated directories under `models/` without altering these existing files.

---

## 5. Expected Hardware Constraints & Strict Rules

- **RAM Limitation**: Max 7.8 GB system memory. All CSV loading and dataset operations will use chunking or streaming where appropriate.
- **Compute Limitation**: Intel integrated GPU / CPU-only PyTorch. Large deep vision models or heavy LLM fine-tuning are strictly prohibited.
- **Archive Size Cap**: No single archive exceeds 1.5 GB. (Current audited dataset sizes range from 32 KB to 459 MB, fully compliant).
- **Execution Order**: Sequential execution of all dataset preprocessing, model training, and evaluation pipelines to avoid memory leaks.
- **Integrity Rule**: No synthetic data generation or patient pairing fabrication. Unpaired modalities will be marked as `INTERFACE_ONLY` or `NOT_TRAINED_NO_PAIRED_DATA`.

---

## 6. Planned Execution Workflow

1. Download all 4 compliant dataset archives into `data/raw/<dataset_name>/`.
2. Inspect and extract downloaded contents.
3. Generate detailed dataset audit documentation for all 4 datasets.
4. Implement data loaders, preprocessing, train/val/test splits, and baseline models for ECG and Disease Prediction.
5. Implement evaluation framework for LLM Reasoning and Medical OCR.
6. Verify multimodal fusion interface without fabricating paired multimodal dataset training.
7. Execute unit and integration tests.
8. Re-verify protected SHA256 hashes and publish final integration report.
