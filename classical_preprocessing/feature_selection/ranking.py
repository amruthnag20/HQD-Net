"""
Rank aggregation logic for multi-signal feature selection.
"""

from typing import List
import numpy as np
import pandas as pd


def compute_normalized_ranks(scores: np.ndarray, feature_names: List[str]) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute 1-based ranks and normalized [0, 1] relative scores for a feature score array.

    Rank 1 corresponds to the highest score.
    Ties are broken deterministically by feature name.

    Returns
    -------
    Tuple[np.ndarray, np.ndarray]
        (1-based integer ranks, normalized [0, 1] score array)
    """
    n = len(feature_names)
    if n == 0:
        return np.array([], dtype=int), np.array([], dtype=float)
    if n == 1:
        return np.array([1], dtype=int), np.array([1.0], dtype=float)

    # Sort tuples of (-score, feature_name) to achieve deterministic order
    sorted_items = sorted(
        range(n),
        key=lambda i: (-float(scores[i]), str(feature_names[i])),
    )

    ranks = np.zeros(n, dtype=int)
    norm_scores = np.zeros(n, dtype=float)

    for rank_idx, feature_idx in enumerate(sorted_items):
        rank_val = rank_idx + 1  # 1-based
        ranks[feature_idx] = rank_val
        norm_scores[feature_idx] = 1.0 - (rank_idx / (n - 1))

    return ranks, norm_scores


def aggregate_signal_rankings(
    feature_names: List[str],
    mi_scores: np.ndarray,
    l1_scores: np.ndarray,
    rf_scores: np.ndarray,
    top_k: int,
) -> pd.DataFrame:
    """
    Combine Mutual Information, L1, and Random Forest scores into an aggregate ranking DataFrame.

    Parameters
    ----------
    feature_names : List[str]
        Feature names.
    mi_scores : np.ndarray
        Raw MI scores.
    l1_scores : np.ndarray
        Raw L1 scores.
    rf_scores : np.ndarray
        Raw RF scores.
    top_k : int
        Number of top features to mark as selected.

    Returns
    -------
    pd.DataFrame
        DataFrame with columns:
        ['feature', 'mi_score', 'l1_score', 'rf_score', 'mi_rank', 'l1_rank', 'rf_rank', 'aggregate_score', 'final_rank', 'selected']
    """
    n = len(feature_names)
    mi_ranks, mi_norm = compute_normalized_ranks(mi_scores, feature_names)
    l1_ranks, l1_norm = compute_normalized_ranks(l1_scores, feature_names)
    rf_ranks, rf_norm = compute_normalized_ranks(rf_scores, feature_names)

    agg_scores = (mi_norm + l1_norm + rf_norm) / 3.0

    # Final ranking order
    final_ranks, _ = compute_normalized_ranks(agg_scores, feature_names)

    df_rank = pd.DataFrame({
        "feature": feature_names,
        "mi_score": mi_scores,
        "l1_score": l1_scores,
        "rf_score": rf_scores,
        "mi_rank": mi_ranks,
        "l1_rank": l1_ranks,
        "rf_rank": rf_ranks,
        "aggregate_score": agg_scores,
        "final_rank": final_ranks,
    })

    df_rank = df_rank.sort_values(by=["final_rank", "feature"], ascending=[True, True]).reset_index(drop=True)
    df_rank["selected"] = df_rank["final_rank"] <= top_k

    return df_rank
