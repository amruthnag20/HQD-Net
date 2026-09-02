"""
Unified 10-D Multimodal Projector for Stage 8 Convergence.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np
from sklearn.decomposition import PCA
import torch
import torch.nn as nn
import torch.optim as optim

from classical_preprocessing.unified_projection.alignment import AlignedMultimodalBatch, align_multimodal_inputs
from classical_preprocessing.unified_projection.config import UnifiedProjectionConfig
from classical_preprocessing.unified_projection.fusion import MultimodalFusionNetwork


@dataclass
class UnifiedRepresentation:
    """
    Structured output contract from Stage 8 Unified Multimodal 10-D Projection.
    """
    representation: np.ndarray  # Shape (N, 10), float64, finite
    sample_ids: List[str]
    modality_presence: np.ndarray  # Shape (N, 3), boolean
    metadata: Dict[str, Any] = field(default_factory=dict)


class Unified10DProjector:
    """
    Fuses heterogeneous clinical modalities and projects them into exactly 10 dimensions.
    """

    def __init__(self, config: Optional[UnifiedProjectionConfig] = None):
        self.config = config or UnifiedProjectionConfig()
        self.is_fitted = False
        self.model: Optional[MultimodalFusionNetwork] = None
        self.pca_model: Optional[PCA] = None

        self.d_tab = 0
        self.d_2d = 0
        self.d_3d = 0

    def fit(
        self,
        tabular: Any = None,
        image_2d: Any = None,
        image_3d: Any = None,
        y: Optional[Union[np.ndarray, torch.Tensor, List[Any]]] = None,
        sample_ids: Optional[List[str]] = None,
    ) -> "Unified10DProjector":
        """
        Fit the multimodal 10-D projection network or PCA model using training data only.

        Parameters
        ----------
        tabular : Any
            Tabular feature matrix or stage output.
        image_2d : Any
            2D imaging latent matrix or ImageRepresentation.
        image_3d : Any
            3D imaging latent matrix or VolumeRepresentation.
        y : Optional[Union[np.ndarray, torch.Tensor, List[Any]]]
            Optional target labels for task-aware supervised projection learning.
        sample_ids : Optional[List[str]]
            Optional explicit sample identifiers.

        Returns
        -------
        Unified10DProjector
        """
        batch = align_multimodal_inputs(tabular, image_2d, image_3d, sample_ids=sample_ids)
        self.d_tab = batch.metadata["d_tabular"]
        self.d_2d = batch.metadata["d_image_2d"]
        self.d_3d = batch.metadata["d_image_3d"]

        n_samples = len(batch.sample_ids)

        if y is not None and self.config.projection_method == "learned_mlp":
            # Train supervised PyTorch Multimodal Fusion Network
            self.model = MultimodalFusionNetwork(
                d_tab=self.d_tab,
                d_2d=self.d_2d,
                d_3d=self.d_3d,
                modality_hidden_dim=self.config.modality_hidden_dim,
                fusion_hidden_dim=self.config.fusion_hidden_dim,
                output_dim=self.config.output_dim,
                seed=self.config.random_state,
            ).to(self.config.device)

            y_arr = np.asarray(y)
            if y_arr.ndim > 1:
                y_arr = y_arr.ravel()

            is_classification = np.issubdtype(y_arr.dtype, np.integer) or len(np.unique(y_arr)) < 10

            if is_classification:
                n_classes = len(np.unique(y_arr))
                head = nn.Linear(self.config.output_dim, max(2, n_classes)).to(self.config.device)
                criterion = nn.CrossEntropyLoss()
                y_tensor = torch.tensor(y_arr, dtype=torch.long, device=self.config.device)
            else:
                head = nn.Linear(self.config.output_dim, 1).to(self.config.device)
                criterion = nn.MSELoss()
                y_tensor = torch.tensor(y_arr, dtype=torch.float32, device=self.config.device)

            optimizer = optim.Adam(list(self.model.parameters()) + list(head.parameters()), lr=self.config.learning_rate)

            # Convert inputs to torch tensors
            tab_t = torch.tensor(batch.tabular, dtype=torch.float32, device=self.config.device) if batch.tabular is not None else None
            img2d_t = torch.tensor(batch.image_2d, dtype=torch.float32, device=self.config.device) if batch.image_2d is not None else None
            img3d_t = torch.tensor(batch.image_3d, dtype=torch.float32, device=self.config.device) if batch.image_3d is not None else None
            mask_t = torch.tensor(batch.presence_mask, dtype=torch.bool, device=self.config.device)

            self.model.train()
            head.train()

            for epoch in range(self.config.epochs):
                optimizer.zero_grad()
                z = self.model(tab_t, img2d_t, img3d_t, mask_t)
                preds = head(z)
                loss = criterion(preds.squeeze(), y_tensor)
                loss.backward()
                optimizer.step()

            self.model.eval()

        else:
            # Unsupervised PCA fallback
            fused_list = []
            if batch.tabular is not None:
                fused_list.append(batch.tabular)
            if batch.image_2d is not None:
                fused_list.append(batch.image_2d)
            if batch.image_3d is not None:
                fused_list.append(batch.image_3d)

            # Include presence mask as numeric features
            fused_list.append(batch.presence_mask.astype(np.float64))
            fused_matrix = np.hstack(fused_list)

            total_feats = fused_matrix.shape[1]
            n_comp = min(self.config.output_dim, n_samples, total_feats)

            self.pca_model = PCA(n_components=n_comp, random_state=self.config.random_state)
            self.pca_model.fit(fused_matrix)

        self.is_fitted = True
        return self

    def transform(
        self,
        tabular: Any = None,
        image_2d: Any = None,
        image_3d: Any = None,
        sample_ids: Optional[List[str]] = None,
    ) -> UnifiedRepresentation:
        """
        Transform multimodal inputs into a 10-D latent representation matrix without retraining.

        Parameters
        ----------
        tabular : Any
            Tabular input matrix.
        image_2d : Any
            2D image latent matrix.
        image_3d : Any
            3D volume latent matrix.
        sample_ids : Optional[List[str]]
            Optional sample IDs.

        Returns
        -------
        UnifiedRepresentation
        """
        if not self.is_fitted:
            raise ValueError("Unified10DProjector is not fitted. Call fit() before transform().")

        batch = align_multimodal_inputs(tabular, image_2d, image_3d, sample_ids=sample_ids)
        n_samples = len(batch.sample_ids)

        if self.model is not None:
            tab_t = torch.tensor(batch.tabular, dtype=torch.float32, device=self.config.device) if batch.tabular is not None else None
            img2d_t = torch.tensor(batch.image_2d, dtype=torch.float32, device=self.config.device) if batch.image_2d is not None else None
            img3d_t = torch.tensor(batch.image_3d, dtype=torch.float32, device=self.config.device) if batch.image_3d is not None else None
            mask_t = torch.tensor(batch.presence_mask, dtype=torch.bool, device=self.config.device)

            self.model.eval()
            with torch.no_grad():
                z_tensor = self.model(tab_t, img2d_t, img3d_t, mask_t)

            rep_matrix = z_tensor.cpu().numpy().astype(np.float64)

        else:
            fused_list = []
            if batch.tabular is not None:
                fused_list.append(batch.tabular)
            if batch.image_2d is not None:
                fused_list.append(batch.image_2d)
            if batch.image_3d is not None:
                fused_list.append(batch.image_3d)

            fused_list.append(batch.presence_mask.astype(np.float64))
            fused_matrix = np.hstack(fused_list)

            pca_out = self.pca_model.transform(fused_matrix)

            # Pad with zeros if pca_components < 10
            if pca_out.shape[1] < self.config.output_dim:
                pad_cols = self.config.output_dim - pca_out.shape[1]
                rep_matrix = np.hstack([pca_out, np.zeros((n_samples, pad_cols), dtype=np.float64)])
            else:
                rep_matrix = pca_out[:, : self.config.output_dim]

        if rep_matrix.shape[1] != self.config.output_dim:
            raise ValueError(f"Expected output dimension {self.config.output_dim}, got {rep_matrix.shape[1]}")

        if not np.isfinite(rep_matrix).all():
            raise ValueError("10-D Multimodal projection contains NaN or Inf values.")

        meta = {
            "total_samples": n_samples,
            "output_dim": self.config.output_dim,
            "projection_method": self.config.projection_method,
            "presence_counts": batch.metadata["presence_counts"],
        }

        return UnifiedRepresentation(
            representation=rep_matrix,
            sample_ids=batch.sample_ids,
            modality_presence=batch.presence_mask,
            metadata=meta,
        )

    def save(self, filepath: Union[str, Path]) -> None:
        """
        Serialize the fitted projector state (weights, config, dimensions) to disk.
        """
        if not self.is_fitted:
            raise ValueError("Cannot save an unfitted Unified10DProjector.")

        state = {
            "config": self.config,
            "d_tab": self.d_tab,
            "d_2d": self.d_2d,
            "d_3d": self.d_3d,
            "is_fitted": self.is_fitted,
            "pca_model": self.pca_model,
            "model_state_dict": self.model.state_dict() if self.model else None,
        }
        torch.save(state, str(filepath))

    @classmethod
    def load(cls, filepath: Union[str, Path]) -> "Unified10DProjector":
        """
        Load a serialized Unified10DProjector state from disk.
        """
        state = torch.load(str(filepath), map_location="cpu", weights_only=False)
        projector = cls(config=state["config"])
        projector.d_tab = state["d_tab"]
        projector.d_2d = state["d_2d"]
        projector.d_3d = state["d_3d"]
        projector.is_fitted = state["is_fitted"]
        projector.pca_model = state["pca_model"]

        if state["model_state_dict"] is not None:
            projector.model = MultimodalFusionNetwork(
                d_tab=projector.d_tab,
                d_2d=projector.d_2d,
                d_3d=projector.d_3d,
                modality_hidden_dim=projector.config.modality_hidden_dim,
                fusion_hidden_dim=projector.config.fusion_hidden_dim,
                output_dim=projector.config.output_dim,
                seed=projector.config.random_state,
            ).to(projector.config.device)
            projector.model.load_state_dict(state["model_state_dict"])
            projector.model.eval()

        return projector
