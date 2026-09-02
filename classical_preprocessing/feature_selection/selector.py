"""
Multi-Signal Feature Selector for Phase 1 Classical Preprocessing.

Combines Mutual Information, L1-regularized models, and Random Forest feature importances
into a reproducible, explainable rank aggregation pipeline for Stage 5 compression handoff.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union
import warnings
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.feature_selection import mutual_info_classif, mutual_info_regression
from sklearn.linear_model import Lasso, LogisticRegression

from classical_preprocessing.feature_selection.config import FeatureSelectionConfig
from classical_preprocessing.feature_selection.provenance import group_feature_scores
from classical_preprocessing.feature_selection.ranking import aggregate_signal_rankings


@dataclass
class MultiSignalSelectionResult:
    """
    Structured output contract from Stage 4 Feature Selection.
    """
    selected_features: np.ndarray  # Shape (B, K), float64, finite
    selected_feature_names: List[str]
    ranking_dataframe: pd.DataFrame
    selected_indices: List[int]
    metadata: Dict[str, Any] = field(default_factory=dict)


class MultiSignalFeatureSelector:
    """
    Supervised Multi-Signal Feature Selection Engine.
    """

    def __init__(self, config: Optional[FeatureSelectionConfig] = None):
        self.config = config or FeatureSelectionConfig()

        self.is_fitted_: bool = False
        self.ranking_dataframe_: Optional[pd.DataFrame] = None
        self.selected_indices_: List[int] = []
        self.selected_feature_names_: List[str] = []
        self.input_feature_names_: List[str] = []
        self.task_type_: str = "classification"

    def _validate_inputs(
        self,
        X: Any,
        y: Optional[Any],
        feature_names: Optional[List[str]] = None,
        is_fit: bool = True,
    ) -> Tuple[np.ndarray, Optional[np.ndarray], List[str]]:
        """
        Validate feature matrix X and target y.
        """
        if X is None:
            raise ValueError("Feature matrix X cannot be None.")

        if isinstance(X, pd.DataFrame):
            inferred_names = list(X.columns)
            X_arr = X.to_numpy(dtype=np.float64)
        elif isinstance(X, np.ndarray):
            X_arr = np.asarray(X, dtype=np.float64)
            inferred_names = [f"feature_{i}" for i in range(X_arr.shape[1])]
        else:
            raise TypeError(f"Unsupported feature matrix type: {type(X).__name__}")

        if X_arr.ndim != 2:
            raise ValueError(f"Feature matrix X must be 2-D, got shape {X_arr.shape}")

        rows, cols = X_arr.shape
        if rows == 0 or cols == 0:
            raise ValueError(f"Feature matrix X is empty. Shape: ({rows}, {cols})")

        if not np.isfinite(X_arr).all():
            raise ValueError("Feature matrix X contains NaN or Inf values.")

        names = feature_names if feature_names is not None else inferred_names
        if len(names) != cols:
            raise ValueError(f"Length of feature_names ({len(names)}) does not match columns in X ({cols})")

        y_arr = None
        if is_fit:
            if y is None:
                raise ValueError("Target y cannot be None during fit().")

            if isinstance(y, (pd.Series, pd.DataFrame)):
                y_arr = y.to_numpy().ravel()
            elif isinstance(y, (list, tuple)):
                y_arr = np.array(y).ravel()
            elif isinstance(y, np.ndarray):
                y_arr = y.ravel()
            else:
                raise TypeError(f"Unsupported target y type: {type(y).__name__}")

            if len(y_arr) != rows:
                raise ValueError(f"Length of target y ({len(y_arr)}) does not match rows in X ({rows})")

            if pd.isnull(y_arr).any():
                raise ValueError("Target y contains NaN or missing values.")

        return X_arr, y_arr, names

    def _determine_task_type(self, y: np.ndarray) -> str:
        """
        Determine whether task is classification or continuous regression.
        """
        if self.config.task_type in ("classification", "regression"):
            return self.config.task_type

        # Auto-detect task type
        if pd.api.types.is_float_dtype(y):
            unique_vals = np.unique(y)
            # If float values are integers (e.g. 0.0, 1.0) and few unique values, treat as classification
            if len(unique_vals) <= 10 and np.all(np.equal(np.mod(unique_vals, 1), 0)):
                return "classification"
            return "regression"

        return "classification"

    def fit(
        self,
        X: Any,
        y: Any,
        feature_names: Optional[List[str]] = None,
    ) -> "MultiSignalFeatureSelector":
        """
        Fit feature selector by computing MI, L1, and RF signals and rank aggregation.
        """
        if self.config.top_k < 1:
            raise ValueError(f"top_k must be >= 1, got {self.config.top_k}")

        X_arr, y_arr, names = self._validate_inputs(X, y, feature_names=feature_names, is_fit=True)

        n_features = X_arr.shape[1]
        if self.config.top_k > n_features:
            raise ValueError(
                f"Requested top_k ({self.config.top_k}) is greater than available feature count ({n_features})."
            )

        self.input_feature_names_ = names
        self.task_type_ = self._determine_task_type(y_arr)

        seed = self.config.random_state

        # Signal A: Mutual Information
        if self.task_type_ == "classification":
            mi_scores = mutual_info_classif(X_arr, y_arr, random_state=seed)
        else:
            mi_scores = mutual_info_regression(X_arr, y_arr, random_state=seed)

        # Signal B: L1 Regularization
        if self.task_type_ == "classification":
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                clf = LogisticRegression(
                    penalty="l1",
                    C=self.config.l1_c_or_alpha,
                    solver="saga",
                    max_iter=2000,
                    random_state=seed,
                )
                clf.fit(X_arr, y_arr)
            coef = clf.coef_
            if coef.ndim > 1 and coef.shape[0] > 1:
                l1_scores = np.max(np.abs(coef), axis=0)
            else:
                l1_scores = np.abs(coef.ravel())
        else:
            reg = Lasso(
                alpha=self.config.l1_c_or_alpha,
                max_iter=2000,
                random_state=seed,
            )
            reg.fit(X_arr, y_arr)
            l1_scores = np.abs(reg.coef_.ravel())

        # Signal C: Random Forest Importance
        if self.task_type_ == "classification":
            rf = RandomForestClassifier(
                n_estimators=self.config.rf_n_estimators,
                random_state=seed,
            )
            rf.fit(X_arr, y_arr)
            rf_scores = rf.feature_importances_
        else:
            rf = RandomForestRegressor(
                n_estimators=self.config.rf_n_estimators,
                random_state=seed,
            )
            rf.fit(X_arr, y_arr)
            rf_scores = rf.feature_importances_

        # Rank Aggregation
        ranking_df = aggregate_signal_rankings(
            feature_names=names,
            mi_scores=mi_scores,
            l1_scores=l1_scores,
            rf_scores=rf_scores,
            top_k=self.config.top_k,
        )

        self.ranking_dataframe_ = ranking_df

        # Selected feature names and indices
        selected_df = ranking_df[ranking_df["selected"]].sort_values(by="final_rank")
        self.selected_feature_names_ = selected_df["feature"].tolist()

        name_to_index = {fn: idx for idx, fn in enumerate(names)}
        self.selected_indices_ = [name_to_index[fn] for fn in self.selected_feature_names_]
        self.is_fitted_ = True

        return self

    def transform(self, X: Any) -> MultiSignalSelectionResult:
        """
        Transform feature matrix X by selecting top-K features using fitted selection.
        """
        if not self.is_fitted_ or self.ranking_dataframe_ is None:
            raise RuntimeError("MultiSignalFeatureSelector is not fitted. Call fit() first.")

        X_arr, _, names = self._validate_inputs(X, y=None, feature_names=self.input_feature_names_, is_fit=False)

        selected_matrix = X_arr[:, self.selected_indices_]

        meta = {
            "top_k": self.config.top_k,
            "task_type": self.task_type_,
            "input_feature_count": X_arr.shape[1],
            "selected_feature_count": selected_matrix.shape[1],
        }

        return MultiSignalSelectionResult(
            selected_features=selected_matrix,
            selected_feature_names=self.selected_feature_names_,
            ranking_dataframe=self.ranking_dataframe_.copy(),
            selected_indices=self.selected_indices_,
            metadata=meta,
        )

    def fit_transform(
        self,
        X: Any,
        y: Any,
        feature_names: Optional[List[str]] = None,
    ) -> MultiSignalSelectionResult:
        """
        Fit selector and transform feature matrix X in a single step.
        """
        return self.fit(X, y, feature_names=feature_names).transform(X)
