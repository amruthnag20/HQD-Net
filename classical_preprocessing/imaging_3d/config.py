"""
Configuration dataclass for Phase 1 3D Medical Imaging Pipeline (MRI / CT).
"""

from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass
class Imaging3DConfig:
    """
    Configuration options for 3D volumetric medical image preprocessing and feature extraction.
    """
    target_shape: Tuple[int, int, int] = (64, 64, 64)  # (D, H, W) volumetric spatial resolution
    resampling_strategy: str = "trilinear"  # 'trilinear' or 'nearest'
    modality: str = "mri"  # 'mri', 'ct', or 'auto'
    mri_norm_strategy: str = "zscore"  # 'zscore' or 'minmax'
    ct_window_center: Optional[float] = 40.0  # Hounsfield Units center (soft tissue=40)
    ct_window_width: Optional[float] = 400.0  # HU width
    target_spacing: Optional[Tuple[float, float, float]] = (1.0, 1.0, 1.0)  # (z, y, x) mm spacing
    batch_size: int = 4
    device: str = "cpu"
    encoder_name: str = "lightweight_3d_cnn"
    embedding_dim: int = 512
    random_state: int = 42
