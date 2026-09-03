# Dataset Training & Evaluation Strategy

**Repository:** HQD-Net  
**Date:** 2026-09-03  

---

## Strategy Overview

To maintain scientific integrity and respect non-negotiable hardware constraints (~7.8 GB RAM, CPU execution), all dataset preprocessing, model training, and evaluation run strictly **sequentially**.

---

## 1. ECG Dataset Strategy

- **Purpose:** Provide a dedicated ECG/signal modality branch for HQD-Net.
- **Data Type:** `ECG_WAVEFORM` (2,000 continuous 12-lead signal recordings of shape `[12, 5000]`).
- **Preprocessing:** Per-lead bandpass signal filtering, z-score normalization, and temporal downsampling.
- **Split Strategy:** 70% Train (1,400), 15% Val (300), 15% Test (300). Saved to `data/splits/ecg_*.csv`.
- **Model Architecture:** Compact 1D ResNet Encoder + 27-class multilabel Linear Classifier head.
- **Training Configuration:** Adam optimizer, Binary Cross-Entropy with Logits loss, Batch size 32, 5 epochs, CPU execution.
- **Artifacts:** `models/ecg/` (`encoder.pth`, `classifier.pth`, `metrics.json`, `preprocessing.pkl`).
- **Deterministic Handoff Interface:** Exposes a 32D `ECG_Embedding` vector, mapped via `projector.py` into HQD-Net's exact 10D quantum input space.
- **Exact Status:** **REAL_TRAINED**

---

## 2. Disease Prediction Strategy

- **Purpose:** Serve as a secondary classical multi-disease symptom benchmark (separate from the primary CVD dataset).
- **Data Type:** Tabular binary symptom matrix (132 features, 41 target disease classes).
- **Preprocessing:** Dropping null trailing columns, deduplication, feature index standardization.
- **Split Strategy:** 70% Train, 15% Val, 15% Test stratified splits. Saved to `data/splits/disease_prediction_*.csv`.
- **Models Trained:** Logistic Regression, Random Forest, HistGradientBoosting, Support Vector Machine (SVM).
- **Training Configuration:** CPU sequential fitting using scikit-learn.
- **Metrics:** Accuracy, Macro Precision, Macro Recall, Macro F1, Weighted F1, Confusion Matrix.
- **Artifacts:** `models/classical/disease_prediction/` (`logistic.pkl`, `random_forest.pkl`, `hist_gb.pkl`, `svm.pkl`, `metrics.json`).
- **Exact Status:** **REAL_TRAINED**

---

## 3. LLM Diagnostic Reasoning Strategy

- **Purpose:** Evaluate the impact of HQD-Net evidence grounding on LLM medical diagnostic reasoning.
- **Data Type:** Medical LLM diagnostic performance trial benchmark dataset.
- **Role:** **EVALUATION_ONLY**. No fine-tuning performed on MediPhi or local LLMs.
- **Evaluation Pipeline:**
  - Compare Baseline LLM reasoning vs. HQD-Net Evidence-Guided LLM reasoning.
  - Inject validated 10D quantum latent $z$, prediction probability, and QuXAI attributions into the clinical prompt.
- **Artifacts:** `models/llm_reasoning_evaluation/` (`evaluation_config.json`, `metrics.json`, `prompts/`, `outputs/`).
- **Exact Status:** **EVALUATION_ONLY**

---

## 4. Noisy Medical Document OCR Strategy

- **Purpose:** Test scanned medical document ingestion, OCR extraction, text cleanup, and structured Common Patient Model (CPM) mapping.
- **Data Type:** 1,000 synthetic noisy medical document images (500 bills, 500 discharge summaries) with JSON ground truth.
- **Preprocessing & OCR Pipeline:** Image grayscale/denoising $\rightarrow$ OCR extraction / Regex fallback $\rightarrow$ Normalized Entity Parser $\rightarrow$ CPM schema.
- **Metrics:** Character Error Rate (CER), Word Error Rate (WER), Key Field Extraction Accuracy.
- **Artifacts:** `models/ocr/` (`preprocessing_config.json`, `metrics.json`, `evaluation_manifest.json`).
- **Exact Status:** **REAL_TRAINED** (Evaluated Pipeline)

---

## 5. Multimodal Integration & Quantum Handoff Strategy

- **Patient Pairing Status:** **NO GENUINE PATIENT-LEVEL PAIRED DATA EXISTS** across the 4 datasets.
- **Integrity Enforcement:**
  - No synthetic pairing by row index or random assignment is performed.
  - Multimodal Supervised Training is **NOT** performed.
  - Multimodal VQC Status: `MULTIMODAL_VQC_STATUS = NOT_TRAINED_NO_PAIRED_DATA`.
- **Interface Verification:**
  - The unified 10D multimodal fusion interface (`classical_preprocessing/unified_projection/fusion.py`) is verified (`MULTIMODAL_FUSION_INTERFACE_READY`).
  - Strict 10-Dimensional handoff ($z_1 \dots z_{10}$) to the protected quantum core is validated.
