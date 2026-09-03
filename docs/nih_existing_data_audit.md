# NIH Chest X-ray 14 Existing Data Audit

## Executive Summary
This document records the audit of the locally existing NIH Chest X-ray 14 dataset prior to and after partial dataset execution. As requested, no additional full-dataset download was initiated.

## 1. File & Storage Inventory
- **Dataset Path**: `data/raw/nih_chest_xray14/`
- **Total Images Found**: 651 `.png` files (224×224 resolution, 8-bit grayscale / alpha)
- **Total Image Storage**: 13.53 MB
- **Metadata File**: `data/raw/nih_chest_xray14/Data_Entry_2017.csv` (112,120 total dataset records, 8.26 MB)
- **Image Byte Index**: `data/raw/nih_chest_xray14/image_byte_index.json` (5.08 MB)

## 2. Validation & Quality Checks
- **TOTAL_FILES_FOUND**: 651
- **VALID_IMAGES**: 651
- **CORRUPTED_IMAGES**: 0
- **MISSING_METADATA**: 0
- **DUPLICATES**: 0
- **USABLE_IMAGES**: 651
- **UNIQUE_PATIENTS**: 167

## 3. Patient-Isolated Split Structure
The 651 locally available images map to 167 unique patients with strictly isolated patient assignment across splits:
- **Train Split**: 472 images (123 unique patients)
- **Validation Split**: 124 images (27 unique patients)
- **Test Split**: 55 images (17 unique patients)

### Patient Isolation Verification
- `train_patients ∩ val_patients`: 0 (Pass)
- `train_patients ∩ test_patients`: 0 (Pass)
- `val_patients ∩ test_patients`: 0 (Pass)

## 4. Assessment & Capacity
The locally available 651 images provide a valid, patient-isolated dataset for proof-of-pipeline training, MerMED 768-D representation extraction, lightweight head training, and 10-D quantum handoff verification.
