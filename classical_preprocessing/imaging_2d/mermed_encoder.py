"""
MerMED Pretrained Medical Foundation Model Encoder (ViT-B/16).
Provides 768-dimensional multi-specialty 2D medical vision representations.
"""

from pathlib import Path
from typing import Optional, Union
import numpy as np
import torch
import torch.nn as nn

from classical_preprocessing.imaging_2d.config import Imaging2DConfig
from classical_preprocessing.imaging_2d.encoder import MedicalImageEncoder


class MerMEDViTBackbone(nn.Module):
    """
    Vision Transformer (ViT-B/16) backbone matching MerMED-FM architecture.
    """

    def __init__(
        self,
        in_channels: int = 3,
        img_size: int = 224,
        patch_size: int = 16,
        embed_dim: int = 768,
        depth: int = 12,
        num_heads: int = 12,
    ):
        super().__init__()
        self.patch_size = patch_size
        self.num_patches = (img_size // patch_size) ** 2

        self.proj = nn.Conv2d(in_channels, embed_dim, kernel_size=patch_size, stride=patch_size)
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, self.num_patches + 1, embed_dim))

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            dim_feedforward=embed_dim * 4,
            activation="gelu",
            batch_first=True,
        )
        self.blocks = nn.TransformerEncoder(encoder_layer, num_layers=depth)
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, C, H, W = x.shape
        if C == 1:
            x = x.repeat(1, 3, 1, 1)

        x = self.proj(x)  # (B, 768, 14, 14)
        x = x.flatten(2).transpose(1, 2)  # (B, 196, 768)

        cls_tokens = self.cls_token.expand(B, -1, -1)  # (B, 1, 768)
        x = torch.cat((cls_tokens, x), dim=1)  # (B, 197, 768)
        x = x + self.pos_embed

        x = self.blocks(x)
        x = self.norm(x)
        return x[:, 0]  # Return [CLS] token embedding (B, 768)


class MerMEDEncoder(MedicalImageEncoder):
    """
    MerMED-FM Medical Image Encoder wrapping ViT-B/16 backbone.
    Outputs 768-D multi-specialty 2D latent embeddings.
    """

    def __init__(
        self,
        config: Optional[Imaging2DConfig] = None,
        weights_path: Optional[Union[str, Path]] = None,
    ):
        self.config = config or Imaging2DConfig()
        self._dim = 768  # ViT-B/16 output dimension

        self.device = torch.device(self.config.device if torch.cuda.is_available() and self.config.device == "cuda" else "cpu")
        self.model = MerMEDViTBackbone().to(self.device)

        path_to_check = weights_path or getattr(self.config, "mermed_weights_path", None)
        if path_to_check:
            p = Path(path_to_check)
            if not p.exists():
                raise FileNotFoundError(
                    f"MerMED pretrained weights checkpoint requested at '{p}' but file does not exist! "
                    "Explicit failure enforced to prevent uncalibrated random weight execution when weights are specified."
                )
            try:
                state_dict = torch.load(p, map_location=self.device, weights_only=False)
                self.model.load_state_dict(state_dict)
            except Exception as e:
                raise RuntimeError(f"Failed to load MerMED weights checkpoint from '{p}': {e}")

        # Enforce evaluation mode & freeze parameters for deterministic inference
        self.model.eval()
        for param in self.model.parameters():
            param.requires_grad = False

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
            raise ValueError("MerMED image encoder output contains NaN or Inf values.")

        return embeddings_arr
