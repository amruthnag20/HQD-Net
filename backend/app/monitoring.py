"""
Model Monitoring & Retraining Trigger Engine for HQD-Net.
Calculates performance metrics from accumulated clinician feedback.
Evaluates safe retraining triggers without auto-overwriting production models.
"""

from typing import Any, Dict
from backend.app.feedback_db import get_all_feedback


def calculate_monitoring_metrics() -> Dict[str, Any]:
    """
    Computes monitoring metrics based on clinician feedback audit logs.
    Distinguishes feedback count from ground-truth labeled datasets.
    """
    records = get_all_feedback()
    total_feedback = len(records)

    if total_feedback == 0:
        return {
            "total_feedback_count": 0,
            "clinician_agreement_rate": "N/A",
            "clinician_override_rate": "N/A",
            "ground_truth_label_count": 0,
            "model_drift_status": "NORMAL_BASELINE",
            "retraining_recommended": False,
            "status_message": "No clinician feedback recorded yet."
        }

    agreed = sum(1 for r in records if r.get("clinician_decision") == "AGREE")
    overridden = sum(1 for r in records if r.get("clinician_decision") == "OVERRIDE")
    has_ground_truth = sum(1 for r in records if r.get("clinician_correction") is not None)

    agreement_rate = (agreed / total_feedback) * 100.0
    override_rate = (overridden / total_feedback) * 100.0

    # Retraining trigger condition: >= 10 feedback entries AND override rate >= 20%
    retraining_trigger = (total_feedback >= 10 and override_rate >= 20.0)

    drift_status = "ELEVATED_OVERRIDE_RATE" if override_rate >= 20.0 else "NORMAL_STABLE"

    return {
        "total_feedback_count": total_feedback,
        "clinician_agreement_count": agreed,
        "clinician_override_count": overridden,
        "clinician_agreement_rate": f"{agreement_rate:.1f}%",
        "clinician_override_rate": f"{override_rate:.1f}%",
        "ground_truth_label_count": has_ground_truth,
        "model_drift_status": drift_status,
        "retraining_recommended": retraining_trigger,
        "retraining_trigger_conditions": {
            "min_feedback_threshold": 10,
            "max_override_threshold": "20.0%",
            "current_override": f"{override_rate:.1f}%"
        },
        "status_message": "Retraining job recommended" if retraining_trigger else "Model operating within stable clinical parameters."
    }
