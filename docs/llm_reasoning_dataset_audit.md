# Dataset 3 Audit Report — LLM Influence on Medical Diagnostic Reasoning

**Date:** 2026-09-03  
**Kaggle Source:** `patricklford/llm-influence-on-medical-diagnostic-reasoning`  
**License:** CC0: Public Domain  

---

## 1. Metadata & File Audit

- **Archive File Name:** `llm_reasoning.zip`
- **Downloaded Archive Size:** 0.01 MB (9,033 bytes)
- **Extracted Files:**
  - `df.csv`: Summary statistics comparing LLM-assisted vs conventional physician diagnostic performance.
  - `diagnostic_performance_data.csv`: Aggregate group score comparison (Group: With LLM vs Conventional Resources).
  - `experience_data.csv`: Diagnostic scores partitioned by years of physician experience.
  - `score_data.csv`: 200 individual physician case trial diagnostic scores across 2 experimental cohorts.
  - `subgroup_data.csv` & `time_subgroup_data.csv`: Subgroup diagnostic accuracy and diagnostic time metrics.
- **Classification:** **EVALUATION_ONLY** statistical study dataset.
- **Suitability Assessment:**
  - Contains no raw text case prompts, medical histories, or LLM generation transcripts.
  - Contains quantitative trial performance scores evaluating human clinician diagnostic reasoning when assisted by LLMs.
  - **Not suitable for Supervised Fine-Tuning (SFT)** or model training.
  - **Selected Role:** **EVALUATION_ONLY** benchmark for evaluating LLM reasoning impact and evidence grounding.

---

## 2. HQD-Net Reasoning Evaluation Framework

- **Architecture:**
  - **Baseline:** Direct medical query / case $\rightarrow$ MediPhi LLM $\rightarrow$ Diagnostic reasoning response.
  - **HQD-Net-Assisted:** Direct medical query / case + HQD-Net Structured Evidence (10D Latent vector $z$, VQC prediction $P(CVD)$, QuXAI top-3 feature attributions) $\rightarrow$ MediPhi LLM $\rightarrow$ Grounded reasoning response.
- **Authoritative Rule:**
  - The HQD-Net model output (VQC / classical probability) is the **authoritative prediction**.
  - The LLM acts purely as a clinical translation and reasoning layer.
  - No raw quantum circuit internals or raw tensors are exposed to the LLM.

---

## 3. Hardware & Fine-Tuning Decision

- **Fine-Tuning Restriction:** SFT is **NOT** performed. Dataset lacks SFT text pairs, and system has no CUDA acceleration.
- **Local LLM Verification:** MediPhi-Instruct execution verified in CPU-fallback/mock mode for reasoning benchmark evaluations.
- **Artifact Location:** `models/llm_reasoning_evaluation/`.
