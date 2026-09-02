"""
API Response Contract & Backend Serialization Layer (Phase 4).

Converts PostQuantumResult, EvidenceBundle, and ClinicalReport into stable, JSON-safe
payload structures for presentation layers and frontend consumption.
Preserves exact numerical precision (float scores), verdicts, QuXAI attributions, and evidence provenance.
"""

import os
from typing import Any, Dict, List, Optional
from classical_preprocessing.clinical_intelligence.contracts import (
    ClinicalReport,
    EvidenceItem,
    PostQuantumResult,
)
from classical_preprocessing.clinical_intelligence.evidence import EvidenceBundle


def build_api_response_payload(
    result: PostQuantumResult,
    evidence: EvidenceBundle,
    report: ClinicalReport,
) -> Dict[str, Any]:
    """
    Constructs a stable, JSON-safe API response payload encapsulating verified model diagnostic outputs,
    model comparisons, QuXAI sensitivity attributions, retrieved evidence, and the clinical report.

    Parameters
    ----------
    result : PostQuantumResult
        Verified engine output contract.
    evidence : EvidenceBundle
        Retrieved medical evidence items.
    report : ClinicalReport
        Evidence-grounded structured clinical report.

    Returns
    -------
    Dict[str, Any]
        JSON-serializable response payload.
    """
    if not isinstance(result, PostQuantumResult):
        raise TypeError(f"Expected PostQuantumResult, got {type(result).__name__}")
    if not isinstance(evidence, EvidenceBundle):
        raise TypeError(f"Expected EvidenceBundle, got {type(evidence).__name__}")
    if not isinstance(report, ClinicalReport):
        raise TypeError(f"Expected ClinicalReport, got {type(report).__name__}")

    q_pred = result.quantum_prediction
    c_pred = result.classical_prediction
    m_comp = result.model_comparison

    # 1. Diagnostic Predictions & Comparisons
    prediction_block = {
        "quantum": {
            "verdict": q_pred.verdict,
            "risk_score": q_pred.risk_score,
            "risk_percentage": q_pred.risk_percentage,
        },
        "classical": {
            "svm_risk_score": c_pred.svm_risk,
            "random_forest_risk_score": c_pred.random_forest_risk,
        },
    }

    comparison_block = {
        "quantum_lift_over_svm": m_comp.quantum_lift_over_svm,
    }

    # 2. QuXAI Explainability Attributions
    explainability_list = [
        {
            "biomarker": item.biomarker,
            "attribution_weight": item.attribution_weight,
            "impact_percentage": item.impact_percentage,
        }
        for item in result.explainability
    ]

    # 3. Retrieved Evidence Items
    evidence_list = [
        {
            "id": f"E{idx}",
            "document_title": item.document_title,
            "source": item.source,
            "page": item.page,
            "section": item.section,
            "publication_year": item.publication_year,
            "excerpt": item.excerpt,
            "relevance_score": item.relevance_score,
            "reranking_score": item.reranking_score,
            "provenance_status": item.provenance_status,
            "document_id": item.document_id,
            "source_url": item.source_url,
            "doi": item.doi,
            "pmid": item.pmid,
            "authors": item.authors,
            "publisher": item.publisher,
            "license": item.license,
        }
        for idx, item in enumerate(evidence.items, start=1)
    ]

    # 4. Structured Clinical Report
    clinical_report_block = {
        "sample_id": report.sample_id,
        "diagnostic_summary": report.diagnostic_summary,
        "risk_assessment_interpretation": report.risk_assessment_interpretation,
        "primary_biomarker_analysis": [dict(b) for b in report.primary_biomarker_analysis],
        "clinical_recommendations": list(report.clinical_recommendations),
        "limitations_and_disclaimer": report.limitations_and_disclaimer,
    }

    latent_vec = list(result.latent_vector_10d) if result.latent_vector_10d else [0.0] * 10

    # Assemble complete payload
    payload = {
        "status": "success",
        "sample_id": result.sample_id,
        "meta_summary": {
            "system_name": "HQD-Net OS",
            "active_modalities": list(result.active_modalities),
            "llm_mode": os.getenv("LLM_MODE", "mock").lower().strip(),
            "llm_status": "LIVE" if os.getenv("LLM_MODE", "mock").lower().strip() == "live" else "DEMO / MOCK",
        },
        "latent_representation": {
            "dimensions": 10,
            "latent_biomarkers_vector": latent_vec,
        },
        "prediction": prediction_block,
        "comparison": comparison_block,
        "explainability": explainability_list,
        "evidence": evidence_list,
        "clinical_report": clinical_report_block,
        # Legacy/UI Compatibility Keys
        "diagnostic_prediction": {
            "disease_risk_score": q_pred.risk_score,
            "risk_percentage": q_pred.risk_percentage,
            "verdict": q_pred.verdict,
        },
        "benchmarking_comparison": {
            "quantum_risk_score": q_pred.risk_score,
            "classical_svm_risk": c_pred.svm_risk,
            "classical_rf_risk": c_pred.random_forest_risk,
            "quantum_lift_over_svm": f"{m_comp.quantum_lift_over_svm:+.2f}%",
        },
        "explainability_breakdown": explainability_list,
        "generative_report": f"### 🩺 CLINICAL DIAGNOSTIC REPORT\n\n**Diagnostic Summary:** {report.diagnostic_summary}\n\n**Risk Assessment Interpretation:** {report.risk_assessment_interpretation}\n\n**Medical Disclaimer:** {report.limitations_and_disclaimer}",
        "telemetry_logs": [
            f"[1/4 Pipeline] Execution finished for sample {result.sample_id}.",
            f"[2/4 Quantum] Verified 10-qubit VQC risk score = {q_pred.risk_score:.4f}.",
            f"[3/4 RAG] Retrieved {len(evidence.items)} medical evidence items.",
            "[4/4 Clinical Report] Evidence-grounded interpretation generated.",
        ],
    }

    return payload


def build_api_error_payload(error_code: str, error_message: str) -> Dict[str, Any]:
    """
    Constructs a safe, controlled API error response without exposing internal stack traces or secrets.
    """
    return {
        "status": "error",
        "error_message": error_message,
        "error": {
            "code": error_code,
            "message": error_message,
        },
        "diagnostic_prediction": {
            "disease_risk_score": 0.50,
            "risk_percentage": "50.0%",
            "verdict": f"Analysis Error: {error_message}",
        },
        "latent_representation": {
            "dimensions": 10,
            "latent_biomarkers_vector": [0.0] * 10,
        },
        "explainability_breakdown": [],
        "generative_report": f"### ⚠️ CLINICAL ANALYSIS ERROR\n\nClinical analysis could not be completed: `{error_message}`",
        "telemetry_logs": [f"Error encountered: {error_message}"],
    }
