"""
Official MerMED Pretrained Medical Foundation Model Encoder (ViT-B/16).
Loads official pretrained teacher backbone weights from MerMED.pth.
Provides 768-dimensional multi-specialty 2D medical vision representations.
"""

from pathlib import Path
from typing import Optional, Union
import numpy as np
import torch
import torch.nn as nn

from classical_preprocessing.imaging_2d.config import Imaging2DConfig
from classical_preprocessing.imaging_2d.encoder import MedicalImageEncoder


class Attention(nn.Module):
    def __init__(self, dim: int = 768, num_heads: int = 12):
        super().__init__()
        self.num_heads = num_heads
        self.scale = (dim // num_heads) ** -0.5
        self.qkv = nn.Linear(dim, dim * 3)
        self.proj = nn.Linear(dim, dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, N, C = x.shape
        qkv = self.qkv(x).reshape(B, N, 3, self.num_heads, C // self.num_heads).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]
        attn = (q @ k.transpose(-2, -1)) * self.scale
        attn = attn.softmax(dim=-1)
        x = (attn @ v).transpose(1, 2).reshape(B, N, C)
        x = self.proj(x)
        return x


class Mlp(nn.Module):
    def __init__(self, in_features: int = 768, hidden_features: int = 3072):
        super().__init__()
        self.fc1 = nn.Linear(in_features, hidden_features)
        self.act = nn.GELU()
        self.fc2 = nn.Linear(hidden_features, in_features)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.fc1(x)
        x = self.act(x)
        x = self.fc2(x)
        return x


class Block(nn.Module):
    def __init__(self, dim: int = 768, num_heads: int = 12):
        super().__init__()
        self.norm1 = nn.LayerNorm(dim)
        self.attn = Attention(dim, num_heads=num_heads)
        self.norm2 = nn.LayerNorm(dim)
        self.mlp = Mlp(in_features=dim, hidden_features=dim * 4)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.norm1(x))
        x = x + self.mlp(self.norm2(x))
        return x


class PatchEmbed(nn.Module):
    def __init__(self, img_size: int = 224, patch_size: int = 16, in_chans: int = 3, embed_dim: int = 768):
        super().__init__()
        self.proj = nn.Conv2d(in_chans, embed_dim, kernel_size=patch_size, stride=patch_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.proj(x).flatten(2).transpose(1, 2)


class MerMEDViTBackbone(nn.Module):
    """
    Official MerMED Vision Transformer (ViT-B/16) backbone.
    Matches the official MerMED architecture block structure.
    """

    def __init__(
        self,
        img_size: int = 224,
        patch_size: int = 16,
        in_chans: int = 3,
        embed_dim: int = 768,
        depth: int = 12,
        num_heads: int = 12,
    ):
        super().__init__()
        self.patch_embed = PatchEmbed(img_size, patch_size, in_chans, embed_dim)
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, 197, embed_dim))
        self.blocks = nn.ModuleList([Block(embed_dim, num_heads) for _ in range(depth)])
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, C, H, W = x.shape
        if C == 1:
            x = x.repeat(1, 3, 1, 1)

        x = self.patch_embed(x)
        cls_tokens = self.cls_token.expand(B, -1, -1)
        x = torch.cat((cls_tokens, x), dim=1)
        x = x + self.pos_embed

        for blk in self.blocks:
            x = blk(x)

        x = self.norm(x)
        return x[:, 0]  # Return [CLS] token embedding (B, 768)


class MerMEDEncoder(MedicalImageEncoder):
    """
    Official MerMED Pretrained Medical Foundation Encoder.
    Loads official teacher backbone weights from MerMED.pth.
    Outputs 768-D multi-specialty 2D latent embeddings.
    """

    def __init__(
        self,
        config: Optional[Imaging2DConfig] = None,
        weights_path: Optional[Union[str, Path]] = None,
    ):
        self.config = config or Imaging2DConfig()
        self._dim = 768  # ViT-B/16 output dimension

        self.device = torch.device(
            self.config.device if torch.cuda.is_available() and self.config.device == "cuda" else "cpu"
        )
        self.model = MerMEDViTBackbone().to(self.device)

        # Locate checkpoint path
        target_path = weights_path or getattr(self.config, "mermed_weights_path", "weights/MerMED.pth")
        p = Path(target_path) if target_path else Path("weights/MerMED.pth")

        if not p.exists():
            raise FileNotFoundError(
                f"Official MerMED pretrained weights checkpoint requested at '{p}' but file does not exist! "
                "Explicit failure enforced: no silent fallback to uncalibrated random weights."
            )

        try:
            ckpt = torch.load(p, map_location=self.device, weights_only=False)
            if isinstance(ckpt, dict) and "teacher" in ckpt:
                teacher_weights = ckpt["teacher"]
            elif isinstance(ckpt, dict):
                teacher_weights = ckpt
            else:
                raise ValueError("Unexpected checkpoint data format.")

            # Filter teacher backbone state dict keys
            backbone_state_dict = {}
            for k, v in teacher_weights.items():
                if k.startswith("module.backbone."):
                    backbone_state_dict[k.replace("module.backbone.", "")] = v
                elif k.startswith("backbone."):
                    backbone_state_dict[k.replace("backbone.", "")] = v

            missing_keys, unexpected_keys = self.model.load_state_dict(backbone_state_dict, strict=True)
            if missing_keys or unexpected_keys:
                raise RuntimeError(
                    f"MerMED checkpoint load mismatch: missing={missing_keys}, unexpected={unexpected_keys}"
                )
        except Exception as e:
            raise RuntimeError(f"Failed to load official MerMED teacher checkpoint from '{p}': {e}")

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

        embeddings_arr = embeddings_tensor.cpu().numpy().astype(np.float32)

        if not np.isfinite(embeddings_arr).all():
            raise ValueError("MerMED image encoder output contains NaN or Inf values.")

        return embeddings_arr
