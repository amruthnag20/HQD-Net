"""
Feature provenance and categorical grouping utilities for Stage 4 Feature Selection.
"""

from typing import Dict, List, Tuple
import numpy as np
import pandas as pd


def group_feature_scores(
    feature_names: List[str],
    transformed_scores: np.ndarray,
    numeric_cols: List[str],
    cat_cols: List[str],
    aggregation_method: str = "max",
) -> Tuple[List[str], np.ndarray, Dict[str, List[str]]]:
    """
    Aggregate feature scores for grouped one-hot categorical features.

    Parameters
    ----------
    feature_names : List[str]
        Transformed feature column names.
    transformed_scores : np.ndarray
        Scores per transformed feature.
    numeric_cols : List[str]
        List of original numeric feature column names.
    cat_cols : List[str]
        List of original categorical feature column names.
    aggregation_method : str
        'max' or 'sum' to aggregate scores across constituent dummy columns.

    Returns
    -------
    Tuple[List[str], np.ndarray, Dict[str, List[str]]]
        Grouped feature names, aggregated scores array, and source-to-transformed mapping.
    """
    source_map: Dict[str, List[str]] = {}

    # Map numeric columns
    for col in numeric_cols:
        if col in feature_names:
            source_map[col] = [col]

    # Map categorical columns
    for cat in cat_cols:
        matched = [fn for fn in feature_names if fn.startswith(f"{cat}_") or fn == cat]
        if matched:
            source_map[cat] = matched

    # Fallback for unmapped feature names
    all_mapped = set(f for sublist in source_map.values() for f in sublist)
    for fn in feature_names:
        if fn not in all_mapped:
            source_map[fn] = [fn]

    grouped_names = list(source_map.keys())
    grouped_scores = []

    name_to_idx = {fn: idx for idx, fn in enumerate(feature_names)}

    for group_name, constituent_cols in source_map.items():
        indices = [name_to_idx[fn] for fn in constituent_cols if fn in name_to_idx]
        if not indices:
            grouped_scores.append(0.0)
            continue

        constituent_values = transformed_scores[indices]
        if aggregation_method == "sum":
            grouped_scores.append(float(np.sum(constituent_values)))
        else:
            grouped_scores.append(float(np.max(constituent_values)))

    return grouped_names, np.array(grouped_scores, dtype=np.float64), source_map
