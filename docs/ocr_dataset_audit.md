# Dataset 4 Audit Report — Noisy Medical Document Images (OCR)

**Date:** 2026-09-03  
**Kaggle Source:** `devp1866/noisy-medical-document-images-ocr`  
**License:** CC BY-SA 4.0  

---

## 1. Metadata & File Audit

- **Archive File Name:** `medical_document_ocr.zip`
- **Downloaded Archive Size:** 222.13 MB (232,922,397 bytes) (Compliant with < 1.5 GB rule)
- **Extracted Structure:**
  - `Data/bills/`: 500 noisy medical bill JPEG images (`med_doc_bill_100001_noisy.jpg` to `100500`).
  - `Data/discharge_summaries/`: 500 noisy discharge summary JPEG images (`med_doc_discharge_summary_200001_noisy.jpg` to `200500`).
  - `Data/medical_bills_ground_truth.csv`: 500 rows with image filename, document_type, and structured JSON ground truth string.
  - `Data/discharge_summaries_ground_truth.csv`: 500 rows with image filename, document_type, and structured JSON ground truth string.
- **Classification:** **OCR_DOCUMENT_DATA** (Synthetic noisy medical documents for OCR testing).
- **Synthetic Data Disclaimer:** Explicitly categorized as synthetic document images for OCR benchmark evaluation.

---

## 2. Ingestion & Preprocessing Pipeline

- **Document Pipeline Architecture:**
  Noisy Document Image $\rightarrow$ Grayscale conversion & Denoising Filter $\rightarrow$ OCR Extraction (pytesseract Engine with fallback) $\rightarrow$ Text Normalization $\rightarrow$ Structured Entity Extraction $\rightarrow$ Common Patient Model (CPM) mapping.
- **Evaluated OCR Metrics:**
  - Character Error Rate (CER) / Word Error Rate (WER).
  - Key Field Extraction Accuracy (Hospital Name, Patient Name, Admission Date, Total Amount / Diagnosis).
  - Exact JSON Field Match & String Similarity.

---

## 3. Hardware & Dependency Assessment

- **Environment Note:** If system `tesseract-ocr` binary is absent, the pipeline executes deterministic regex pattern extraction and fallback normalization, marking OCR Engine status appropriately (`SYSTEM_TESSERACT_OPTIONAL`).
- **RAM Footprint:** Low (< 300 MB when processing images sequentially).
- **Artifact Location:** `models/ocr/`.
