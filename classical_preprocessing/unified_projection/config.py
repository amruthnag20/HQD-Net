"""
Configuration dataclass for Phase 1 Stage 8 Unified Multimodal 10-D Projection.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class UnifiedProjectionConfig:
    """
    Configuration options for Stage 8 Unified Multimodal 10-D Projection.
    """
    output_dim: int = 10  # Enforced 10-dimensional quantum core bottleneck
    modality_hidden_dim: int = 64  # Hidden dimension per individual modality branch
    fusion_hidden_dim: int = 128  # Hidden dimension of fused bottleneck network
    projection_method: str = "learned_mlp"  # 'learned_mlp' or 'unsupervised_pca'
    normalize_modalities: bool = True  # Standardization/L2 norm per modality before fusion
    epochs: int = 50  # Supervised projection training budget
    learning_rate: float = 1e-3  # Learning rate for PyTorch projection optimizer
    batch_size: int = 32
    device: str = "cpu"
    random_state: int = 42
