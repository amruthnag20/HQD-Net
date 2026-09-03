# Dataset 2 Audit Report — Disease Prediction Using Machine Learning

**Date:** 2026-09-03  
**Kaggle Source:** `kaushil268/disease-prediction-using-machine-learning`  
**License:** Open Database License (ODbL)  

---

## 1. Metadata & File Audit

- **Archive File Name:** `disease_prediction.zip`
- **Downloaded Archive Size:** 0.03 MB (30,490 bytes)
- **Extracted Files:**
  - `Training.csv`: 4,920 rows, 134 columns (including an trailing un-named null column).
  - `Testing.csv`: 42 rows, 133 columns.
- **Features:** 132 binary symptom features (0 or 1 indicator variables, e.g., `itching`, `skin_rash`, `continuous_sneezing`, `chills`, `joint_pain`).
- **Target Column:** `prognosis` (41 distinct disease categories, e.g., Fungal infection, GERD, Diabetes, Hypertension, Pneumonia, Heart attack).
- **Missing Values:** `Unnamed: 133` column in `Training.csv` contained 4,920 nulls and was dropped during ingestion. Zero missing values in symptom features.
- **Duplicate Rows:** `Training.csv` contains 4,616 duplicate rows (120 duplicate instances per disease class representing repeated synthetic symptom combinations).
- **Target Semantics:** Pure multi-disease symptom classification. **STRICTLY SEPARATE FROM HQD-NET CVD DATASET**. No merging or cross-dataset contamination.

---

## 2. Preprocessing & Clean Dataset Creation

- **Handling Duplicates & Leakage:** Deduplication applied for fair train/val/test evaluation, while maintaining stratified representation across all 41 diseases.
- **Splits Created:**
  - `data/splits/disease_prediction_train.csv` (70% stratified split)
  - `data/splits/disease_prediction_val.csv` (15% stratified split)
  - `data/splits/disease_prediction_test.csv` (15% stratified split)
- **Feature Pipeline:**
  - Binary symptom indicator encoding.
  - Standardized feature index mapping (`preprocessing.pkl`).

---

## 3. Modeling Strategy (Secondary Benchmark)

- Sequential training of classical CPU-compatible classifiers:
  1. **Logistic Regression** (L2 penalty, multinomial solver)
  2. **Random Forest** (100 estimators, max depth 15)
  3. **HistGradientBoostingClassifier** (max iterations 100)
  4. **Support Vector Machine (SVM)** (RBF kernel, probability estimation enabled)
- **Target Evaluation Metrics:** Accuracy, Macro Precision, Macro Recall, Macro F1, Weighted F1, and per-class metrics.

---

## 4. Hardware Feasibility & Limitations

- **Feasibility:** High. Minimal RAM footprint (< 50 MB) and rapid CPU execution (< 30 seconds for full pipeline).
- **Model Storage:** Saved under `models/classical/disease_prediction/`.
