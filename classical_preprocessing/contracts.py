"""
Shared data contracts for Phase 1 Classical Preprocessing.
Defines conceptual boundaries between raw data, tabular/image contracts,
latent representations, and final 10-D quantum-ready representations.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
import torch


@dataclass
class RawInputContract:
    """
    Contract representing raw clinical inputs prior to preprocessing.
    
    SECURITY REQUIREMENT: Patient/traceability metadata must be kept strictly
    separate from machine learning feature tensors/matrices.
    """
    input_source: str  # e.g., "filepath", "raw_bytes", "dataframe", "numpy_array"
    input_type: str    # e.g., "tabular", "image", "dicom", "nifti"
    modality: str      # e.g., "clinical_tabular", "chest_xray", "brain_mri"
    filepath: Optional[str] = None
    dataframe: Optional[Any] = None
    raw_bytes: Optional[bytes] = None
    patient_metadata: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TabularFeatureContract:
    """
    Contract representing preprocessed tabular feature matrices.
    Guarantees feature matrices contain no patient identifiers.
    """
    feature_matrix: Any  # torch.Tensor, np.ndarray, or List
    feature_names: List[str]
    target: Optional[Any] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ImageTensorContract:
    """
    Contract representing medical image tensors.
    """
    image_tensor: Any  # torch.Tensor or np.ndarray
    modality: str
    shape: Tuple[int, ...]
    spacing_metadata: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LatentVectorContract:
    """
    Contract representing data before final 10-D quantum projection.
    """
    latent_tensor: Any  # torch.Tensor or np.ndarray
    source_modality: str
    latent_dimension: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Unified10DRepresentation:
    """
    Final Phase 1 output representing a 10-dimensional quantum-ready vector or batch.
    
    The underlying tensor must satisfy:
      - shape: (10,) or (B, 10)
      - dtype: torch.float64
      - finite: True (no NaN or +/-Inf)
      - range: [-pi, pi]
    """
    tensor: torch.Tensor
    feature_ordering: List[str]
    source_modality: str
    metadata: Dict[str, Any] = field(default_factory=dict)
