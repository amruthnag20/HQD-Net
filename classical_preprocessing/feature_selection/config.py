"""
Configuration dataclass for Phase 1 Multi-Signal Feature Selection.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FeatureSelectionConfig:
    """
    Configuration options for multi-signal feature selection.
    """
    top_k: int = 10
    random_state: int = 42
    l1_c_or_alpha: float = 1.0  # C for LogisticRegression, alpha for Lasso
    rf_n_estimators: int = 100
    group_aggregation_method: str = "max"  # 'max' or 'sum' for grouped one-hot features
    task_type: Optional[str] = None  # 'classification', 'regression', or None (auto-detect)
