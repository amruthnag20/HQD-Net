# Dataset 2 Benchmark Report — Disease Prediction Using Machine Learning

**Date:** 2026-09-03  
**Target:** 41-Disease Symptom Classification Benchmark  
**Dataset Source:** `kaushil268/disease-prediction-using-machine-learning`  
**Separation Warning:** **THIS DATASET IS A SECONDARY BENCHMARK AND WAS NOT MERGED WITH THE HQD-NET CVD DATASET.**

---

## 1. Executive Summary

A clean, reproducible 70/15/15 stratified split was generated from the 4,920 row x 132 symptom feature matrix. Four classical CPU-compatible baseline models were fitted sequentially and evaluated on the held-out test set ($N=738$).

---

## 2. Test Set Benchmark Results ($N=738$)

| Model | Accuracy | Macro Precision | Macro Recall | Macro F1 | Weighted F1 | Model Artifact Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Logistic Regression** | **1.0000** | 1.0000 | 1.0000 | **1.0000** | 1.0000 | `models/classical/disease_prediction/logistic.pkl` |
| **Random Forest** | **1.0000** | 1.0000 | 1.0000 | **1.0000** | 1.0000 | `models/classical/disease_prediction/random_forest.pkl` |
| **HistGradientBoosting** | **1.0000** | 1.0000 | 1.0000 | **1.0000** | 1.0000 | `models/classical/disease_prediction/hist_gb.pkl` |
| **Support Vector Machine (SVM)** | **1.0000** | 1.0000 | 1.0000 | **1.0000** | 1.0000 | `models/classical/disease_prediction/svm.pkl` |

---

## 3. Important Methodological Notes & Dataset Caveats

- **Synthetic Symptom Determinism:** The dataset contains synthetic rule-based symptom mapping where each disease exhibits perfectly deterministic binary symptom signatures.
- **Duplicate Rows:** The raw dataset contained 4,616 duplicate symptom combinations. The 70/15/15 stratified train/val/test split ensured equal representation per class.
- **Clinical Scope:** This secondary benchmark validates the operational correctness of HQD-Net's classical preprocessing and multiclass classifier evaluation pipeline. **These perfect metrics reflect synthetic rules and MUST NOT be interpreted as real-world clinical diagnostic accuracy.**
