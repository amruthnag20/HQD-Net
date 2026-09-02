"""
Configuration for Phase 1 Tabular Representation Compression.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class CompressionConfig:
    """
    Configuration options for tabular PCA representation compression.
    """
    n_components: Optional[int] = None
    explained_variance_target: Optional[float] = None
    random_state: int = 42

    def validate_and_resolve(self, n_features: int, n_samples: int) -> int:
        """
        Validate configuration and resolve actual component count to fit.

        Parameters
        ----------
        n_features : int
            Number of input features available.
        n_samples : int
            Number of samples in training batch.

        Returns
        -------
        int
            Resolved component count.
        """
        max_possible = min(n_features, n_samples)
        if max_possible < 1:
            raise ValueError(f"Cannot fit PCA with n_features={n_features}, n_samples={n_samples}")

        if self.n_components is None and self.explained_variance_target is None:
            # Default to 0.95 variance target if neither provided
            self.explained_variance_target = 0.95

        if self.n_components is not None:
            if self.n_components < 1:
                raise ValueError(f"n_components must be >= 1, got {self.n_components}")
            if self.n_components > n_features:
                raise ValueError(
                    f"Requested n_components ({self.n_components}) exceeds available feature count ({n_features})."
                )
            if self.n_components > n_samples:
                raise ValueError(
                    f"Requested n_components ({self.n_components}) exceeds sample count ({n_samples})."
                )
            return self.n_components

        if self.explained_variance_target is not None:
            if not (0.0 < self.explained_variance_target <= 1.0):
                raise ValueError(
                    f"explained_variance_target must be in (0.0, 1.0], got {self.explained_variance_target}"
                )

        return max_possible
