"""
Task-Conditioning Adapter Interface for Multimodal Representation Prioritization.
Provides a clean architectural abstraction connecting medical representations to optional disease/task context.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Union
import numpy as np
import torch
import torch.nn as nn


@dataclass
class TaskContext:
    """
    Metadata container for clinical task or disease context.
    """
    task_id: Optional[str] = None
    disease_target: Optional[int] = None
    task_embedding: Optional[np.ndarray] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class TaskConditioningAdapter(nn.Module):
    """
    Clean architectural interface for task-conditioned feature prioritization.
    In default/uncalibrated mode, acts as a deterministic pass-through / identity layer
    without hardcoded arbitrary disease weighting rules.
    """

    def __init__(self, in_features: int = 768, out_features: Optional[int] = None):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features or in_features

        if self.in_features != self.out_features:
            self.adapter_layer = nn.Linear(self.in_features, self.out_features)
        else:
            self.adapter_layer = nn.Identity()

        self.eval()

    def forward(
        self,
        embeddings: Union[np.ndarray, torch.Tensor],
        task_context: Optional[TaskContext] = None,
    ) -> Union[np.ndarray, torch.Tensor]:
        """
        Apply task-conditioned prioritization or pass-through projection.

        Parameters
        ----------
        embeddings : Union[np.ndarray, torch.Tensor]
            Input feature embeddings of shape (B, D).
        task_context : Optional[TaskContext]
            Optional task or disease context metadata.

        Returns
        -------
        Union[np.ndarray, torch.Tensor]
            Conditioned or pass-through feature embeddings of shape (B, D_out).
        """
        is_numpy = isinstance(embeddings, np.ndarray)

        if is_numpy:
            tensor_in = torch.from_numpy(embeddings).to(torch.float32)
        else:
            tensor_in = embeddings.to(torch.float32)

        with torch.no_grad():
            out_tensor = self.adapter_layer(tensor_in)

        if is_numpy:
            return out_tensor.cpu().numpy().astype(np.float64)

        return out_tensor
