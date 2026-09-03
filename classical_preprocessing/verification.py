"""
Model Verification & Disagreement Analysis Engine for HQD-Net.
Compares Classical and Quantum prediction outputs, computes risk differences,
assesses agreement/disagreement status, and builds structured audit records.
Does NOT force automatic winner selection.
"""

from typing import Any, Dict
from pydantic import BaseModel, Field


class DualModelVerificationResult(BaseModel):
    classical_risk_score: float
    quantum_risk_score: float
    absolute_difference: float
    percentage_difference: str
    agreement_status: str = Field(description="'AGREEMENT' or 'DISAGREEMENT'")
    verification_status: str = Field(description="Audit verification label")
    disagreement_analysis: str
    confidence_level: str
    feature_space_compatible: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()


def verify_dual_models(
    classical_risk: float,
    quantum_risk: float,
    threshold: float = 0.15
) -> DualModelVerificationResult:
    """
    Evaluates agreement/disagreement between Classical and Quantum models.
    """
    diff = abs(classical_risk - quantum_risk)
    pct_diff = f"{diff * 100:.2f}%"

    if diff <= threshold:
        agreement = "AGREEMENT"
        verification_status = "VERIFIED_CONCORDANCE"
        analysis = f"Classical ({classical_risk * 100:.1f}%) and Quantum ({quantum_risk * 100:.1f}%) predictions align within clinical tolerance (diff <= {threshold * 100:.0f}%)."
        confidence = "HIGH"
    else:
        agreement = "DISAGREEMENT"
        verification_status = "UNVERIFIED_DISAGREEMENT_CLINICIAN_REVIEW_REQUIRED"
        analysis = (
            f"Concordance gap detected: Classical ({classical_risk * 100:.1f}%) vs "
            f"Quantum ({quantum_risk * 100:.1f}%) differ by {pct_diff}. "
            f"Case requires expert clinician evaluation."
        )
        confidence = "MODERATE_PENDING_REVIEW"

    return DualModelVerificationResult(
        classical_risk_score=classical_risk,
        quantum_risk_score=quantum_risk,
        absolute_difference=round(diff, 4),
        percentage_difference=pct_diff,
        agreement_status=agreement,
        verification_status=verification_status,
        disagreement_analysis=analysis,
        confidence_level=confidence,
        feature_space_compatible=True
    )
