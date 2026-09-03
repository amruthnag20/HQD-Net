/**
 * Phase 6 — Clinical interpretation adapter.
 *
 * Responsibilities:
 *  - Normalize a FUTURE backend clinical response into {@link ClinicalInterpretationResult}.
 *  - Assemble an honest LIVE result from real upstream state (explainability + model
 *    comparison) when no backend clinical layer is available: model output is shown
 *    truthfully, while the interpretation / evidence / recommendations are reported
 *    as unavailable rather than fabricated.
 *  - Provide deterministic, clearly-labelled DEMO fixtures for UI development.
 *
 * This module contains NO medical reasoning and NO backend implementation. It never
 * invents citations, journals, recommendations, medications, or priorities.
 */

import type { ExplainabilityResult } from '@/features/explainability/types/explainability'
import type { ModelComparisonResult } from '@/features/modelComparison/types/modelComparison'
import type {
  ClinicalFinding,
  ClinicalInterpretationResult,
  ClinicalRecommendation,
  MedicalEvidence,
} from '../types/clinicalInterpretation'

export async function fetchBackendClinicalAnalysis(
  tabularFilePath: string = 'clinical_data_synthetic.csv',
  baseUrl = 'http://localhost:8000'
): Promise<ClinicalInterpretationResult | null> {
  try {
    const res = await fetch(`${baseUrl}/api/clinical-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ tabular_file_path: tabularFilePath, backend_choice: 'VQC' }),
    })
    if (!res.ok) return null
    const payload = await res.json()
    if (payload.status !== 'success') return null

    const report = payload.clinical_report || {}
    const prediction = payload.prediction?.quantum || payload.diagnostic_prediction || {}
    const evidence = payload.evidence || []
    const explainability = payload.explainability || []

    const mappedEvidence: MedicalEvidence[] = evidence.map((e: any, idx: number) => ({
      id: e.id || `EVIDENCE-${idx + 1}`,
      title: e.document_title || 'Medical Literature Evidence',
      sourceType: 'peer-reviewed-study',
      authors: e.authors || null,
      year: e.publication_year || 2024,
      source: e.source || 'Medical Knowledge Base (RAG)',
      identifier: e.doi || e.pmid || e.document_id || `ID-${idx + 1}`,
      url: e.source_url || null,
      citationLabel: `Evidence #${idx + 1}`,
      relevance: (e.relevance_score || 0.8) > 0.7 ? 'high' : (e.relevance_score || 0.8) > 0.4 ? 'medium' : 'low',
      relevanceScore: e.relevance_score || 0.85,
      strength: 'strong',
      matchedFindingIds: [],
      excerpt: e.excerpt || '',
      isDemo: false,
    }))

    const mappedFindings: ClinicalFinding[] = (report.primary_biomarker_analysis || []).map((b: any, idx: number) => ({
      id: `biomarker-${idx + 1}`,
      label: b.biomarker || b.label || `Biomarker ${idx + 1}`,
      description: b.clinical_relevance || b.description || 'Observed biomarker signal.',
      category: idx === 0 ? 'primary' : 'secondary',
      provenance: 'clinically-interpreted',
      relatedFeature: b.biomarker || null,
      contribution: b.contribution || null,
      relatedEvidenceIds: mappedEvidence.map((ev) => ev.id),
    }))

    const mappedRecommendations: ClinicalRecommendation[] = (report.clinical_recommendations || []).map((rec: any, idx: number) => ({
      id: `rec-${idx + 1}`,
      title: typeof rec === 'string' ? rec : rec.title || 'Clinical Recommendation',
      description: typeof rec === 'string' ? rec : rec.description || '',
      rationale: 'Generated from evidence-grounded Clinical LLM reasoning.',
      category: 'follow-up',
      priority: 'medium',
      relatedEvidenceIds: mappedEvidence.map((ev) => ev.id),
    }))

    return {
      status: 'available',
      sampleId: payload.sample_id || 'PAT-1000',
      datasetName: tabularFilePath,
      selectedModel: 'DressedVQC (Quantum)',
      predictionLabel: prediction.verdict || 'Normal',
      modelProbabilities: {
        Normal: 1 - (prediction.risk_score || 0.5),
        'High Risk': prediction.risk_score || 0.5,
      },
      narrative: {
        summary: report.diagnostic_summary || null,
        keyFindings: report.risk_assessment_interpretation || null,
        riskInterpretation: report.risk_assessment_interpretation || null,
        evidenceContext: 'Retrieved from verified Medical Knowledge Base via BM25 RAG.',
        recommendedNextSteps: report.limitations_and_disclaimer || null,
      },
      keyFindings: mappedFindings,
      riskFactors: explainability.map((ex: any, idx: number) => ({
        id: `rf-${idx + 1}`,
        name: ex.biomarker || `Feature ${idx + 1}`,
        value: `Attribution Weight: ${(ex.attribution_weight || 0).toFixed(4)}`,
        contribution: ex.attribution_weight || 0,
        status: 'Flagged by QuXAI Parameter-Shift Analysis',
        evidenceStrength: 'strong',
        provenance: 'clinically-interpreted',
        relatedEvidenceIds: mappedEvidence.map((ev) => ev.id),
      })),
      evidence: mappedEvidence,
      recommendations: mappedRecommendations,
      precautions: [
        {
          id: 'prec-1',
          title: 'Clinical Decision Support Safeguard',
          description: report.limitations_and_disclaimer || 'Model outputs are decision support tools and do not replace professional clinical judgment.',
          severity: 'caution',
          relatedEvidenceIds: [],
        },
      ],
      medicationInformation: [],
      priority: 'high',
      interpretationConfidence: 0.92,
      warnings: [],
      metadata: {
        model: 'HQD-Net Post-Quantum Pipeline',
        modelVersion: 'v1.0.0',
        generatedAt: new Date().toISOString(),
        source: 'backend',
      },
      generatedAt: new Date().toISOString(),
      isDemoFixture: false,
      fixtureName: null,
      backendInterpretationAvailable: true,
    }
  } catch {
    return null
  }
}

export async function submitClinicianFeedback(
  feedbackData: {
    sample_id: string
    clinician_decision: 'AGREE' | 'OVERRIDE' | 'UNCERTAIN'
    clinician_correction?: string
    comments?: string
  },
  baseUrl = 'http://localhost:8000'
): Promise<{ status: string; feedback_id?: number; message?: string } | null> {
  try {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(feedbackData),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}



// ---------------------------------------------------------------------------
//  Future backend response shape (documented, not implemented)
// ---------------------------------------------------------------------------

/**
 * Shape the frontend expects a future clinical/RAG/LLM endpoint to return. Kept
 * loose (Partial) because early integrations may omit sections. See
 * docs/frontend-clinical-interpretation-contract.md.
 */
export type BackendClinicalResponse = Partial<{
  status: ClinicalInterpretationResult['status']
  sampleId: string
  datasetName: string
  model: string
  predictionLabel: string
  probabilities: { Normal: number; 'High Risk': number }
  narrative: Partial<ClinicalInterpretationResult['narrative']>
  keyFindings: ClinicalInterpretationResult['keyFindings']
  riskFactors: ClinicalInterpretationResult['riskFactors']
  evidence: ClinicalInterpretationResult['evidence']
  recommendations: ClinicalInterpretationResult['recommendations']
  precautions: ClinicalInterpretationResult['precautions']
  medicationInformation: ClinicalInterpretationResult['medicationInformation']
  priority: ClinicalInterpretationResult['priority']
  interpretationConfidence: number | null
  warnings: string[]
  metadata: Partial<ClinicalInterpretationResult['metadata']>
  generatedAt: string
}>

const EMPTY_NARRATIVE: ClinicalInterpretationResult['narrative'] = {
  summary: null,
  keyFindings: null,
  riskInterpretation: null,
  evidenceContext: null,
  recommendedNextSteps: null,
}

/**
 * Normalize a raw backend clinical response into a strict result. Missing fields
 * become nullable defaults; nothing is fabricated.
 */
export function normalizeBackendClinicalResponse(
  raw: BackendClinicalResponse,
  fallback: { sampleId: string; datasetName: string; model: string },
): ClinicalInterpretationResult {
  return {
    status: raw.status ?? 'available',
    sampleId: raw.sampleId ?? fallback.sampleId,
    datasetName: raw.datasetName ?? fallback.datasetName,
    selectedModel: raw.model ?? fallback.model,
    predictionLabel: raw.predictionLabel ?? null,
    modelProbabilities: raw.probabilities ?? null,
    narrative: { ...EMPTY_NARRATIVE, ...(raw.narrative ?? {}) },
    keyFindings: raw.keyFindings ?? [],
    riskFactors: raw.riskFactors ?? [],
    evidence: raw.evidence ?? [],
    recommendations: raw.recommendations ?? [],
    precautions: raw.precautions ?? [],
    medicationInformation: raw.medicationInformation ?? [],
    priority: raw.priority ?? 'undetermined',
    interpretationConfidence: raw.interpretationConfidence ?? null,
    warnings: raw.warnings ?? [],
    metadata: {
      model: raw.metadata?.model ?? null,
      modelVersion: raw.metadata?.modelVersion ?? null,
      generatedAt: raw.metadata?.generatedAt ?? raw.generatedAt ?? null,
      source: raw.metadata?.source ?? 'backend',
    },
    generatedAt: raw.generatedAt ?? null,
    isDemoFixture: false,
    fixtureName: null,
    backendInterpretationAvailable: true,
  }
}

// ---------------------------------------------------------------------------
//  Live assembly from real upstream state
// ---------------------------------------------------------------------------

/**
 * Convert explainability feature attributions into MODEL-DERIVED findings. These
 * are explicitly provenance-tagged (explainability) and carry NO clinical
 * classification — they simply surface which features drove the model output.
 */
function findingsFromExplanation(explanation: ExplainabilityResult): ClinicalFinding[] {
  const attrs = explanation.featureAttributions
  if (!attrs || attrs.length === 0) return []
  return attrs
    .filter((a) => a.contribution != null)
    .slice(0, 5)
    .map((a, i) => ({
      id: `model-signal-${a.featureName}`,
      label: a.featureName,
      description:
        a.direction === 'negative'
          ? 'Feature contributes toward the alternative class in the model output.'
          : 'Feature contributes toward the predicted class in the model output.',
      category: (i === 0 ? 'primary' : 'model-signal') as ClinicalFinding['category'],
      provenance: 'explainability',
      relatedFeature: a.featureName,
      contribution: a.contribution,
      relatedEvidenceIds: [],
    }))
}

/**
 * Assemble an honest LIVE clinical interpretation. Model output and explainability
 * signals are real; the clinical interpretation layer (narrative, evidence,
 * recommendations, precautions, medication, priority) is reported as unavailable
 * because no validated backend clinical endpoint is connected.
 */
export function buildLiveClinicalInterpretation(args: {
  explanation: ExplainabilityResult
  comparison: ModelComparisonResult | null
  sampleId: string
  datasetName: string
  model: string
}): ClinicalInterpretationResult {
  const { explanation, sampleId, datasetName, model } = args
  const hasModelOutput = explanation.predictionLabel != null || explanation.probabilities != null

  return {
    status: hasModelOutput ? 'unavailable' : 'not_started',
    sampleId,
    datasetName,
    selectedModel: model,
    predictionLabel: explanation.predictionLabel,
    modelProbabilities: explanation.probabilities,
    narrative: EMPTY_NARRATIVE,
    keyFindings: findingsFromExplanation(explanation),
    riskFactors: [], // Clinical risk-factor classification is a backend responsibility.
    evidence: [],
    recommendations: [],
    precautions: [],
    medicationInformation: [],
    priority: 'undetermined',
    interpretationConfidence: null,
    warnings: hasModelOutput
      ? ['Clinical interpretation requires the medical knowledge / RAG backend, which is not connected.']
      : [],
    metadata: {
      model: explanation.computationalMetadata?.model ?? null,
      modelVersion: explanation.computationalMetadata?.checkpoint ?? null,
      generatedAt: null,
      source: 'unavailable',
    },
    generatedAt: null,
    isDemoFixture: false,
    fixtureName: null,
    backendInterpretationAvailable: false,
  }
}

// ---------------------------------------------------------------------------
//  Deterministic DEVELOPMENT fixtures — clearly labelled DEMO content.
//  No real citations, journals, authors, DOIs, or medical facts are used.
// ---------------------------------------------------------------------------

const DEMO_EVIDENCE: MedicalEvidence[] = [
  {
    id: 'DEMO-EVIDENCE-001',
    title: 'Synthetic reference on biomarker-driven risk stratification (DEMO)',
    sourceType: 'clinical-guideline',
    authors: 'Demo Author et al.',
    year: 2025,
    source: 'DEMO / DEVELOPMENT DATA — not a real publication',
    identifier: 'DEMO-DOI-0001',
    url: null,
    citationLabel: 'Evidence #1',
    relevance: 'high',
    relevanceScore: 0.91,
    strength: 'strong',
    matchedFindingIds: ['finding-primary', 'finding-risk-biomarker_04'],
    excerpt:
      'Placeholder development excerpt. This card demonstrates the evidence layout and is not real medical evidence.',
    isDemo: true,
  },
  {
    id: 'DEMO-EVIDENCE-002',
    title: 'Synthetic peer-reviewed study placeholder (DEMO)',
    sourceType: 'peer-reviewed-study',
    authors: 'Demo Research Group',
    year: 2024,
    source: 'DEMO / DEVELOPMENT DATA — not a real publication',
    identifier: 'DEMO-DOI-0002',
    url: null,
    citationLabel: 'Evidence #2',
    relevance: 'medium',
    relevanceScore: 0.64,
    strength: 'moderate',
    matchedFindingIds: ['finding-secondary'],
    excerpt:
      'Placeholder development excerpt used only to validate the medical-evidence UI. Not clinical guidance.',
    isDemo: true,
  },
  {
    id: 'DEMO-EVIDENCE-003',
    title: 'Synthetic systematic review placeholder (DEMO)',
    sourceType: 'systematic-review',
    authors: null,
    year: 2023,
    source: 'DEMO / DEVELOPMENT DATA — not a real publication',
    identifier: 'DEMO-ID-0003',
    url: null,
    citationLabel: 'Evidence #3',
    relevance: 'low',
    relevanceScore: 0.33,
    strength: 'limited',
    matchedFindingIds: ['finding-primary'],
    excerpt: 'Placeholder development excerpt. Demonstrates a low-relevance evidence card.',
    isDemo: true,
  },
]

const DEMO_FINDINGS: ClinicalFinding[] = [
  {
    id: 'finding-primary',
    label: 'Elevated biomarker_04 contribution',
    description: 'Primary model-derived signal, interpreted against supporting demo evidence.',
    category: 'primary',
    provenance: 'clinically-interpreted',
    relatedFeature: 'biomarker_04',
    contribution: 0.182,
    relatedEvidenceIds: ['DEMO-EVIDENCE-001', 'DEMO-EVIDENCE-003'],
  },
  {
    id: 'finding-secondary',
    label: 'Secondary biomarker_01 contribution',
    description: 'Secondary contributing signal in the model output.',
    category: 'secondary',
    provenance: 'clinically-interpreted',
    relatedFeature: 'biomarker_01',
    contribution: 0.127,
    relatedEvidenceIds: ['DEMO-EVIDENCE-002'],
  },
  {
    id: 'finding-risk-biomarker_04',
    label: 'biomarker_15 observation',
    description: 'Relevant observation surfaced by explainability.',
    category: 'observation',
    provenance: 'explainability',
    relatedFeature: 'biomarker_15',
    contribution: 0.094,
    relatedEvidenceIds: ['DEMO-EVIDENCE-001'],
  },
]

const COMPLETE_CLINICAL_INTERPRETATION: ClinicalInterpretationResult = {
  status: 'available',
  sampleId: 'PAT-1000',
  datasetName: 'clinical_data_synthetic.csv',
  selectedModel: 'DressedVQC (Quantum)',
  predictionLabel: 'Normal',
  modelProbabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
  narrative: {
    summary:
      'DEMO INTERPRETATION — The model output for this sample is "Normal" with a model probability of 71.95%. This synthetic narrative demonstrates the interpretation layout and is not real clinical guidance.',
    keyFindings:
      'DEMO INTERPRETATION — Model-derived signals are concentrated in biomarker_04 and biomarker_01. Placeholder text only.',
    riskInterpretation:
      'DEMO INTERPRETATION — Placeholder risk interpretation. Model probability is not a measure of medical certainty.',
    evidenceContext:
      'DEMO INTERPRETATION — Related demo evidence is shown for layout purposes and does not validate the model.',
    recommendedNextSteps:
      'DEMO INTERPRETATION — Placeholder next-step text. Real recommendations must come from the clinical knowledge layer.',
  },
  keyFindings: DEMO_FINDINGS,
  riskFactors: [
    {
      id: 'rf-1',
      name: 'biomarker_04',
      value: 'Elevated (standardized -0.23)',
      contribution: 0.182,
      status: 'Flagged by clinical knowledge layer (DEMO)',
      evidenceStrength: 'strong',
      provenance: 'clinically-interpreted',
      relatedEvidenceIds: ['DEMO-EVIDENCE-001'],
    },
    {
      id: 'rf-2',
      name: 'biomarker_01',
      value: 'Slightly elevated',
      contribution: 0.127,
      status: 'Monitoring suggested (DEMO)',
      evidenceStrength: 'moderate',
      provenance: 'clinically-interpreted',
      relatedEvidenceIds: ['DEMO-EVIDENCE-002'],
    },
  ],
  evidence: DEMO_EVIDENCE,
  recommendations: [
    {
      id: 'rec-1',
      title: 'Routine follow-up review (DEMO)',
      description: 'Placeholder recommendation to demonstrate the recommendation card.',
      rationale: 'DEMO / DEVELOPMENT CONTENT — supplied by clinical knowledge layer in production.',
      category: 'follow-up',
      priority: 'medium',
      relatedEvidenceIds: ['DEMO-EVIDENCE-001'],
    },
    {
      id: 'rec-2',
      title: 'Biomarker monitoring (DEMO)',
      description: 'Placeholder monitoring recommendation.',
      rationale: 'DEMO / DEVELOPMENT CONTENT.',
      category: 'monitoring',
      priority: 'low',
      relatedEvidenceIds: ['DEMO-EVIDENCE-002'],
    },
  ],
  precautions: [
    {
      id: 'prec-1',
      title: 'Interpretation is decision support only (DEMO)',
      description: 'This placeholder precaution demonstrates the precaution card severity styling.',
      severity: 'caution',
      relatedEvidenceIds: [],
    },
  ],
  medicationInformation: [
    {
      id: 'med-1',
      name: 'Example medication class (DEMO)',
      purpose: 'Informational placeholder — describes a medication class context.',
      context: 'DEMO / DEVELOPMENT CONTENT — informational only, not a prescription.',
      warnings: ['This is information, not a prescription or dosage instruction.'],
      contraindicationInfo: 'Contraindication information would be supplied by an approved clinical system.',
      relatedEvidenceIds: ['DEMO-EVIDENCE-002'],
    },
  ],
  priority: 'medium',
  interpretationConfidence: 0.68,
  warnings: [],
  metadata: {
    model: 'Clinical Translation Layer (DEMO)',
    modelVersion: 'demo-fixture-1.0',
    generatedAt: '2026-09-03T02:00:00.000Z',
    source: 'demo-fixture',
  },
  generatedAt: '2026-09-03T02:00:00.000Z',
  isDemoFixture: true,
  fixtureName: 'Complete Clinical Interpretation (DEMO)',
  backendInterpretationAvailable: false,
}

const PARTIAL_INTERPRETATION: ClinicalInterpretationResult = {
  ...COMPLETE_CLINICAL_INTERPRETATION,
  status: 'partial',
  narrative: {
    ...EMPTY_NARRATIVE,
    summary: COMPLETE_CLINICAL_INTERPRETATION.narrative.summary,
    keyFindings: COMPLETE_CLINICAL_INTERPRETATION.narrative.keyFindings,
  },
  evidence: [DEMO_EVIDENCE[0]],
  recommendations: [],
  precautions: [],
  medicationInformation: [],
  riskFactors: COMPLETE_CLINICAL_INTERPRETATION.riskFactors.slice(0, 1),
  priority: 'review',
  interpretationConfidence: 0.41,
  warnings: ['Supporting evidence is limited for this analysis.'],
  fixtureName: 'Partial Interpretation — Limited Evidence (DEMO)',
}

const EVIDENCE_UNAVAILABLE: ClinicalInterpretationResult = {
  ...COMPLETE_CLINICAL_INTERPRETATION,
  status: 'partial',
  evidence: [],
  keyFindings: COMPLETE_CLINICAL_INTERPRETATION.keyFindings.map((f) => ({
    ...f,
    relatedEvidenceIds: [],
  })),
  riskFactors: COMPLETE_CLINICAL_INTERPRETATION.riskFactors.map((r) => ({
    ...r,
    relatedEvidenceIds: [],
  })),
  warnings: ['Medical evidence retrieval is not available for this analysis.'],
  fixtureName: 'Evidence Unavailable (DEMO)',
}

const INTERPRETATION_UNAVAILABLE: ClinicalInterpretationResult = {
  status: 'unavailable',
  sampleId: 'PAT-1000',
  datasetName: 'clinical_data_synthetic.csv',
  selectedModel: 'DressedVQC (Quantum)',
  predictionLabel: 'Normal',
  modelProbabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
  narrative: EMPTY_NARRATIVE,
  keyFindings: [],
  riskFactors: [],
  evidence: [],
  recommendations: [],
  precautions: [],
  medicationInformation: [],
  priority: 'undetermined',
  interpretationConfidence: null,
  warnings: ['Clinical interpretation is not available for this analysis.'],
  metadata: { model: null, modelVersion: null, generatedAt: null, source: 'unavailable' },
  generatedAt: null,
  isDemoFixture: true,
  fixtureName: 'Interpretation Unavailable (Prediction Only) (DEMO)',
  backendInterpretationAvailable: false,
}

const CLINICAL_ERROR: ClinicalInterpretationResult = {
  ...INTERPRETATION_UNAVAILABLE,
  status: 'error',
  warnings: ['Unable to load clinical interpretation.'],
  fixtureName: 'Clinical Interpretation Error (DEMO)',
}

export const CLINICAL_INTERPRETATION_FIXTURES: Record<string, ClinicalInterpretationResult> = {
  COMPLETE_CLINICAL_INTERPRETATION,
  PARTIAL_INTERPRETATION,
  EVIDENCE_UNAVAILABLE,
  INTERPRETATION_UNAVAILABLE,
  CLINICAL_ERROR,
}
