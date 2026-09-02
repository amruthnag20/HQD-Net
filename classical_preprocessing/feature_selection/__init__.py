"""
Feature Selection package for Stage 4 Multi-Signal Supervised Selection.
"""

from classical_preprocessing.feature_selection.config import FeatureSelectionConfig
from classical_preprocessing.feature_selection.provenance import group_feature_scores
from classical_preprocessing.feature_selection.ranking import (
    aggregate_signal_rankings,
    compute_normalized_ranks,
)
from classical_preprocessing.feature_selection.selector import (
    MultiSignalFeatureSelector,
    MultiSignalSelectionResult,
)

__all__ = [
    "FeatureSelectionConfig",
    "MultiSignalFeatureSelector",
    "MultiSignalSelectionResult",
    "aggregate_signal_rankings",
    "compute_normalized_ranks",
    "group_feature_scores",
]
