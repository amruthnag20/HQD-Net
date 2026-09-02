"""
Medical 3D Encoders and Feature Extractors for Volumetric Pathway (MRI / CT).
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union
import os
import urllib.request
import warnings
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from classical_preprocessing.imaging_3d.config import Imaging3DConfig


class Medical3DEncoder(ABC):
    """
    Abstract Base Class for 3D Volumetric Medical Encoders.
    """

    @abstractmethod
    def encode(self, volume_batch: torch.Tensor) -> np.ndarray:
        """
        Encode a batch of preprocessed 3D volume tensors into latent embeddings.

        Parameters
        ----------
        volume_batch : torch.Tensor
            Batch tensor of shape (B, 1, D, H, W).

        Returns
        -------
        np.ndarray
            Latent embedding matrix of shape (B, D_out), dtype float64.
        """
        pass

    @property
    @abstractmethod
    def embedding_dim(self) -> int:
        """Return the output feature dimension D."""
        pass


class LightweightMedical3DCNN(nn.Module):
    """
    Deterministic PyTorch 3D CNN feature extractor for volumetric medical images.
    """

    def __init__(self, in_channels: int = 1, embedding_dim: int = 512, seed: int = 42):
        super().__init__()
        torch.manual_seed(seed)

        self.features = nn.Sequential(
            nn.Conv3d(in_channels, 16, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm3d(16),
            nn.ReLU(inplace=True),
            nn.Conv3d(16, 32, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm3d(32),
            nn.ReLU(inplace=True),
            nn.Conv3d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm3d(64),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool3d((2, 2, 2)),
        )

        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 2 * 2 * 2, embedding_dim),
            nn.LayerNorm(embedding_dim),
        )

        self.eval()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.features(x)
        out = self.fc(out)
        return out


class LightweightMedical3DEncoder(Medical3DEncoder):
    """
    Lightweight PyTorch 3D medical encoder producing deterministic D-dimensional embeddings.
    """

    def __init__(self, config: Optional[Imaging3DConfig] = None):
        self.config = config or Imaging3DConfig()
        self._dim = self.config.embedding_dim

        self.device = torch.device(self.config.device if torch.cuda.is_available() and self.config.device == "cuda" else "cpu")
        self.model = LightweightMedical3DCNN(
            in_channels=1,
            embedding_dim=self._dim,
            seed=self.config.random_state,
        ).to(self.device)
        self.model.eval()

    @property
    def embedding_dim(self) -> int:
        return self._dim

    def encode(self, volume_batch: torch.Tensor) -> np.ndarray:
        if not isinstance(volume_batch, torch.Tensor):
            raise TypeError(f"Expected torch.Tensor, got {type(volume_batch).__name__}")

        if volume_batch.ndim != 5:
            raise ValueError(f"Expected 5-D batch tensor (B, 1, D, H, W), got shape {volume_batch.shape}")

        volume_batch = volume_batch.to(self.device, dtype=torch.float32)

        with torch.no_grad():
            embeddings_tensor = self.model(volume_batch)

        embeddings_arr = embeddings_tensor.cpu().numpy().astype(np.float64)

        if not np.isfinite(embeddings_arr).all():
            raise ValueError("3D Medical image encoder output contains NaN or Inf values.")

        return embeddings_arr


class BasicBlock3D(nn.Module):
    expansion = 1

    def __init__(self, in_planes, planes, stride=1, downsample=None):
        super().__init__()
        self.conv1 = nn.Conv3d(in_planes, planes, kernel_size=3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm3d(planes)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv3d(planes, planes, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm3d(planes)
        self.downsample = downsample

    def forward(self, x):
        residual = x
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)
        out = self.conv2(out)
        out = self.bn2(out)
        if self.downsample is not None:
            residual = self.downsample(x)
        out += residual
        out = self.relu(out)
        return out


class ResNet3D10(nn.Module):
    """
    MedicalNet 3D ResNet-10 Architecture.
    """

    def __init__(self, in_channels: int = 1, shortcut_type: str = "B"):
        super().__init__()
        self.in_planes = 64
        self.conv1 = nn.Conv3d(in_channels, 64, kernel_size=7, stride=(2, 2, 2), padding=3, bias=False)
        self.bn1 = nn.BatchNorm3d(64)
        self.relu = nn.ReLU(inplace=True)
        self.maxpool = nn.MaxPool3d(kernel_size=3, stride=2, padding=1)

        self.layer1 = self._make_layer(BasicBlock3D, 64, 1, shortcut_type, stride=1)
        self.layer2 = self._make_layer(BasicBlock3D, 128, 1, shortcut_type, stride=2)
        self.layer3 = self._make_layer(BasicBlock3D, 256, 1, shortcut_type, stride=2)
        self.layer4 = self._make_layer(BasicBlock3D, 512, 1, shortcut_type, stride=2)

        self.avgpool = nn.AdaptiveAvgPool3d((1, 1, 1))

    def _make_layer(self, block, planes, blocks, shortcut_type, stride=1):
        downsample = None
        if stride != 1 or self.in_planes != planes * block.expansion:
            if shortcut_type == "A":
                downsample = lambda x: F.pad(x[:, :, ::stride, ::stride, ::stride], (0, 0, 0, 0, 0, 0, planes // 4, planes // 4))
            else:
                downsample = nn.Sequential(
                    nn.Conv3d(self.in_planes, planes * block.expansion, kernel_size=1, stride=stride, bias=False),
                    nn.BatchNorm3d(planes * block.expansion),
                )

        layers = []
        layers.append(block(self.in_planes, planes, stride, downsample))
        self.in_planes = planes * block.expansion
        for _ in range(1, blocks):
            layers.append(block(self.in_planes, planes))

        return nn.Sequential(*layers)

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)

        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)

        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        return x


class MedicalNet3DEncoder(Medical3DEncoder):
    """
    MedicalNet Pretrained 3D ResNet Encoder for Volumetric Medical Images (MRI / CT).
    Strictly loads official pretrained weights (resnet_10_23dataset.pth).
    """

    DEFAULT_CHECKPOINT_URL = (
        "https://huggingface.co/TencentMedicalNet/MedicalNet-Resnet10/resolve/main/resnet_10_23dataset.pth"
    )

    def __init__(self, config: Optional[Imaging3DConfig] = None, checkpoint_path: Optional[str] = None):
        self.config = config or Imaging3DConfig()
        self._dim = 512  # ResNet-10 feature map output dimension

        self.device = torch.device(self.config.device if torch.cuda.is_available() and self.config.device == "cuda" else "cpu")
        self.model = ResNet3D10(in_channels=1, shortcut_type="B").to(self.device)

        # Pretrained Checkpoint Loading & Verification
        ckpt_path = checkpoint_path or "resnet_10_23dataset.pth"
        if not os.path.exists(ckpt_path):
            try:
                print(f"Downloading MedicalNet ResNet-10 pretrained weights from {self.DEFAULT_CHECKPOINT_URL}...")
                urllib.request.urlretrieve(self.DEFAULT_CHECKPOINT_URL, ckpt_path)
            except Exception as e:
                raise RuntimeError(
                    f"MEDICALNET INTEGRATION BLOCKED: Failed to download pretrained checkpoint from '{self.DEFAULT_CHECKPOINT_URL}': {e}"
                )

        try:
            checkpoint = torch.load(ckpt_path, map_location=self.device, weights_only=False)
            state_dict = checkpoint["state_dict"] if isinstance(checkpoint, dict) and "state_dict" in checkpoint else checkpoint

            # Strip 'module.' prefix if saved with DataParallel
            new_state_dict = {}
            for k, v in state_dict.items():
                key_name = k[7:] if k.startswith("module.") else k
                if not key_name.startswith("fc."):
                    new_state_dict[key_name] = v

            load_res = self.model.load_state_dict(new_state_dict, strict=False)

            if len(load_res.unexpected_keys) > 0:
                raise ValueError(f"Unexpected keys in MedicalNet state_dict: {load_res.unexpected_keys}")

            self.matched_param_count = len(new_state_dict)

        except Exception as e:
            raise RuntimeError(f"MEDICALNET INTEGRATION BLOCKED: Failed to load MedicalNet pretrained weights '{ckpt_path}': {e}")

        # Freeze evaluation mode
        self.model.eval()
        for param in self.model.parameters():
            param.requires_grad = False

    @property
    def embedding_dim(self) -> int:
        return self._dim

    def encode(self, volume_batch: torch.Tensor) -> np.ndarray:
        if not isinstance(volume_batch, torch.Tensor):
            raise TypeError(f"Expected torch.Tensor, got {type(volume_batch).__name__}")

        if volume_batch.ndim == 4:
            volume_batch = volume_batch.unsqueeze(0)

        if volume_batch.ndim != 5:
            raise ValueError(f"Expected 5-D batch tensor (B, 1, D, H, W), got shape {volume_batch.shape}")

        volume_batch = volume_batch.to(self.device, dtype=torch.float32)

        with torch.no_grad():
            features_tensor = self.model.extract_features(volume_batch)

        embeddings_arr = features_tensor.cpu().numpy().astype(np.float64)

        if not np.isfinite(embeddings_arr).all():
            raise ValueError("MedicalNet 3D encoder output contains NaN or Inf values.")

        return embeddings_arr


def get_medical_3d_encoder(config: Optional[Imaging3DConfig] = None) -> Medical3DEncoder:
    """
    Factory function for 3D medical volume encoders.
    """
    cfg = config or Imaging3DConfig()
    if cfg.encoder_name in ("medicalnet", "medicalnet_resnet10"):
        return MedicalNet3DEncoder(config=cfg)
    return LightweightMedical3DEncoder(config=cfg)
