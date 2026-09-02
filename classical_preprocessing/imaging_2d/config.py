"""
Configuration dataclass for Phase 1 2D Medical Imaging Pipeline.
"""

from dataclasses import dataclass
from typing import Tuple


@dataclass
class Imaging2DConfig:
    """
    Configuration options for 2D medical image preprocessing and feature extraction.
    """
    target_size: Tuple[int, int] = (224, 224)
    resizing_strategy: str = "resize_crop"  # 'resize_crop' or 'letterbox_pad'
    color_mode: str = "grayscale"  # 'grayscale' (1 channel) or 'rgb' (3 channels)
    normalize_range: Tuple[float, float] = (0.0, 1.0)
    modality: str = "chest_xray"
    batch_size: int = 16
    device: str = "cpu"
    encoder_name: str = "lightweight_cnn"
    embedding_dim: int = 512
