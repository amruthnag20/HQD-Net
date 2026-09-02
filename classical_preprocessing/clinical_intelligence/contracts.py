"""
Post-Quantum Clinical Intelligence Data Contracts & Boundary Adapters (Phase 1).

Defines strongly typed, immutable data contracts representing:
1. Ground-truth HQD-Net engine output (PostQuantumResult & child dataclasses)
2. Future evidence-grounded clinical report schema (ClinicalReport & EvidenceItem)

Provides validation rules ensuring mathematical bounds, non-negativity, finite-value
guarantees, and strict immutability without modifying quantum or classical core models.
"""

from dataclasses import dataclass, field
import math
from typing import Any, Dict, List, Optional, Tuple, Union


@dataclass(frozen=True)
class QuantumPrediction:
    """
    Immutable representation of the 10-qubit VQC model prediction.
    """

    risk_score: float
    risk_percentage: str
    verdict: str

    def __post_init__(self):
        if not math.isfinite(self.risk_score):
            raise ValueError(f"Quantum risk_score must be a finite float, got {self.risk_score}")
        if not (0.0 <= self.risk_score <= 1.0):
            raise ValueError(f"Quantum risk_score must be in range [0.0, 1.0], got {self.risk_score}")
        if not isinstance(self.verdict, str) or not self.verdict.strip():
            raise ValueError("Quantum verdict must be a non-empty string.")


@dataclass(frozen=True)
class ClinicalPrediction:
    """
    Immutable representation of classical baseline model predictions.
    """

    svm_risk: float
    random_forest_risk: Optional[float] = None

    def __post_init__(self):
        if not math.isfinite(self.svm_risk):
            raise ValueError(f"Classical svm_risk must be a finite float, got {self.svm_risk}")
        if not (0.0 <= self.svm_risk <= 1.0):
            raise ValueError(f"Classical svm_risk must be in range [0.0, 1.0], got {self.svm_risk}")

        if self.random_forest_risk is not None:
            if not math.isfinite(self.random_forest_risk):
                raise ValueError(f"Classical random_forest_risk must be a finite float, got {self.random_forest_risk}")
            if not (0.0 <= self.random_forest_risk <= 1.0):
                raise ValueError(
                    f"Classical random_forest_risk must be in range [0.0, 1.0], got {self.random_forest_risk}"
                )


@dataclass(frozen=True)
class ModelComparison:
    """
    Immutable benchmarking comparison between quantum VQC and classical baselines.
    """

    quantum_risk_score: float
    classical_svm_risk: float
    classical_rf_risk: Optional[float]
    quantum_lift_over_svm: float

    def __post_init__(self):
        if not math.isfinite(self.quantum_risk_score) or not (0.0 <= self.quantum_risk_score <= 1.0):
            raise ValueError(f"Invalid quantum_risk_score in ModelComparison: {self.quantum_risk_score}")
        if not math.isfinite(self.classical_svm_risk) or not (0.0 <= self.classical_svm_risk <= 1.0):
            raise ValueError(f"Invalid classical_svm_risk in ModelComparison: {self.classical_svm_risk}")
        if not math.isfinite(self.quantum_lift_over_svm):
            raise ValueError(f"quantum_lift_over_svm must be a finite float, got {self.quantum_lift_over_svm}")


@dataclass(frozen=True)
class ExplainabilityAttribution:
    """
    Immutable representation of single biomarker QuXAI Jacobian sensitivity attribution.
    """

    biomarker: str
    attribution_weight: float
    impact_percentage: str

    def __post_init__(self):
        if not isinstance(self.biomarker, str) or not self.biomarker.strip():
            raise ValueError("Biomarker label must be a non-empty string.")
        if not math.isfinite(self.attribution_weight):
            raise ValueError(f"attribution_weight must be a finite float, got {self.attribution_weight}")
        if self.attribution_weight < 0.0:
            raise ValueError(f"attribution_weight cannot be negative, got {self.attribution_weight}")


@dataclass(frozen=True)
class PostQuantumResult:
    """
    Master immutable data contract encapsulating the verified engine output.
    Serves as the strict boundary payload passed to the clinical intelligence layer.
    """

    sample_id: str
    active_modalities: Tuple[str, ...]
    quantum_prediction: QuantumPrediction
    classical_prediction: ClinicalPrediction
    model_comparison: ModelComparison
    explainability: Tuple[ExplainabilityAttribution, ...]
    telemetry_logs: Tuple[str, ...] = field(default_factory=tuple)
    latent_vector_10d: Optional[Tuple[float, ...]] = None

    def __post_init__(self):
        if not isinstance(self.sample_id, str) or not self.sample_id.strip():
            raise ValueError("sample_id must be a non-empty string.")

        if not isinstance(self.active_modalities, tuple) or len(self.active_modalities) == 0:
            raise ValueError("active_modalities must be a non-empty tuple of modality strings.")

        if self.latent_vector_10d is not None:
            if not isinstance(self.latent_vector_10d, tuple):
                raise ValueError("latent_vector_10d must be a tuple if provided.")
            if len(self.latent_vector_10d) != 10:
                raise ValueError(
                    f"latent_vector_10d must contain exactly 10 dimensions, got {len(self.latent_vector_10d)}"
                )
            if not all(math.isfinite(val) for val in self.latent_vector_10d):
                raise ValueError("latent_vector_10d contains non-finite values.")

        if len(self.explainability) > 0:
            total_weight = sum(item.attribution_weight for item in self.explainability)
            if not math.isclose(total_weight, 1.0, abs_tol=0.05) and not math.isclose(total_weight, 0.0, abs_tol=1e-6):
                raise ValueError(f"Explainability attributions sum to {total_weight}, expected ~1.0")


class ProvenanceStatus:
    VERIFIED_PRIMARY = "VERIFIED_PRIMARY"
    VERIFIED_SECONDARY = "VERIFIED_SECONDARY"
    DEMO_SYNTHETIC = "DEMO_SYNTHETIC"
    UNKNOWN = "UNKNOWN"

    ALL_STATUSES = {VERIFIED_PRIMARY, VERIFIED_SECONDARY, DEMO_SYNTHETIC, UNKNOWN}


@dataclass(frozen=True)
class EvidenceItem:
    """
    Immutable representation of retrieved medical literature / document evidence provenance.
    """

    document_title: str
    source: str
    excerpt: str
    relevance_score: float
    page: Optional[int] = None
    section: Optional[str] = None
    publication_year: Optional[int] = None
    reranking_score: Optional[float] = None
    provenance_status: str = ProvenanceStatus.DEMO_SYNTHETIC
    document_id: Optional[str] = None
    source_url: Optional[str] = None
    doi: Optional[str] = None
    pmid: Optional[str] = None
    authors: Optional[str] = None
    publisher: Optional[str] = None
    license: Optional[str] = None

    def __post_init__(self):
        if not isinstance(self.document_title, str) or not self.document_title.strip():
            raise ValueError("document_title must be a non-empty string.")
        if not isinstance(self.source, str) or not self.source.strip():
            raise ValueError("source must be a non-empty string.")
        if not isinstance(self.excerpt, str) or not self.excerpt.strip():
            raise ValueError("excerpt must be a non-empty string.")
        if not math.isfinite(self.relevance_score) or not (0.0 <= self.relevance_score <= 1.0):
            raise ValueError(f"relevance_score must be a finite float in [0.0, 1.0], got {self.relevance_score}")
        if self.reranking_score is not None and not math.isfinite(self.reranking_score):
            raise ValueError(f"reranking_score must be a finite float, got {self.reranking_score}")
        if self.provenance_status not in ProvenanceStatus.ALL_STATUSES:
            raise ValueError(f"Invalid provenance_status: {self.provenance_status}")


@dataclass(frozen=True)
class ClinicalReport:
    """
    Immutable schema representing the structured medical report generated by the
    Post-Quantum Clinical Intelligence layer.
    """

    sample_id: str
    diagnostic_summary: str
    risk_assessment_interpretation: str
    primary_biomarker_analysis: Tuple[Dict[str, str], ...]
    retrieved_evidence: Tuple[EvidenceItem, ...] = field(default_factory=tuple)
    clinical_recommendations: Tuple[str, ...] = field(default_factory=tuple)
    limitations_and_disclaimer: str = (
        "This report is generated for clinical decision support. Final diagnostic authority "
        "remains solely with the attending licensed medical practitioner."
    )

    def __post_init__(self):
        if not isinstance(self.sample_id, str) or not self.sample_id.strip():
            raise ValueError("sample_id must be a non-empty string.")
        if not isinstance(self.diagnostic_summary, str) or not self.diagnostic_summary.strip():
            raise ValueError("diagnostic_summary must be a non-empty string.")
        if not isinstance(self.risk_assessment_interpretation, str) or not self.risk_assessment_interpretation.strip():
            raise ValueError("risk_assessment_interpretation must be a non-empty string.")


def post_quantum_result_from_payload(payload: Dict[str, Any]) -> PostQuantumResult:
    """
    Adapter function mapping existing HQD-Net runtime dictionary payload into a validated,
    immutable PostQuantumResult contract instance.

    Parameters
    ----------
    payload : Dict[str, Any]
        Dictionary returned by run_hqd_real_pipeline() or HQDNetPipelineRunner.

    Returns
    -------
    PostQuantumResult
        Validated immutable contract instance.
    """
    if not isinstance(payload, dict):
        raise TypeError(f"Expected dictionary payload, got {type(payload).__name__}")

    meta = payload.get("meta_summary", {})
    sample_ids = meta.get("sample_ids", ["PATIENT_001"])
    sample_id = str(sample_ids[0]) if sample_ids else "PATIENT_001"
    active_modalities = tuple(meta.get("active_modalities", ["TABULAR"]))

    diag = payload.get("diagnostic_prediction", {})
    risk_score = float(diag.get("disease_risk_score", 0.0))
    risk_percentage = str(diag.get("risk_percentage", f"{risk_score * 100:.1f}%"))
    verdict = str(diag.get("verdict", "Unknown Verdict"))

    q_pred = QuantumPrediction(
        risk_score=risk_score,
        risk_percentage=risk_percentage,
        verdict=verdict,
    )

    bench = payload.get("benchmarking_comparison", {})
    svm_risk = float(bench.get("classical_svm_risk", 0.0))
    rf_risk = float(bench.get("classical_rf_risk")) if bench.get("classical_rf_risk") is not None else None

    c_pred = ClinicalPrediction(
        svm_risk=svm_risk,
        random_forest_risk=rf_risk,
    )

    raw_lift = bench.get("quantum_lift_over_svm", "+0.00%")
    if isinstance(raw_lift, str):
        cleaned_lift = raw_lift.replace("%", "").replace("+", "").strip()
        try:
            lift_val = float(cleaned_lift)
        except ValueError:
            lift_val = (risk_score - svm_risk) * 100.0
    else:
        lift_val = float(raw_lift)

    m_comp = ModelComparison(
        quantum_risk_score=risk_score,
        classical_svm_risk=svm_risk,
        classical_rf_risk=rf_risk,
        quantum_lift_over_svm=lift_val,
    )

    raw_explain = payload.get("explainability_breakdown", [])
    explainability_list = []
    for item in raw_explain:
        biomarker = str(item.get("biomarker", "Unknown Biomarker"))
        weight = float(item.get("attribution_weight", 0.0))
        pct = str(item.get("impact_percentage", f"{weight * 100:.2f}%"))
        explainability_list.append(
            ExplainabilityAttribution(
                biomarker=biomarker,
                attribution_weight=weight,
                impact_percentage=pct,
            )
        )

    telemetry = tuple(payload.get("telemetry_logs", []))

    latent_data = payload.get("latent_representation", {})
    vec = latent_data.get("latent_biomarkers_vector")
    latent_tuple = tuple(float(v) for v in vec) if vec is not None else None

    return PostQuantumResult(
        sample_id=sample_id,
        active_modalities=active_modalities,
        quantum_prediction=q_pred,
        classical_prediction=c_pred,
        model_comparison=m_comp,
        explainability=tuple(explainability_list),
        telemetry_logs=telemetry,
        latent_vector_10d=latent_tuple,
    )


def post_quantum_result_to_dict(result: PostQuantumResult) -> Dict[str, Any]:
    """
    Serialize PostQuantumResult contract to a JSON-compatible primitive dictionary.
    """
    return {
        "sample_id": result.sample_id,
        "active_modalities": list(result.active_modalities),
        "quantum_prediction": {
            "risk_score": result.quantum_prediction.risk_score,
            "risk_percentage": result.quantum_prediction.risk_percentage,
            "verdict": result.quantum_prediction.verdict,
        },
        "classical_prediction": {
            "svm_risk": result.classical_prediction.svm_risk,
            "random_forest_risk": result.classical_prediction.random_forest_risk,
        },
        "model_comparison": {
            "quantum_risk_score": result.model_comparison.quantum_risk_score,
            "classical_svm_risk": result.model_comparison.classical_svm_risk,
            "classical_rf_risk": result.model_comparison.classical_rf_risk,
            "quantum_lift_over_svm": result.model_comparison.quantum_lift_over_svm,
        },
        "explainability": [
            {
                "biomarker": item.biomarker,
                "attribution_weight": item.attribution_weight,
                "impact_percentage": item.impact_percentage,
            }
            for item in result.explainability
        ],
        "telemetry_logs": list(result.telemetry_logs),
        "latent_vector_10d": list(result.latent_vector_10d) if result.latent_vector_10d is not None else None,
    }


def post_quantum_result_from_dict(d: Dict[str, Any]) -> PostQuantumResult:
    """
    Reconstruct PostQuantumResult contract instance from a JSON-compatible dictionary.
    """
    return PostQuantumResult(
        sample_id=str(d["sample_id"]),
        active_modalities=tuple(d["active_modalities"]),
        quantum_prediction=QuantumPrediction(
            risk_score=float(d["quantum_prediction"]["risk_score"]),
            risk_percentage=str(d["quantum_prediction"]["risk_percentage"]),
            verdict=str(d["quantum_prediction"]["verdict"]),
        ),
        classical_prediction=ClinicalPrediction(
            svm_risk=float(d["classical_prediction"]["svm_risk"]),
            random_forest_risk=float(d["classical_prediction"]["random_forest_risk"])
            if d["classical_prediction"].get("random_forest_risk") is not None
            else None,
        ),
        model_comparison=ModelComparison(
            quantum_risk_score=float(d["model_comparison"]["quantum_risk_score"]),
            classical_svm_risk=float(d["model_comparison"]["classical_svm_risk"]),
            classical_rf_risk=float(d["model_comparison"]["classical_rf_risk"])
            if d["model_comparison"].get("classical_rf_risk") is not None
            else None,
            quantum_lift_over_svm=float(d["model_comparison"]["quantum_lift_over_svm"]),
        ),
        explainability=tuple(
            ExplainabilityAttribution(
                biomarker=str(item["biomarker"]),
                attribution_weight=float(item["attribution_weight"]),
                impact_percentage=str(item["impact_percentage"]),
            )
            for item in d.get("explainability", [])
        ),
        telemetry_logs=tuple(d.get("telemetry_logs", [])),
        latent_vector_10d=tuple(float(v) for v in d["latent_vector_10d"])
        if d.get("latent_vector_10d") is not None
        else None,
    )

