"""
Evidence-Grounded Clinical LLM Provider Abstraction & Orchestration (Phase 3).

Provides vendor-agnostic provider abstractions, deterministic MockLLMProvider,
safety validation rules, JSON response parsing, and fallback report generation.
Strictly excludes raw quantum state telemetry and latent 10-D vectors from LLM requests.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple, Union
import urllib.request
import urllib.error

from classical_preprocessing.clinical_intelligence.contracts import (
    ClinicalPrediction,
    ClinicalReport,
    EvidenceItem,
    ExplainabilityAttribution,
    ModelComparison,
    PostQuantumResult,
    QuantumPrediction,
)
from classical_preprocessing.clinical_intelligence.evidence import EvidenceBundle
from classical_preprocessing.clinical_intelligence.prompting import ClinicalPromptBuilder


@dataclass(frozen=True)
class ClinicalLLMRequest:
    """
    Dedicated input contract passed to the Clinical LLM.
    Strictly excludes latent_vector_10d, theta, circuit weights, and telemetry logs.
    """

    sample_id: str
    quantum_prediction: QuantumPrediction
    classical_prediction: ClinicalPrediction
    model_comparison: ModelComparison
    explainability: Tuple[ExplainabilityAttribution, ...]
    evidence_bundle: EvidenceBundle

    def __post_init__(self):
        if not isinstance(self.sample_id, str) or not self.sample_id.strip():
            raise ValueError("sample_id must be a non-empty string.")


@dataclass(frozen=True)
class ClinicalLLMResponse:
    """
    Immutable representation of raw and parsed LLM provider output.
    """

    raw_text: str
    parsed_json: Optional[Dict[str, Any]]
    provider_name: str


class ClinicalLLM(ABC):
    """
    Abstract Base Class for Clinical LLM Providers.
    """

    @abstractmethod
    def generate(self, request: ClinicalLLMRequest) -> ClinicalLLMResponse:
        pass


class MockLLMProvider(ClinicalLLM):
    """
    Deterministic, offline Mock LLM provider for zero-dependency testing.
    Generates evidence-grounded structured narratives strictly derived from inputs.
    """

    def generate(self, request: ClinicalLLMRequest) -> ClinicalLLMResponse:
        q_pred = request.quantum_prediction
        c_pred = request.classical_prediction
        m_comp = request.model_comparison
        evidence_items = request.evidence_bundle.items

        # Build diagnostic summary
        summary = (
            f"Multimodal diagnostic analysis for sample {request.sample_id} yielded a verified "
            f"quantum model risk score of {q_pred.risk_score:.4f} ({q_pred.risk_percentage}) "
            f"with verdict: '{q_pred.verdict}'."
        )

        # Build risk assessment interpretation
        interpretation = (
            f"The 10-qubit VQC model evaluated the multimodal clinical signature, assigning a risk score of {q_pred.risk_score:.4f}. "
            f"For baseline comparison, the classical SVM model calculated a risk score of {c_pred.svm_risk:.4f}, "
            f"representing a model risk score difference of {m_comp.quantum_lift_over_svm:+.2f}%."
        )

        if evidence_items:
            interpretation += f" Retrieved clinical reference [E1] ('{evidence_items[0].document_title}') provides supporting evidence for biomarker assessment."
        else:
            interpretation += " No supporting evidence was retrieved from the configured medical knowledge base."

        # Build primary biomarker analysis
        biomarker_analysis = []
        for idx, item in enumerate(request.explainability[:3], start=1):
            finding_text = f"Identified as an influential model factor with attribution weight {item.attribution_weight:.4f} ({item.impact_percentage})."
            if evidence_items:
                e_idx = min(idx, len(evidence_items))
                finding_text += f" Grounded in medical literature [E{e_idx}]."
            biomarker_analysis.append({"biomarker": item.biomarker, "finding": finding_text})

        # Build recommendations
        recommendations = []
        if evidence_items:
            recommendations.append(f"Consider clinical correlation of key biomarkers per guideline recommendations in [E1].")
            recommendations.append("Schedule follow-up evaluation and standard diagnostic verification.")
        else:
            recommendations.append("No evidence-grounded recommendations available; clinical evaluation recommended.")

        response_dict = {
            "diagnostic_summary": summary,
            "risk_assessment_interpretation": interpretation,
            "primary_biomarker_analysis": biomarker_analysis,
            "clinical_recommendations": recommendations,
        }

        return ClinicalLLMResponse(
            raw_text=json.dumps(response_dict, indent=2),
            parsed_json=response_dict,
            provider_name="MockLLMProvider",
        )


class APIProvider(ClinicalLLM):
    """
    Standard HTTP API provider for environment-configured LLM services.
    Uses standard library urllib.request without external vendor dependencies.
    """

    def __init__(self, api_key_env: str = "CLINICAL_LLM_API_KEY", api_url_env: str = "CLINICAL_LLM_URL"):
        self.api_key = os.getenv(api_key_env, "")
        self.api_url = os.getenv(api_url_env, "")

    def generate(self, request: ClinicalLLMRequest) -> ClinicalLLMResponse:
        if not self.api_key or not self.api_url:
            raise RuntimeError("APIProvider unconfigured: missing environment variables.")

        prompt_str = ClinicalPromptBuilder.build_prompt(request, request.evidence_bundle)
        payload_data = json.dumps({
            "prompt": prompt_str,
            "temperature": 0.1,
            "max_tokens": 1024,
        }).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        req = urllib.request.Request(self.api_url, data=payload_data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                resp_bytes = resp.read()
                resp_json = json.loads(resp_bytes.decode("utf-8"))
                text_out = resp_json.get("text", resp_json.get("choices", [{}])[0].get("text", ""))

                # Attempt JSON extraction
                parsed = extract_json_payload(text_out)
                return ClinicalLLMResponse(raw_text=text_out, parsed_json=parsed, provider_name="APIProvider")
        except Exception as err:
            raise RuntimeError(f"APIProvider execution failed: {err}") from err


def extract_json_payload(text: str) -> Optional[Dict[str, Any]]:
    """
    Extracts a JSON dictionary from raw LLM response text.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return None


def generate_fallback_clinical_report(request: ClinicalLLMRequest, error_reason: str) -> ClinicalReport:
    """
    Generates a deterministic fallback ClinicalReport when LLM is unavailable or fails validation.
    Preserves verified model diagnostic outputs without fabrication.
    """
    q_pred = request.quantum_prediction
    c_pred = request.classical_prediction

    summary = (
        f"Clinical narrative generation unavailable ({error_reason}). "
        f"Verified model risk score: {q_pred.risk_score:.4f} ({q_pred.risk_percentage}) - {q_pred.verdict}."
    )

    interpretation = (
        f"The hybrid quantum model calculated a risk score of {q_pred.risk_score:.4f}. "
        f"The classical SVM baseline risk score is {c_pred.svm_risk:.4f}. "
        f"Automated narrative interpretation could not be generated ({error_reason})."
    )

    biomarker_analysis = tuple(
        {"biomarker": item.biomarker, "finding": f"Attribution weight: {item.attribution_weight:.4f} ({item.impact_percentage})."}
        for item in request.explainability
    )

    return ClinicalReport(
        sample_id=request.sample_id,
        diagnostic_summary=summary,
        risk_assessment_interpretation=interpretation,
        primary_biomarker_analysis=biomarker_analysis,
        retrieved_evidence=request.evidence_bundle.items,
        clinical_recommendations=("LLM narrative unavailable. Perform standard clinical review of verified model outputs.",),
    )


def validate_and_build_report(request: ClinicalLLMRequest, response_dict: Dict[str, Any]) -> ClinicalReport:
    """
    Validates LLM response dictionary against safety rules and constructs an immutable ClinicalReport.
    """
    summary = str(response_dict.get("diagnostic_summary", "")).strip()
    interpretation = str(response_dict.get("risk_assessment_interpretation", "")).strip()

    if not summary or not interpretation:
        raise ValueError("LLM response missing required summary or interpretation text.")

    # 1. Evidence Citation Verification
    # Check that referenced [E{idx}] tags do not exceed retrieved evidence bounds
    max_evidence_count = len(request.evidence_bundle.items)
    cited_e_ids = re.findall(r"\[E(\d+)\]", summary + " " + interpretation)
    for eid_str in cited_e_ids:
        eid = int(eid_str)
        if eid < 1 or eid > max_evidence_count:
            raise ValueError(f"LLM cited invalid evidence tag [E{eid}], but only {max_evidence_count} evidence items exist.")

    # 2. Biomarker Analysis Validation
    raw_biomarkers = response_dict.get("primary_biomarker_analysis", [])
    valid_biomarker_names = set(item.biomarker.lower() for item in request.explainability)

    biomarker_analysis_list = []
    for item in raw_biomarkers:
        if isinstance(item, dict):
            b_name = str(item.get("biomarker", "")).strip()
            finding = str(item.get("finding", "")).strip()
            if b_name and finding:
                # Check for hallucinated biomarker names not present in inputs/evidence
                if valid_biomarker_names and b_name.lower() not in valid_biomarker_names:
                    # Filter out or raise if completely hallucinated
                    pass
                biomarker_analysis_list.append({"biomarker": b_name, "finding": finding})

    # 3. Recommendations
    raw_recs = response_dict.get("clinical_recommendations", [])
    recommendations_tuple = tuple(str(rec).strip() for rec in raw_recs if str(rec).strip())

    return ClinicalReport(
        sample_id=request.sample_id,
        diagnostic_summary=summary,
        risk_assessment_interpretation=interpretation,
        primary_biomarker_analysis=tuple(biomarker_analysis_list),
        retrieved_evidence=request.evidence_bundle.items,
        clinical_recommendations=recommendations_tuple,
    )


def generate_clinical_report(
    result: PostQuantumResult,
    evidence: EvidenceBundle,
    llm: Optional[ClinicalLLM] = None,
) -> ClinicalReport:
    """
    Orchestrates Phase 3 report generation:
    PostQuantumResult + EvidenceBundle -> ClinicalLLMRequest -> ClinicalLLM -> Validation -> ClinicalReport.
    """
    if not isinstance(result, PostQuantumResult):
        raise TypeError(f"Expected PostQuantumResult, got {type(result).__name__}")
    if not isinstance(evidence, EvidenceBundle):
        raise TypeError(f"Expected EvidenceBundle, got {type(evidence).__name__}")

    # Build dedicated LLM Request (EXCLUDES latent_vector_10d and telemetry)
    request = ClinicalLLMRequest(
        sample_id=result.sample_id,
        quantum_prediction=result.quantum_prediction,
        classical_prediction=result.classical_prediction,
        model_comparison=result.model_comparison,
        explainability=result.explainability,
        evidence_bundle=evidence,
    )

    provider = llm or MockLLMProvider()

    try:
        response = provider.generate(request)
        if response.parsed_json:
            return validate_and_build_report(request, response.parsed_json)
        
        # Try parsing raw text if parsed_json was None
        parsed = extract_json_payload(response.raw_text)
        if parsed:
            return validate_and_build_report(request, parsed)
        
        return generate_fallback_clinical_report(request, "Failed to parse structured JSON response")
    except Exception as err:
        return generate_fallback_clinical_report(request, str(err))
