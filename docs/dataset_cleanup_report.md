# HQD-Net Dataset & Storage Cleanup Report

## Executive Summary
This document records the safe cleanup of completed raw datasets and temporary files across the repository following the verification of all training artifacts and protected files.

## 1. Storage Statistics (Before vs. After)

| Metric | Before Cleanup | After Cleanup | Net Difference |
| :--- | :--- | :--- | :--- |
| **Raw OCR Photographs** | 1,000 images (300.29 MB) | 0 images | -1,000 files (-300.29 MB) |
| **OCR Ground Truth CSVs** | 2 files (1.26 MB) | 2 files (1.26 MB) | Retained (100% intact) |
| **OCR Model Artifacts** | `models/ocr/` (4 files) | `models/ocr/` (4 files) | Retained (100% intact) |
| **NIH Chest X-ray Images** | 651 PNG images (13.53 MB) | 651 PNG images (13.53 MB) | Retained (100% intact) |
| **NIH Embeddings & Manifest** | `data/embeddings/` (2.16 MB) | `data/embeddings/` (2.16 MB) | Created & Retained |
| **System Free Storage** | ~230.37 GB | ~230.67 GB | **+300.29 MB Freed** |

## 2. OCR Dataset Cleanup Details
- **Location**: `data/raw/medical_document_ocr/`
- **Files Removed**: 1,000 raw document photographs (`.jpg` / `.jpeg`) containing hospital bills and discharge summaries.
- **Rationale**: Pipeline evaluation and model artifacts in `models/ocr/` are complete. Ground truth CSVs (`medical_bills_ground_truth.csv` & `discharge_summaries_ground_truth.csv`) contain normalized JSON data required for ongoing test suites and reproducibility.
- **Verification**: `training/evaluate_ocr_pipeline.py` executes successfully using the retained ground truth CSVs.

## 3. Retained Core Artifacts & Safeguards
- **Protected Core Files**: Unmodified and verified byte-for-byte.
- **Active Checkpoints**: `models/nih_mermed_head.pth`, `weights/MerMED.pth`, `quantum_core/vqc_model_weights.pth`.
- **Active Metadata & CSVs**: All dataset splits, manifests, and ground truth files retained.
