"""
PyTorch Multimodal Fusion Network for Stage 8 10-D Projection.
"""

from typing import Optional, Tuple
import torch
import torch.nn as nn


class MultimodalFusionNetwork(nn.Module):
    """
    Modality-aware PyTorch Neural Network projecting heterogeneous clinical inputs into a 10-D latent vector.
    Uses LayerNorm for deterministic single-sample (N=1) and batch processing.
    """

    def __init__(
        self,
        d_tab: int = 0,
        d_2d: int = 0,
        d_3d: int = 0,
        modality_hidden_dim: int = 64,
        fusion_hidden_dim: int = 128,
        output_dim: int = 10,
        seed: int = 42,
    ):
        super().__init__()
        torch.manual_seed(seed)

        self.d_tab = d_tab
        self.d_2d = d_2d
        self.d_3d = d_3d
        self.output_dim = output_dim

        fused_in_dim = 3  # Start with 3 presence mask flags

        # 1. Modality-specific branch layers
        if d_tab > 0:
            self.tab_branch = nn.Sequential(
                nn.Linear(d_tab, modality_hidden_dim),
                nn.LayerNorm(modality_hidden_dim),
                nn.ReLU(inplace=True),
            )
            fused_in_dim += modality_hidden_dim
        else:
            self.tab_branch = None

        if d_2d > 0:
            self.img2d_branch = nn.Sequential(
                nn.Linear(d_2d, modality_hidden_dim),
                nn.LayerNorm(modality_hidden_dim),
                nn.ReLU(inplace=True),
            )
            fused_in_dim += modality_hidden_dim
        else:
            self.img2d_branch = None

        if d_3d > 0:
            self.img3d_branch = nn.Sequential(
                nn.Linear(d_3d, modality_hidden_dim),
                nn.LayerNorm(modality_hidden_dim),
                nn.ReLU(inplace=True),
            )
            fused_in_dim += modality_hidden_dim
        else:
            self.img3d_branch = None

        # 2. Shared fusion bottleneck layers
        self.fusion_mlp = nn.Sequential(
            nn.Linear(fused_in_dim, fusion_hidden_dim),
            nn.LayerNorm(fusion_hidden_dim),
            nn.ReLU(inplace=True),
            nn.Linear(fusion_hidden_dim, output_dim),
        )
        self.eval()

    def forward(
        self,
        tab_x: Optional[torch.Tensor],
        img2d_x: Optional[torch.Tensor],
        img3d_x: Optional[torch.Tensor],
        mask: torch.Tensor,
    ) -> torch.Tensor:
        """
        Forward pass projecting aligned multimodal inputs into 10-D latent vectors.

        Parameters
        ----------
        tab_x : Optional[torch.Tensor]
            Tabular matrix of shape (B, D_tab).
        img2d_x : Optional[torch.Tensor]
            2D image latent matrix of shape (B, D_2d).
        img3d_x : Optional[torch.Tensor]
            3D image latent matrix of shape (B, D_3d).
        mask : torch.Tensor
            Presence boolean mask tensor of shape (B, 3).

        Returns
        -------
        torch.Tensor
            Latent matrix of shape (B, 10), float32.
        """
        batch_size = mask.shape[0]
        feats = [mask.float()]

        if self.d_tab > 0 and self.tab_branch is not None:
            if tab_x is not None and tab_x.shape[1] > 0:
                tab_out = self.tab_branch(tab_x)
            else:
                tab_out = torch.zeros(batch_size, self.tab_branch[0].out_features, device=mask.device)
            feats.append(tab_out)

        if self.d_2d > 0 and self.img2d_branch is not None:
            if img2d_x is not None and img2d_x.shape[1] > 0:
                img2d_out = self.img2d_branch(img2d_x)
            else:
                img2d_out = torch.zeros(batch_size, self.img2d_branch[0].out_features, device=mask.device)
            feats.append(img2d_out)

        if self.d_3d > 0 and self.img3d_branch is not None:
            if img3d_x is not None and img3d_x.shape[1] > 0:
                img3d_out = self.img3d_branch(img3d_x)
            else:
                img3d_out = torch.zeros(batch_size, self.img3d_branch[0].out_features, device=mask.device)
            feats.append(img3d_out)

        concat_feats = torch.cat(feats, dim=1)
        z_out = self.fusion_mlp(concat_feats)
        return z_out

