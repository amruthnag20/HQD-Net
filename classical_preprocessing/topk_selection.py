"""
TOP-K Parameter Selection & Shared Preprocessing Stage for HQD-Net.
Selects top-K parameters from ranked candidate space, outputs selection audit,
and formats feature matrix for 10-D PCA projection.
"""

from typing import Any, Dict, List, Tuple
import numpy as np
from classical_preprocessing.parameter_priority import RankedParameter


def select_topk_parameters(
    ranked_parameters: List[RankedParameter],
    top_k: int = 10
) -> Tuple[List[RankedParameter], Dict[str, Any]]:
    """
    Selects top-K ranked parameters.
    Returns selected ranked list and selection audit metadata.
    """
    selected = ranked_parameters[:top_k]
    audit_metadata = {
        "configured_top_k": top_k,
        "total_candidate_count": len(ranked_parameters),
        "selected_feature_count": len(selected),
        "selected_feature_names": [p.parameter_name for p in selected],
        "top_feature_priority_score": selected[0].priority_score if selected else 0.0,
    }
    return selected, audit_metadata
