"""
Medical Image Encoders and Feature Extractors for 2D Pathway.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional
import os
import warnings
import numpy as np
import torch
import torch.nn as nn

from classical_preprocessing.imaging_2d.config import Imaging2DConfig


class MedicalImageEncoder(ABC):
    """
    Abstract Base Class for 2D Medical Image Encoders.
    """

    @abstractmethod
    def encode(self, image_batch: torch.Tensor) -> np.ndarray:
        """
        Encode a batch of preprocessed 2D image tensors into latent feature embeddings.

        Parameters
        ----------
        image_batch : torch.Tensor
            Batch tensor of shape (B, C, H, W).

        Returns
        -------
        np.ndarray
            Latent embedding matrix of shape (B, D), dtype float64.
        """
        pass

    @property
    @abstractmethod
    def embedding_dim(self) -> int:
        """Return the output feature dimension D."""
        pass


class LightweightMedicalCNN(nn.Module):
    """
    Deterministic PyTorch CNN feature extractor for 2D medical images.
    """

    def __init__(self, in_channels: int = 1, embedding_dim: int = 512, seed: int = 42):
        super().__init__()
        torch.manual_seed(seed)

        self.features = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((4, 4)),
        )

        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 4 * 4, embedding_dim),
            nn.LayerNorm(embedding_dim),
        )

        # Freeze evaluation mode
        self.eval()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.features(x)
        out = self.fc(out)
        return out


class LightweightMedicalEncoder(MedicalImageEncoder):
    """
    Lightweight PyTorch medical encoder producing deterministic D-dimensional embeddings.
    """

    def __init__(self, config: Optional[Imaging2DConfig] = None):
        self.config = config or Imaging2DConfig()
        in_channels = 1 if self.config.color_mode == "grayscale" else 3
        self._dim = self.config.embedding_dim

        self.device = torch.device(self.config.device if torch.cuda.is_available() and self.config.device == "cuda" else "cpu")
        self.model = LightweightMedicalCNN(in_channels=in_channels, embedding_dim=self._dim).to(self.device)
        self.model.eval()

    @property
    def embedding_dim(self) -> int:
        return self._dim

    def encode(self, image_batch: torch.Tensor) -> np.ndarray:
        if not isinstance(image_batch, torch.Tensor):
            raise TypeError(f"Expected torch.Tensor, got {type(image_batch).__name__}")

        if image_batch.ndim != 4:
            raise ValueError(f"Expected 4-D batch tensor (B, C, H, W), got shape {image_batch.shape}")

        image_batch = image_batch.to(self.device, dtype=torch.float32)

        with torch.no_grad():
            embeddings_tensor = self.model(image_batch)

        embeddings_arr = embeddings_tensor.cpu().numpy().astype(np.float64)

        if not np.isfinite(embeddings_arr).all():
            raise ValueError("Medical image encoder output contains NaN or Inf values.")

        return embeddings_arr


class TorchXRayVisionEncoder(MedicalImageEncoder):
    """
    TorchXRayVision Pretrained Encoder for 2D Chest X-Rays.
    Uses DenseNet121 feature extractor (xrv.models.DenseNet).
    """

    def __init__(self, config: Optional[Imaging2DConfig] = None, weights: Optional[str] = "densenet121-res224-all"):
        self.config = config or Imaging2DConfig()
        self._dim = 1024  # DenseNet feature map dimension

        try:
            import torchxrayvision as xrv
            self.xrv = xrv
        except ImportError:
            raise ImportError(
                "TorchXRayVision package is not installed in the current Python environment. "
                "Please install torchxrayvision or use encoder_name='lightweight_cnn'."
            )

        self.device = torch.device(self.config.device if torch.cuda.is_available() and self.config.device == "cuda" else "cpu")
        self.weights_name = weights or getattr(self.config, "xrv_weights", "densenet121-res224-all")

        try:
            self.model = self.xrv.models.DenseNet(weights=self.weights_name).to(self.device)
        except Exception as e:
            warnings.warn(
                f"Failed to load TorchXRayVision weights '{self.weights_name}': {e}. "
                "Falling back to DenseNet architecture with uninitialized weights."
            )
            # Remove potentially corrupted cached weights file if zero-sized or invalid
            cache_dir = Path.home() / ".torchxrayvision" / "models_data"
            if cache_dir.exists():
                for f in cache_dir.iterdir():
                    if f.is_file() and f.stat().st_size == 0:
                        try:
                            f.unlink()
                        except Exception:
                            pass
            self.model = self.xrv.models.DenseNet(weights=None).to(self.device)

        self.model.eval()

    @property
    def embedding_dim(self) -> int:
        return self._dim

    def encode(self, image_batch: torch.Tensor) -> np.ndarray:
        if not isinstance(image_batch, torch.Tensor):
            raise TypeError(f"Expected torch.Tensor, got {type(image_batch).__name__}")

        if image_batch.ndim != 4:
            raise ValueError(f"Expected 4-D batch tensor (B, C, H, W), got shape {image_batch.shape}")

        # Ensure single-channel grayscale (B, 1, H, W)
        if image_batch.shape[1] > 1:
            image_batch = image_batch.mean(dim=1, keepdim=True)

        # Scale [0, 1] range to TorchXRayVision intensity range [-1024, 1024]
        if image_batch.max() <= 1.0:
            xrv_input = (image_batch * 2048.0) - 1024.0
        else:
            xrv_input = image_batch

        xrv_input = xrv_input.to(self.device, dtype=torch.float32)

        with torch.no_grad():
            features = self.model.features(xrv_input)
            pooled_features = torch.nn.functional.adaptive_avg_pool2d(features, (1, 1))
            flat_features = torch.flatten(pooled_features, 1)

        embeddings_arr = flat_features.cpu().numpy().astype(np.float64)

        if not np.isfinite(embeddings_arr).all():
            raise ValueError("TorchXRayVision encoder output contains NaN or Inf values.")

        return embeddings_arr


def get_medical_encoder(config: Optional[Imaging2DConfig] = None) -> MedicalImageEncoder:
    """
    Factory function for 2D medical image encoders.
    """
    cfg = config or Imaging2DConfig()
    if cfg.encoder_name == "torchxrayvision":
        return TorchXRayVisionEncoder(config=cfg)
    return LightweightMedicalEncoder(config=cfg)
