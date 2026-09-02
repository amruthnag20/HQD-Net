"""
Evaluation utilities for Stage 5 Tabular Information Retention & Downstream Task Signal Preservation.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import numpy as np
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import accuracy_score, f1_score, mean_squared_error, r2_score, roc_auc_score

from classical_preprocessing.compression.tabular_compressor import TabularCompressor


@dataclass
class InformationRetentionReport:
    """
    Structured report containing numerical metrics for PCA compression evaluation.
    """
    input_dimension: int
    compressed_dimension: int
    explained_variance_ratio: List[float]
    cumulative_explained_variance: float
    reconstruction_mse: float
    baseline_before_compression: Dict[str, float]
    baseline_after_compression: Dict[str, float]
    retention_decision: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


def evaluate_information_retention(
    compressor: TabularCompressor,
    X_train: np.ndarray,
    X_test: np.ndarray,
    y_train: Optional[np.ndarray] = None,
    y_test: Optional[np.ndarray] = None,
    task_type: str = "classification",
    random_state: int = 42,
) -> InformationRetentionReport:
    """
    Evaluate information retention and downstream task signal preservation before vs after PCA compression.

    Parameters
    ----------
    compressor : TabularCompressor
        Fitted compressor instance.
    X_train : np.ndarray
        Training feature matrix before compression.
    X_test : np.ndarray
        Test feature matrix before compression.
    y_train : Optional[np.ndarray]
        Training target vector.
    y_test : Optional[np.ndarray]
        Test target vector.
    task_type : str
        'classification' or 'regression'.
    random_state : int
        Random state for deterministic downstream models.

    Returns
    -------
    InformationRetentionReport
        Structured evaluation report comparing task performance before and after compression.
    """
    if not compressor.is_fitted_:
        compressor.fit(X_train)

    train_res = compressor.transform(X_train)
    test_res = compressor.transform(X_test)

    X_train_comp = train_res.compressed_features
    X_test_comp = test_res.compressed_features

    baseline_before: Dict[str, float] = {}
    baseline_after: Dict[str, float] = {}

    if y_train is not None and y_test is not None:
        if task_type == "classification":
            # Model before compression
            clf_before = LogisticRegression(random_state=random_state, max_iter=1000)
            clf_before.fit(X_train, y_train)
            preds_before = clf_before.predict(X_test)
            baseline_before["accuracy"] = float(accuracy_score(y_test, preds_before))
            baseline_before["f1"] = float(f1_score(y_test, preds_before, average="weighted"))

            try:
                probs_before = clf_before.predict_proba(X_test)
                if probs_before.shape[1] == 2:
                    baseline_before["roc_auc"] = float(roc_auc_score(y_test, probs_before[:, 1]))
            except Exception:
                pass

            # Model after compression
            clf_after = LogisticRegression(random_state=random_state, max_iter=1000)
            clf_after.fit(X_train_comp, y_train)
            preds_after = clf_after.predict(X_test_comp)
            baseline_after["accuracy"] = float(accuracy_score(y_test, preds_after))
            baseline_after["f1"] = float(f1_score(y_test, preds_after, average="weighted"))

            try:
                probs_after = clf_after.predict_proba(X_test_comp)
                if probs_after.shape[1] == 2:
                    baseline_after["roc_auc"] = float(roc_auc_score(y_test, probs_after[:, 1]))
            except Exception:
                pass

        else:  # regression
            reg_before = Ridge(random_state=random_state)
            reg_before.fit(X_train, y_train)
            preds_before = reg_before.predict(X_test)
            baseline_before["mse"] = float(mean_squared_error(y_test, preds_before))
            baseline_before["r2"] = float(r2_score(y_test, preds_before))

            reg_after = Ridge(random_state=random_state)
            reg_after.fit(X_train_comp, y_train)
            preds_after = reg_after.predict(X_test_comp)
            baseline_after["mse"] = float(mean_squared_error(y_test, preds_after))
            baseline_after["r2"] = float(r2_score(y_test, preds_after))

    # Acceptable retention if cumulative explained variance >= 0.80 or test MSE is small
    retention_decision = float(compressor.cumulative_explained_variance_) >= 0.80

    return InformationRetentionReport(
        input_dimension=compressor.input_dim_,
        compressed_dimension=compressor.n_components_,
        explained_variance_ratio=[float(v) for v in compressor.explained_variance_ratio_],
        cumulative_explained_variance=float(compressor.cumulative_explained_variance_),
        reconstruction_mse=float(test_res.reconstruction_error),
        baseline_before_compression=baseline_before,
        baseline_after_compression=baseline_after,
        retention_decision=retention_decision,
    )
