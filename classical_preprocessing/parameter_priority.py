"""
Parameter Priority Engine for HQD-Net.
Ranks candidate parameters using multi-signal scoring (completeness, clinical relevance,
model feature relevance, abnormality, evidence relevance, modality confidence).
Deterministic and auditable.
"""

from typing import Any, Dict, List
from pydantic import BaseModel, Field
from classical_preprocessing.candidate_parameters import CandidateParameter


class RankedParameter(BaseModel):
    parameter_name: str
    value: Any
    unit: str
    priority_score: float
    rank: int
    reason: str
    clinical_category: str
    source: str


def compute_parameter_priority_scores(
    candidates: List[CandidateParameter]
) -> List[RankedParameter]:
    """
    Ranks candidate parameters using multi-signal weighted scoring.
    """
    # Baseline clinical relevance weights for CVD pipeline
    category_weights = {
        "vital_sign": 0.95,
        "lab_result": 0.90,
        "anthropometric": 0.85,
        "demographic": 0.75,
        "lifestyle": 0.70,
        "imaging": 0.88,
        "ecg": 0.92,
    }

    scored_list = []

    for param in candidates:
        completeness = 1.0 if param.availability else 0.0
        cat_weight = category_weights.get(param.clinical_category, 0.70)
        confidence = param.confidence

        # Abnormality signal heuristics
        abnormality_boost = 0.0
        if param.name == "Systolic Blood Pressure" and isinstance(param.value, (int, float)):
            if param.value > 130 or param.value < 90:
                abnormality_boost = 0.15
        elif param.name == "Body Mass Index (BMI)" and isinstance(param.value, (int, float)):
            if param.value > 25.0:
                abnormality_boost = 0.10
        elif param.name == "Cholesterol Level" and isinstance(param.value, (int, float)):
            if param.value > 1:
                abnormality_boost = 0.12

        priority_score = min(1.0, round((cat_weight * 0.5) + (confidence * 0.3) + (completeness * 0.1) + abnormality_boost, 4))

        reason = (
            f"Category '{param.clinical_category}' weight ({cat_weight:.2f}) + "
            f"confidence ({confidence:.2f})"
        )
        if abnormality_boost > 0:
            reason += f" + clinical abnormality boost (+{abnormality_boost:.2f})"

        scored_list.append({
            "param": param,
            "score": priority_score,
            "reason": reason
        })

    # Sort deterministically by score descending, then parameter name
    scored_list.sort(key=lambda x: (x["score"], x["param"].name), reverse=True)

    ranked_results = []
    for idx, item in enumerate(scored_list):
        p = item["param"]
        ranked_results.append(RankedParameter(
            parameter_name=p.name,
            value=p.value,
            unit=p.unit or "",
            priority_score=item["score"],
            rank=idx + 1,
            reason=item["reason"],
            clinical_category=p.clinical_category,
            source=p.source
        ))

    return ranked_results
