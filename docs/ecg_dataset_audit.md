# Dataset 1 Audit Report — ECG Dataset

**Date:** 2026-09-03  
**Kaggle Source:** `julienrund/ecg-dataset` (derived from `nicolashoubouyan/ecg-data` / Zhen et al.)  
**License:** CC BY-NC-SA 4.0  

---

## 1. Metadata Audit

- **Archive File Name:** `ecg.zip`
- **Downloaded Archive Size:** 424.10 MB (444,704,515 bytes) (Compliant with < 1.5 GB rule)
- **Extracted File:** `data/raw/ecg/ecg_dataset.pt` (PyTorch format, 481.77 MB)
- **File Format:** PyTorch dataset (`.pt`) containing Python lists of sample dictionaries.
- **Classification:** **ECG_WAVEFORM** with metadata features and 27 multilabel diagnostic classes.

---

## 2. Dataset Specifications & Structure

- **Total Samples:** 2,000 ECG records.
- **Sample Structure (per dictionary entry):**
  - `'ecg'`: 12-lead raw continuous waveform tensor of shape `[12, 5000]` (float32). At standard 500 Hz sampling rate, this represents 10 seconds of 12-lead ECG.
  - `'features'`: 2 tabular metadata features (e.g. Age, Sex) of shape `[2]`.
  - `'label'`: Multilabel diagnostic target vector of shape `[27]` (binary multilabel indicators for 27 cardiac conditions).
- **Missing Values:** None in sample tensors.
- **Patient Identifiers:** Record indices 0..1999 (No explicit patient ID collision across records in this 2000-sample benchmark subset).

---

## 3. Preprocessing & Split Strategy

- **Splits:** 70% Train (1,400 samples), 15% Validation (300 samples), 15% Test (300 samples).
- **Split Artifacts:** `data/splits/ecg_train.csv`, `data/splits/ecg_val.csv`, `data/splits/ecg_test.csv` (mapping index to label/split).
- **Waveform Preprocessing:**
  - Bandpass filtering / baseline wander removal (per lead).
  - Per-record mean-std normalization.
  - Lead-wise temporal feature pooling / Compact 1D ResNet feature extraction.

---

## 4. Modeling Strategy & Deterministic Embedding Interface

- **Model Architecture:** Lightweight CPU-compatible 1D Convolutional Neural Network (Compact 1D ResNet).
- **Inputs:** `[Batch, 12, 5000]` 12-lead signal.
- **Outputs:**
  - Multilabel classification logits `[Batch, 27]`.
  - Deterministic 32-dimensional ECG latent representation (`ECG_Embedding`).
- **HQD-Net Integration Handoff:**
  - The 32D `ECG_Embedding` is exposed via a deterministic interface for unified projection into HQD-Net's exact 10-dimensional quantum latent space ($z_1 \dots z_{10}$).

---

## 5. Status & Hardware Feasibility

- **ECG_STATUS:** **REAL_TRAINED**
- **Hardware Compliance:** CPU execution (~2.1 min per training epoch). Memory efficient chunked batch processing (< 1.2 GB RAM footprint during training).
- **Model Storage:** Artifacts saved under `models/ecg/`.
