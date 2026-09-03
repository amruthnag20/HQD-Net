# Phase 5 — Frontend Explainability Contract

**Status:** Frontend complete. Backend endpoint NOT YET IMPLEMENTED.

---

## Overview

Phase 5 requires an explainability endpoint that returns per-feature attribution data for a given model inference.  
The frontend at `/app/explainability` is fully built and will consume this endpoint automatically once it is available.

---

## Expected Endpoint

```
POST /api/explainability
```

> [!IMPORTANT]
> This endpoint does NOT exist yet. The frontend supports a graceful "explanation unavailable" state until it is implemented.

---

## Request

```json
{
  "row_index": 0,
  "model": "quantum"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `row_index` | `integer` | ✅ REQUIRED | Row index within the loaded dataset |
| `model` | `"quantum" \| "classical"` | ✅ REQUIRED | Which model to explain |

---

## Response

```json
{
  "status": "success",
  "sample_id": "PAT_1000",
  "model": "DressedVQC",
  "explanation_method": "Parameter-Shift Sensitivity (QuXAI)",
  "selected_class": "Normal",
  "feature_attributions": [
    {
      "feature_name": "biomarker_04",
      "raw_value": null,
      "standardized_value": -0.229,
      "contribution": 0.182,
      "sensitivity": 0.31,
      "unit": null
    }
  ],
  "jacobian": [
    { "feature_name": "biomarker_04", "gradient": 0.31 }
  ],
  "global_importance": null,
  "execution_ms": 1240
}
```

---

## Fields

### Top-level

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | `string` | ✅ REQUIRED | `"success"` \| `"error"` |
| `sample_id` | `string` | ✅ REQUIRED | Patient / sample identifier |
| `model` | `string` | ✅ REQUIRED | Model name |
| `explanation_method` | `string` | ✅ REQUIRED | Human-readable method name |
| `selected_class` | `string` | ✅ REQUIRED | Class the attributions are computed toward |
| `feature_attributions` | `array` | ✅ REQUIRED | Per-feature attribution entries (see below) |
| `jacobian` | `array \| null` | ⭕ OPTIONAL | Gradient-based Jacobian entries (see below) |
| `global_importance` | `array \| null` | ⭕ OPTIONAL | Cohort-level feature importance |
| `execution_ms` | `number \| null` | ⭕ OPTIONAL | Computation time in milliseconds |

### `feature_attributions[]`

| Field | Type | Required | Description |
|---|---|---|---|
| `feature_name` | `string` | ✅ REQUIRED | Native feature name (e.g., `biomarker_04`) |
| `raw_value` | `number \| null` | ⭕ OPTIONAL | Original raw value if available |
| `standardized_value` | `number \| null` | ⭕ OPTIONAL | StandardScaler-transformed value (z-score) |
| `contribution` | `number \| null` | ⭕ OPTIONAL | Signed model-level contribution toward `selected_class` |
| `sensitivity` | `number \| null` | ⭕ OPTIONAL | dP/dx — change in probability per unit input change |
| `unit` | `string \| null` | ⭕ OPTIONAL | Physical unit if applicable |

### `jacobian[]`

| Field | Type | Required | Description |
|---|---|---|---|
| `feature_name` | `string` | ✅ REQUIRED | Feature name |
| `gradient` | `number` | ✅ REQUIRED | Parameter-shift gradient (dP/d·feature) |

### `global_importance[]`

| Field | Type | Required | Description |
|---|---|---|---|
| `feature_name` | `string` | ✅ REQUIRED | Feature name |
| `mean_absolute_contribution` | `number` | ✅ REQUIRED | Mean absolute attribution across cohort |

---

## Error Response

```json
{
  "status": "error",
  "detail": "Explanation computation failed: <reason>"
}
```

---

## Scientific Constraints

> [!CAUTION]
> The backend MUST NOT invent attribution values.  
> The backend MUST NOT pad, project, or map clinical features into the VQC's native biomarker space without a validated scientific transformation.

The native VQC was trained on:
- `clinical_data_synthetic.csv` — 500 rows × 24 biomarkers
- Random Forest feature selection → top 10 features
- StandardScaler fit on the 500-row training set
- AngleEmbedding: `θ = π · tanh(z)` → 10-qubit input

Attribution methods must respect this feature contract exactly.

---

## Implementation Suggestions

The recommended explanation approach for the frozen VQC is:

1. **Parameter-shift rule** — PennyLane native `qml.grad` / `qml.jacobian`
2. Compute `dP(class)/d(input_i)` for each feature `i`
3. Return as `contribution` and `gradient` in the response

Do NOT use SHAP, LIME, or other surrogate methods unless they are applied to the native VQC circuit outputs, not to a surrogate model.

---

## Sensitivity Curve (Future Extension)

The frontend is prepared to render a feature-vs-probability curve if the backend supplies:

```json
{
  "sensitivity_curve": {
    "feature_name": "biomarker_04",
    "x_values": [-3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0],
    "probabilities": [0.82, 0.79, 0.74, 0.68, 0.61, 0.54, 0.47]
  }
}
```

This is a NOT AVAILABLE YET extension.

---

## Frontend Fallback Behavior

When the endpoint is unavailable:

| State | Frontend Response |
|---|---|
| Endpoint 404 / connection refused | Status `unavailable`, real prediction shown, no fake attributions |
| Successful inference, missing attribution fields | Status `partial`, partial bars shown |
| Malformed JSON / NaN values | Warning banner, malformed fields displayed as `—` |
| All attributions present | Status `available`, full chart rendered |
