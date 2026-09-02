"""
Tabular Representation Compressor using PCA for Stage 5 Information Compression.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

from classical_preprocessing.compression.config import CompressionConfig


@dataclass
class TabularCompressionResult:
    """
    Structured output contract from Stage 5 Tabular Compression.
    """
    compressed_features: np.ndarray  # Shape (B, M), float64, finite
    compressed_feature_names: List[str]
    explained_variance_ratio: np.ndarray
    cumulative_explained_variance: float
    reconstruction_error: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class TabularCompressor:
    """
    Classical tabular dimensionality reduction via Principal Component Analysis (PCA).

    Compresses Stage 4 selected feature matrix into a lower-dimensional statistical representation.
    """

    def __init__(self, config: Optional[CompressionConfig] = None):
        self.config = config or CompressionConfig()

        self.pca_: Optional[PCA] = None
        self.is_fitted_: bool = False
        self.n_components_: int = 0
        self.input_dim_: int = 0
        self.input_feature_names_: List[str] = []
        self.compressed_feature_names_: List[str] = []
        self.explained_variance_ratio_: np.ndarray = np.array([])
        self.cumulative_explained_variance_: float = 0.0
        self.components_loadings_: np.ndarray = np.array([])

    def _validate_input(
        self,
        X: Any,
        feature_names: Optional[List[str]] = None,
        is_fit: bool = True,
    ) -> Tuple[np.ndarray, List[str]]:
        """
        Validate input feature matrix X.
        """
        if X is None:
            raise ValueError("Compression input matrix X cannot be None.")

        if isinstance(X, pd.DataFrame):
            inferred_names = list(X.columns)
            X_arr = X.to_numpy(dtype=np.float64)
        elif isinstance(X, np.ndarray):
            X_arr = np.asarray(X, dtype=np.float64)
            inferred_names = [f"selected_feat_{i}" for i in range(X_arr.shape[1])]
        else:
            raise TypeError(f"Unsupported feature matrix type: {type(X).__name__}")

        if X_arr.ndim != 2:
            raise ValueError(f"Input feature matrix X must be 2-D, got shape {X_arr.shape}")

        rows, cols = X_arr.shape
        if rows == 0 or cols == 0:
            raise ValueError(f"Input feature matrix X is empty. Shape: ({rows}, {cols})")

        if not np.isfinite(X_arr).all():
            raise ValueError("Input feature matrix X contains NaN or Inf values.")

        names = feature_names if feature_names is not None else inferred_names
        if len(names) != cols:
            raise ValueError(f"Length of feature_names ({len(names)}) does not match columns in X ({cols})")

        if not is_fit and cols != self.input_dim_:
            raise ValueError(f"Expected input feature dimension {self.input_dim_}, got {cols}")

        return X_arr, names

    def fit(
        self,
        X: Any,
        feature_names: Optional[List[str]] = None,
    ) -> "TabularCompressor":
        """
        Fit the PCA transformer on input feature matrix X.
        """
        X_arr, names = self._validate_input(X, feature_names=feature_names, is_fit=True)
        rows, cols = X_arr.shape

        self.input_dim_ = cols
        self.input_feature_names_ = names

        resolved_max = self.config.validate_and_resolve(n_features=cols, n_samples=rows)

        seed = self.config.random_state

        if self.config.n_components is not None:
            n_comp = self.config.n_components
            pca = PCA(n_components=n_comp, random_state=seed)
            pca.fit(X_arr)
        else:
            # Fit full PCA to find minimum components matching variance target
            full_pca = PCA(n_components=resolved_max, random_state=seed)
            full_pca.fit(X_arr)
            cumsum_var = np.cumsum(full_pca.explained_variance_ratio_)
            target = self.config.explained_variance_target or 0.95
            matching_indices = np.where(cumsum_var >= target)[0]

            if len(matching_indices) > 0:
                n_comp = int(matching_indices[0]) + 1
            else:
                n_comp = resolved_max

            pca = PCA(n_components=n_comp, random_state=seed)
            pca.fit(X_arr)

        self.pca_ = pca
        self.n_components_ = n_comp
        self.explained_variance_ratio_ = np.asarray(pca.explained_variance_ratio_, dtype=np.float64)
        self.cumulative_explained_variance_ = float(np.sum(self.explained_variance_ratio_))
        self.components_loadings_ = np.asarray(pca.components_, dtype=np.float64)
        self.compressed_feature_names_ = [f"pc_{i+1:02d}" for i in range(n_comp)]
        self.is_fitted_ = True

        return self

    def transform(self, X: Any) -> TabularCompressionResult:
        """
        Compress feature matrix X into lower-dimensional representation using fitted PCA.
        """
        if not self.is_fitted_ or self.pca_ is None:
            raise RuntimeError("TabularCompressor is not fitted. Call fit() first.")

        X_arr, _ = self._validate_input(X, feature_names=self.input_feature_names_, is_fit=False)

        compressed = self.pca_.transform(X_arr)
        compressed = np.asarray(compressed, dtype=np.float64)

        if not np.isfinite(compressed).all():
            raise ValueError("Compressed features contain NaN or Inf values.")

        # Compute reconstruction error (MSE)
        reconstructed = self.pca_.inverse_transform(compressed)
        reconstruction_error = float(np.mean((X_arr - reconstructed) ** 2))

        meta = {
            "input_dimension": self.input_dim_,
            "compressed_dimension": self.n_components_,
            "n_components": self.n_components_,
            "explained_variance_target": self.config.explained_variance_target,
            "sample_count": X_arr.shape[0],
            "components_loadings": self.components_loadings_,
        }

        return TabularCompressionResult(
            compressed_features=compressed,
            compressed_feature_names=self.compressed_feature_names_,
            explained_variance_ratio=self.explained_variance_ratio_,
            cumulative_explained_variance=self.cumulative_explained_variance_,
            reconstruction_error=reconstruction_error,
            metadata=meta,
        )

    def fit_transform(
        self,
        X: Any,
        feature_names: Optional[List[str]] = None,
    ) -> TabularCompressionResult:
        """
        Fit PCA and transform feature matrix X in a single call.
        """
        return self.fit(X, feature_names=feature_names).transform(X)

    def inverse_transform(self, X_compressed: np.ndarray) -> np.ndarray:
        """
        Reconstruct original feature space from compressed representation.
        """
        if not self.is_fitted_ or self.pca_ is None:
            raise RuntimeError("TabularCompressor is not fitted. Call fit() first.")
        return self.pca_.inverse_transform(X_compressed)
