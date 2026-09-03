# HQD-Net Model Comparison API Contract (Phase 4 Specification)

This specification defines the frontend contract and data schema expected by the Phase 4 Model Comparison UI for automated synthesis between Classical ML and Quantum ML models.

---

## 1. Architectural Responsibility Boundary

* **Frontend Responsibility**:
  * Render comparative decision dashboards, probability distributions, agreement/disagreement indicators, cohort performance tables, and input compatibility safeguards.
  * Consume existing Classical ML and Quantum ML outputs via `comparisonAdapter.ts`.
  * Protect scientific integrity: refuse to declare clinical agreement when input feature spaces or scaling contracts are disjoint.
* **Backend Responsibility (Future Milestone)**:
  * Provide unified feature projection / alignment (e.g. valid $N \to 10$ dimensional projector for the clinical feature space).
  * Serve aligned inference payloads or joint comparison endpoints.

---

## 2. Conceptual Joint Endpoint

```http
POST /api/comparison/evaluate
Content-Type: application/json
```

### Request Payload
```json
{
  "dataset_id": "clinical_data_synthetic.csv",
  "patient_id": "PAT_1000",
  "row_index": 0,
  "models": ["classical_logistic", "quantum_dressed_vqc"],
  "evaluation_context": {
    "feature_alignment": "native_direct",
    "include_cohort_metrics": true
  }
}
```

---

## 3. Response Payload Structure

```json
{
  "status": "complete",
  "generated_at": "2026-09-03T01:30:00.000Z",
  "patient_id": "PAT_1000",
  "target_column": "diagnosis",

  "input_compatibility": {
    "is_compatible": true,
    "status": "compatible",
    "feature_overlap_count": 10,
    "classical_domain": "clinical_data_synthetic.csv",
    "quantum_domain": "clinical_data_synthetic.csv",
    "reason": "Both models evaluated on aligned 10-dimensional standardized biomarker inputs."
  },

  "classical": {
    "model_name": "Logistic Regression",
    "model_type": "logistic-regression",
    "execution_status": "trained",
    "prediction_label": "Normal",
    "confidence_percent": 72.1,
    "probabilities": {
      "Normal": 0.7210,
      "High Risk": 0.2790
    },
    "feature_count": 10,
    "feature_names": ["biomarker_04", "biomarker_01", "biomarker_00", "biomarker_02", "biomarker_03", "biomarker_15", "biomarker_18", "biomarker_22", "biomarker_17", "biomarker_12"],
    "metrics": {
      "accuracy": 0.85,
      "precision": 0.83,
      "recall": 0.88,
      "f1": 0.85,
      "roc_auc": 0.91,
      "evaluation_method": "leave-one-out-cross-validation",
      "fold_count": 50
    },
    "computational_metadata": {
      "architecture": "L2-Penalized Logistic Classifier",
      "framework": "TypeScript / Browser Engine",
      "execution_environment": "Client Browser",
      "numeric_precision": "float64"
    }
  },

  "quantum": {
    "model_name": "DressedVQC",
    "model_type": "dressed-vqc",
    "execution_status": "complete",
    "prediction_label": "Normal",
    "confidence_percent": 71.95,
    "probabilities": {
      "Normal": 0.719482,
      "High Risk": 0.280518
    },
    "feature_count": 10,
    "feature_names": ["biomarker_04", "biomarker_01", "biomarker_00", "biomarker_02", "biomarker_03", "biomarker_15", "biomarker_18", "biomarker_22", "biomarker_17", "biomarker_12"],
    "metrics": {
      "accuracy": 0.86,
      "precision": 0.85,
      "recall": 0.87,
      "f1": 0.86,
      "roc_auc": 0.92,
      "evaluation_method": "5-fold Cross Validation",
      "fold_count": 5
    },
    "computational_metadata": {
      "architecture": "10-Qubit Dressed VQC (2 Strongly Entangling Layers)",
      "framework": "PennyLane 0.45.1 + PyTorch 2.13",
      "execution_environment": "Python FastAPI Standalone Service (:8000)",
      "numeric_precision": "float64",
      "qubits": 10,
      "layers": 2,
      "ansatz": "StronglyEntanglingLayers",
      "device": "default.qubit"
    }
  },

  "synthesis": {
    "agreement": "agree",
    "priority": "low",
    "normal_probability_delta": 0.0015,
    "probability_gap_percentage_points": 0.15,
    "summary": "Models agree on 'Normal' classification with a 0.2 percentage point probability difference."
  }
}
```

---

## 4. Agreement and Discrepancy Rules

1. **`is_compatible == false`**:
   * Agreement **MUST** evaluate to `"not-comparable"`.
   * Priority **MUST** evaluate to `"undetermined"`.
   * UI must render warning banner explaining disjoint domains.
2. **`is_compatible == true`**:
   * If `classical.prediction_label == quantum.prediction_label`:
     * Agreement: `"agree"`
     * Priority: `"low"` (if Normal) or `"high"` (if High Risk)
   * If `classical.prediction_label != quantum.prediction_label`:
     * Agreement: `"disagree"`
     * Priority: `"review-required"`
