# Phase 7 — Frontend Patient Report Contract

**Status:** Frontend complete. Report persistence + feedback endpoints NOT YET IMPLEMENTED.

---

## Overview

Phase 7 (`/app/report`) presents the complete analysis as a polished, self-contained,
print-ready document. It is a **summary** assembled entirely from existing frontend
contexts — it performs no new reasoning and duplicates no clinical logic.

The report consumes the shared `ClinicalContext` (Phase 6) plus the model-comparison
(Phase 4) and explainability (Phase 5) results, via `patientReportAdapter.ts` →
`assemblePatientReport()`.

---

## Data sources

| Report section | Source | Availability |
|---|---|---|
| Patient / sample information | Dataset context + clinical context | AVAILABLE NOW |
| Executive summary | Clinical interpretation | AVAILABLE NOW |
| Model analysis | Phase 4 `ModelComparisonResult` (reused, not recomputed) | AVAILABLE NOW |
| Explainability | Phase 5 `ExplainabilityResult` (summarised) | AVAILABLE NOW |
| Key risk factors | Clinical interpretation | EXPECTED FUTURE (backend) |
| Clinical interpretation | Clinical interpretation narrative | EXPECTED FUTURE (backend) |
| Medical evidence | Clinical interpretation evidence | EXPECTED FUTURE (backend) |
| Recommendations / precautions / medication | Clinical interpretation | EXPECTED FUTURE (backend) |
| Clinical review / feedback | Session-only frontend state | AVAILABLE NOW (not persisted) |
| Report completeness | Derived from actual section availability | AVAILABLE NOW |

---

## Report actions

| Action | Implementation | Notes |
|---|---|---|
| Print | Native `window.print()` + print stylesheet | App chrome and dev controls are hidden; sections flow across pages |
| Copy summary | Client-side clipboard | Structured plain text only — no hidden metadata |
| Back navigation | `/app/clinical-interpretation` | Context preserved |

There is intentionally **no** client-side PDF generation and **no** fabricated
backend export.

---

## Feedback contract (EXPECTED FUTURE)

The frontend captures `ClinicalFeedback` for the current session only:

```ts
type ClinicalFeedback = {
  reportId: string
  sampleId: string
  reviewerStatus: 'pending' | 'reviewed' | 'needs-revision'
  note: string
  selectedFindings: string[]
  createdAt: string | null
}
```

When a backend review endpoint exists:

```
POST /api/report-feedback
```

> [!IMPORTANT]
> No persistence endpoint exists yet. Feedback lives in React state for the session
> and is clearly labelled as such in the UI.

---

## Report status & completeness

- `status`: `draft | ready-for-review | reviewed | incomplete` — derived from actual
  state. The report is never labelled "FINAL".
- `completeness`: a **data-availability checklist**, never a medical confidence score.

---

## Report identity & timestamps

- `reportId` is `null` unless a backend supplies one — no fabricated persistent id.
- Timestamps come from backend/fixture data; demo timestamps are static and never
  regenerated on render.

---

## Legend

- **AVAILABLE NOW** — assembled from existing frontend contexts.
- **EXPECTED FUTURE** — requires the backend clinical layer or persistence endpoints.
