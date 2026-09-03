# Phase 6 — Frontend Clinical Interpretation Contract

**Status:** Frontend complete. Backend clinical / RAG / LLM layer NOT YET IMPLEMENTED.

---

## Overview

Phase 6 (`/app/clinical-interpretation`) translates structured model findings and
supporting medical evidence into a clinician-readable interpretation. The page is a
pure **presentation layer**: it performs no medical reasoning, invents no citations,
and generates no recommendations or medication guidance. All clinical content is
expected from a future backend that combines a retrieval-augmented generation (RAG)
layer over a validated biomedical knowledge base with an LLM translation step and
deterministic clinical rules.

Until that backend exists, the page runs in one of two modes:

- **Live mode** — consumes real upstream state (model comparison + explainability).
  Model output is shown truthfully; the clinical interpretation layer reports an
  honest "unavailable" state.
- **Fixture mode** — loads deterministic, clearly-labelled `DEMO` content for UI
  verification via the Dev Inspector.

---

## Expected Endpoint

```
POST /api/clinical-interpretation
```

> [!IMPORTANT]
> This endpoint does NOT exist yet. The frontend supports graceful
> `not_started` / `unavailable` / `partial` / `error` states until it is implemented.

---

## Request (EXPECTED FUTURE)

```json
{
  "sample_id": "PAT-1000",
  "model": "quantum",
  "prediction_label": "Normal",
  "probabilities": { "Normal": 0.7195, "High Risk": 0.2805 },
  "feature_attributions": [
    { "feature_name": "biomarker_04", "contribution": 0.182, "direction": "positive" }
  ]
}
```

| Field | Type | Availability | Description |
|---|---|---|---|
| `sample_id` | `string` | AVAILABLE NOW (from context) | Patient / sample identifier |
| `model` | `"quantum" \| "classical"` | AVAILABLE NOW | Which model was explained |
| `prediction_label` | `string` | AVAILABLE NOW | Model output label |
| `probabilities` | `object` | AVAILABLE NOW | Class probabilities (0..1) |
| `feature_attributions` | `array` | AVAILABLE NOW | Explainability findings passed for enrichment |

---

## Response (EXPECTED FUTURE)

Normalised by `clinicalInterpretationAdapter.ts` →
`normalizeBackendClinicalResponse()`. Every field is nullable; the UI renders honest
empty states for anything omitted.

| Field | Type | Availability | Notes |
|---|---|---|---|
| `status` | `"available" \| "partial" \| "unavailable" \| "error"` | EXPECTED FUTURE | Interpretation lifecycle |
| `narrative` | `{ summary, keyFindings, riskInterpretation, evidenceContext, recommendedNextSteps }` | EXPECTED FUTURE | Structured LLM text; render only supplied sections |
| `keyFindings` | `ClinicalFinding[]` | EXPECTED FUTURE | Each carries a `provenance` tag |
| `riskFactors` | `ClinicalRiskFactor[]` | EXPECTED FUTURE | Risk-factor classification is a backend responsibility |
| `evidence` | `MedicalEvidence[]` | EXPECTED FUTURE | Real citations; never fabricated |
| `recommendations` | `ClinicalRecommendation[]` | EXPECTED FUTURE | Supplied by clinical knowledge layer |
| `precautions` | `ClinicalPrecaution[]` | EXPECTED FUTURE | With severity |
| `medicationInformation` | `MedicationInfo[]` | EXPECTED FUTURE | Information only — never a prescription/dosage |
| `priority` | `"low" \| "medium" \| "high" \| "urgent" \| "review" \| "undetermined"` | EXPECTED FUTURE | Never inferred by the frontend |
| `interpretationConfidence` | `number \| null` | OPTIONAL | Distinct from model probability and evidence strength |
| `warnings` | `string[]` | OPTIONAL | Non-blocking notices |
| `metadata` | `{ model, modelVersion, generatedAt, source }` | OPTIONAL | Generation provenance |

### Evidence item (`MedicalEvidence`)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Real DOI/PMID from backend; `DEMO-EVIDENCE-xxx` in fixtures |
| `title`, `authors`, `year`, `source`, `identifier`, `url` | nullable | Displayed only if provided; never invented |
| `sourceType` | enum | guideline / study / review / reference / institutional / other |
| `relevance`, `relevanceScore`, `strength` | nullable | "not provided" shown when absent |
| `matchedFindingIds` | `string[]` | Powers the Evidence ↔ Finding map |
| `isDemo` | `boolean` | Marks development content |

---

## Scientific honesty rules enforced by the UI

- Model probability is labelled **Model probability**, never "medical certainty".
- Evidence is labelled **related / supporting**, never "proof the model is correct".
- Priority, risk-factor classification, recommendations, precautions, and medication
  information are displayed only when supplied — never derived on the frontend.
- Demo content is always badged `DEMO`.

---

## Legend

- **AVAILABLE NOW** — already produced by existing frontend contexts.
- **EXPECTED FUTURE** — required from the backend clinical layer.
- **OPTIONAL** — enhances the UI but is not required to render.
