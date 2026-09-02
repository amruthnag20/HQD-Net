"""
Clinical Query Builder (Phase 2).

Transforms PostQuantumResult contracts into clinically structured search queries
for evidence retrieval. Strictly isolates latent_vector_10d and quantum telemetry.
"""

from dataclasses import dataclass
from typing import Tuple
from classical_preprocessing.clinical_intelligence.contracts import PostQuantumResult


@dataclass(frozen=True)
class ClinicalQuery:
    """
    Immutable representation of a structured clinical evidence search query.
    """

    query_string: str
    key_biomarkers: Tuple[str, ...]
    verdict: str
    active_modalities: Tuple[str, ...]
    risk_level: str

    def __post_init__(self):
        if not isinstance(self.query_string, str) or not self.query_string.strip():
            raise ValueError("query_string must be a non-empty string.")
        if not isinstance(self.verdict, str) or not self.verdict.strip():
            raise ValueError("verdict must be a non-empty string.")


class ClinicalQueryBuilder:
    """
    Deterministic query builder converting PostQuantumResult into clinical search queries.
    """

    @staticmethod
    def build_query(result: PostQuantumResult, top_n_biomarkers: int = 3) -> ClinicalQuery:
        """
        Builds a structured ClinicalQuery from a PostQuantumResult instance.

        Parameters
        ----------
        result : PostQuantumResult
            Verified runtime engine contract.
        top_n_biomarkers : int
            Number of top QuXAI explainability biomarkers to include in query.

        Returns
        -------
        ClinicalQuery
            Structured evidence query.
        """
        if not isinstance(result, PostQuantumResult):
            raise TypeError(f"Expected PostQuantumResult, got {type(result).__name__}")

        # Explicit safety check: latent_vector_10d and telemetry logs are strictly isolated
        # and NOT included in the query string.

        # Sort explainability attributions by weight descending
        sorted_attributions = sorted(result.explainability, key=lambda x: x.attribution_weight, reverse=True)
        top_biomarkers = tuple(item.biomarker for item in sorted_attributions[:top_n_biomarkers])

        verdict = result.quantum_prediction.verdict
        risk_score = result.quantum_prediction.risk_score

        if risk_score >= 0.75:
            risk_level = "High Risk"
        elif risk_score >= 0.40:
            risk_level = "Moderate Risk"
        else:
            risk_level = "Low Risk"

        biomarker_str = " ".join(top_biomarkers) if top_biomarkers else "cardiovascular clinical biomarkers"
        modality_str = " ".join(result.active_modalities)

        # Construct deterministic search query string
        query_string = f"{verdict} {risk_level} {biomarker_str} {modality_str}".strip()

        return ClinicalQuery(
            query_string=query_string,
            key_biomarkers=top_biomarkers,
            verdict=verdict,
            active_modalities=result.active_modalities,
            risk_level=risk_level,
        )
