"""
Information Retention and Downstream Evaluation for Stage 8 10-D Projection.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import numpy as np
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import accuracy_score, r2_score
from sklearn.model_selection import train_test_split

from classical_preprocessing.unified_projection.alignment import align_multimodal_inputs
from classical_preprocessing.unified_projection.projector import Unified10DProjector


@dataclass
class ProjectionEvaluationReport:
    """
    Evaluation report assessing downstream clinical task signal retention through the 10-D bottleneck.
    """
    original_dimension: int
    projected_dimension: int = 10
    baseline_metric: float = 0.0
    projected_metric: float = 0.0
    retention_ratio: float = 0.0
    task_type: str = "classification"
    ablation_metrics: Dict[str, float] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


def evaluate_10d_projection(
    projector: Unified10DProjector,
    tabular: Any = None,
    image_2d: Any = None,
    image_3d: Any = None,
    y: Optional[Any] = None,
    sample_ids: Optional[List[str]] = None,
    test_size: float = 0.3,
    random_state: int = 42,
) -> ProjectionEvaluationReport:
    """
    Evaluate signal retention of 10-D multimodal projection on downstream task.

    Parameters
    ----------
    projector : Unified10DProjector
        Fitted Unified10DProjector instance.
    tabular : Any
        Tabular input.
    image_2d : Any
        2D image input.
    image_3d : Any
        3D image input.
    y : Optional[Any]
        Target labels.
    sample_ids : Optional[List[str]]
        Sample IDs.
    test_size : float
        Holdout test set fraction.
    random_state : int
        Random seed.

    Returns
    -------
    ProjectionEvaluationReport
    """
    batch = align_multimodal_inputs(tabular, image_2d, image_3d, sample_ids=sample_ids)

    if y is None:
        return ProjectionEvaluationReport(
            original_dimension=batch.metadata["d_tabular"] + batch.metadata["d_image_2d"] + batch.metadata["d_image_3d"],
            projected_dimension=10,
            metadata={"status": "No target labels provided; task performance evaluation skipped."},
        )

    y_arr = np.asarray(y)
    if y_arr.ndim > 1:
        y_arr = y_arr.ravel()

    # Form raw concatenated feature matrix for baseline evaluation
    fused_list = []
    if batch.tabular is not None:
        fused_list.append(batch.tabular)
    if batch.image_2d is not None:
        fused_list.append(batch.image_2d)
    if batch.image_3d is not None:
        fused_list.append(batch.image_3d)

    fused_list.append(batch.presence_mask.astype(np.float64))
    x_raw = np.hstack(fused_list)
    orig_dim = x_raw.shape[1]

    # Transform to 10-D representation
    rep_obj = projector.transform(tabular, image_2d, image_3d, sample_ids=sample_ids)
    x_10d = rep_obj.representation

    is_classification = np.issubdtype(y_arr.dtype, np.integer) or len(np.unique(y_arr)) < 10
    task_type = "classification" if is_classification else "regression"

    # Train / test split
    x_raw_tr, x_raw_te, x_10d_tr, x_10d_te, y_tr, y_te = train_test_split(
        x_raw, x_10d, y_arr, test_size=test_size, random_state=random_state
    )

    if is_classification:
        clf_raw = LogisticRegression(max_iter=500, random_state=random_state)
        clf_raw.fit(x_raw_tr, y_tr)
        base_metric = float(accuracy_score(y_te, clf_raw.predict(x_raw_te)))

        clf_10d = LogisticRegression(max_iter=500, random_state=random_state)
        clf_10d.fit(x_10d_tr, y_tr)
        proj_metric = float(accuracy_score(y_te, clf_10d.predict(x_10d_te)))
    else:
        reg_raw = Ridge(random_state=random_state)
        reg_raw.fit(x_raw_tr, y_tr)
        base_metric = float(r2_score(y_te, reg_raw.predict(x_raw_te)))

        reg_10d = Ridge(random_state=random_state)
        reg_10d.fit(x_10d_tr, y_tr)
        proj_metric = float(r2_score(y_te, reg_10d.predict(x_10d_te)))

    retention = (proj_metric / base_metric) if abs(base_metric) > 1e-6 else 1.0

    return ProjectionEvaluationReport(
        original_dimension=orig_dim,
        projected_dimension=10,
        baseline_metric=base_metric,
        projected_metric=proj_metric,
        retention_ratio=retention,
        task_type=task_type,
        metadata={"total_samples": len(y_arr)},
    )
