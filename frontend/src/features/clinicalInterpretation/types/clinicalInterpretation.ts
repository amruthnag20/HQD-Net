/**
 * Phase 6 — Clinical Interpretation Types.
 *
 * Strict, nullable TypeScript interfaces describing the clinical interpretation
 * payload the frontend expects from a FUTURE backend (RAG + clinical knowledge +
 * LLM translation layer). Nothing here performs medical reasoning — every field is
 * a container for externally supplied content. Fields the backend may omit are
 * nullable so the UI can render honest "unavailable" states instead of fabricating
 * data.
 *
 * Provenance is a first-class concept: the UI must always distinguish
 * MODEL OUTPUT vs EXPLAINABILITY vs MEDICAL EVIDENCE vs AI INTERPRETATION vs
 * CLINICIAN REVIEW. See {@link Provenance}.
 */

/** Lifecycle of the clinical interpretation for a given analysis. */
export type ClinicalInterpretationStatus =
  | 'not_started'
  | 'loading'
  | 'available'
  | 'partial'
  | 'unavailable'
  | 'error'

/** Where a given piece of information originated. Drives provenance badges. */
export type Provenance =
  | 'model-output'
  | 'explainability'
  | 'medical-evidence'
  | 'ai-interpretation'
  | 'clinically-interpreted'
  | 'demo-data'

/** How the clinical language / interpretation text was produced. */
export type InterpretationSource =
  | 'backend'
  | 'demo-fixture'
  | 'unavailable'
  | 'pending'

/** Review priority. Never inferred by the frontend — supplied by backend or fixture. */
export type ClinicalPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'
  | 'review'
  | 'undetermined'

/** Types of medical evidence sources the backend/RAG layer may return. */
export type EvidenceSourceType =
  | 'clinical-guideline'
  | 'peer-reviewed-study'
  | 'systematic-review'
  | 'medical-reference'
  | 'institutional-source'
  | 'other'

/** Qualitative relevance of an evidence item to the analysis. */
export type EvidenceRelevance = 'high' | 'medium' | 'low'

/** Qualitative strength / quality of an evidence item. */
export type EvidenceStrength = 'strong' | 'moderate' | 'limited' | 'insufficient'

/** Category of a clinical finding, and how it was derived. */
export type FindingCategory =
  | 'primary'
  | 'secondary'
  | 'observation'
  | 'model-signal'

/** Category of a recommendation supplied by the clinical knowledge layer. */
export type RecommendationCategory =
  | 'follow-up'
  | 'additional-evaluation'
  | 'monitoring'
  | 'lifestyle'
  | 'clinical-review'
  | 'other'

/** Priority hint attached to a recommendation. */
export type RecommendationPriority = 'low' | 'medium' | 'high'

/** Severity of a precaution. */
export type PrecautionSeverity = 'info' | 'caution' | 'warning' | 'critical'

/**
 * A medical evidence item. Nothing here is invented by the frontend — the backend
 * RAG layer supplies real citations. Demo fixtures use clearly synthetic
 * identifiers (e.g. DEMO-EVIDENCE-001) and set {@link isDemo} = true.
 */
export type MedicalEvidence = {
  /** Citation identifier — real (DOI/PMID) from backend, or DEMO-EVIDENCE-xxx in fixtures. */
  id: string
  title: string
  sourceType: EvidenceSourceType
  authors: string | null
  year: number | null
  /** Journal / publisher / institution. */
  source: string | null
  /** External identifier text (DOI, PMID, etc.) if provided separately from id. */
  identifier: string | null
  url: string | null
  /** Human-readable short citation label, e.g. "Evidence #1". */
  citationLabel: string
  relevance: EvidenceRelevance | null
  relevanceScore: number | null
  strength: EvidenceStrength | null
  /** IDs of findings this evidence relates to. */
  matchedFindingIds: string[]
  excerpt: string | null
  /** True when this is development/demo content, not real retrieved evidence. */
  isDemo: boolean
}

/**
 * A clinical finding. The frontend never decides whether a signal is clinically
 * meaningful — {@link provenance} records who did.
 */
export type ClinicalFinding = {
  id: string
  label: string
  description: string | null
  category: FindingCategory
  provenance: Provenance
  /** Related feature name from explainability, if any. */
  relatedFeature: string | null
  /** Signed model contribution associated with this finding, if any. */
  contribution: number | null
  /** IDs of evidence items supporting/related to this finding. */
  relatedEvidenceIds: string[]
}

/**
 * A risk factor. Classification as a "risk factor" must come from the backend /
 * clinical knowledge layer — never inferred from attribution magnitude alone.
 */
export type ClinicalRiskFactor = {
  id: string
  name: string
  value: string | null
  /** Signed model contribution, if available. */
  contribution: number | null
  status: string | null
  evidenceStrength: EvidenceStrength | null
  provenance: Provenance
  relatedEvidenceIds: string[]
}

/** A recommendation supplied by the clinical knowledge layer. Never generated here. */
export type ClinicalRecommendation = {
  id: string
  title: string
  description: string | null
  rationale: string | null
  category: RecommendationCategory
  priority: RecommendationPriority | null
  relatedEvidenceIds: string[]
}

/** A precaution supplied by the backend. */
export type ClinicalPrecaution = {
  id: string
  title: string
  description: string | null
  severity: PrecautionSeverity | null
  relatedEvidenceIds: string[]
}

/**
 * Medication INFORMATION — not a prescription. The frontend never computes dosage
 * or recommends a medication. Displayed only if supplied by an approved external
 * clinical system.
 */
export type MedicationInfo = {
  id: string
  name: string
  purpose: string | null
  context: string | null
  warnings: string[]
  contraindicationInfo: string | null
  relatedEvidenceIds: string[]
}

/**
 * Structured interpretation text sections. Only render sections the backend
 * actually supplied; missing sections stay null.
 */
export type InterpretationNarrative = {
  summary: string | null
  keyFindings: string | null
  riskInterpretation: string | null
  evidenceContext: string | null
  recommendedNextSteps: string | null
}

/** Metadata about the language generation step. */
export type InterpretationMetadata = {
  model: string | null
  modelVersion: string | null
  generatedAt: string | null
  source: InterpretationSource
}

/**
 * Model probability pair (0..1). Distinct from evidence strength and from
 * interpretation confidence — never merged into a single "confidence" score.
 */
export type ModelProbabilities = {
  Normal: number
  'High Risk': number
} | null

/** Top-level clinical interpretation result consumed by Phase 6 and Phase 7. */
export type ClinicalInterpretationResult = {
  status: ClinicalInterpretationStatus

  // ---- Patient / model context (MODEL OUTPUT provenance) ----
  sampleId: string
  datasetName: string
  selectedModel: string
  predictionLabel: string | null
  modelProbabilities: ModelProbabilities

  // ---- Clinical interpretation (AI INTERPRETATION / EVIDENCE provenance) ----
  narrative: InterpretationNarrative
  keyFindings: ClinicalFinding[]
  riskFactors: ClinicalRiskFactor[]
  evidence: MedicalEvidence[]
  recommendations: ClinicalRecommendation[]
  precautions: ClinicalPrecaution[]
  medicationInformation: MedicationInfo[]

  // ---- Assessments (each a distinct concept) ----
  priority: ClinicalPriority
  /** Interpretation confidence 0..1 — NOT model probability, NOT evidence strength. */
  interpretationConfidence: number | null

  warnings: string[]
  metadata: InterpretationMetadata
  generatedAt: string | null

  // ---- Provenance / demo flags ----
  isDemoFixture: boolean
  fixtureName: string | null
  /** Whether a real backend clinical endpoint was consulted. */
  backendInterpretationAvailable: boolean
}
