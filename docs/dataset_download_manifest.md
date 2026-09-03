# Dataset Download & Storage Manifest

## Overview
Tracking record of all local dataset raw files, embeddings, and provenance across HQD-Net.

## Registered Datasets

### 1. NIH Chest X-ray 14 (Partial Local Dataset)
- **Status**: `REAL_TRAINED`
- **Location**: `data/raw/nih_chest_xray14/`
- **Image Count**: 651 `.png` images (224×224)
- **Metadata**: `Data_Entry_2017.csv` (112,120 rows), `nih_cxr14_train.csv`, `nih_cxr14_val.csv`, `nih_cxr14_test.csv`
- **Cached Embeddings**: `data/embeddings/nih_cxr14_embeddings.pt` (768-D MerMED embeddings, 2.10 MB)
- **Manifest**: `data/embeddings/nih_cxr14_manifest.csv`
- **Provenience**: Downloaded partial subset. Further large archives strictly blocked as requested.

### 2. Medical Document OCR
- **Status**: `REAL_TRAINED` / `EVALUATED`
- **Location**: `data/raw/medical_document_ocr/`
- **Raw Images**: Cleaned up (0 images retained, 300.29 MB storage recovered)
- **Ground Truth Data**: `Data/medical_bills_ground_truth.csv`, `Data/discharge_summaries_ground_truth.csv`
- **Model Artifacts**: `models/ocr/preprocessing_config.json`, `models/ocr/metrics.json`, `models/ocr/evaluation_manifest.json`

### 3. Cardiovascular Disease Tabular (Cardio Train)
- **Status**: `REAL_TRAINED`
- **Location**: `data/raw/cardio_train.csv` (2.94 MB, 70,000 patient records)
- **Synthetic Fallback**: `clinical_data_synthetic.csv` (241.25 KB)

### 4. ECG Arrhythmia Dataset
- **Status**: `REAL_TRAINED`
- **Location**: `data/raw/ecg/` (1,000 synthetic 12-lead signal recordings)
- **Splits**: `data/splits/ecg_train.csv`, `data/splits/ecg_val.csv`, `data/splits/ecg_test.csv`
- **Model Artifact**: `models/ecg_1d_cnn.pth`

### 5. Medical Disease Prediction & LLM Reasoning
- **Status**: `REAL_TRAINED` / `EVALUATED`
- **Location**: `data/raw/disease_prediction/`, `data/raw/llm_reasoning/`
- **Model Artifacts**: `models/disease_prediction/`, `models/llm_reasoning/`
