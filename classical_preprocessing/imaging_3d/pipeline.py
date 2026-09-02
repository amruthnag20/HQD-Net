"""
3D Volumetric Medical Imaging Pipeline for Stage 7 (MRI / CT).
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np
import torch

from classical_preprocessing.contracts import RawInputContract
from classical_preprocessing.imaging_3d.config import Imaging3DConfig
from classical_preprocessing.imaging_3d.encoder import Medical3DEncoder, get_medical_3d_encoder
from classical_preprocessing.imaging_3d.preprocessing import preprocess_3d_volume
from classical_preprocessing.router.input_router import InputKind, ProcessingPath, route_input


@dataclass
class VolumeRepresentation:
    """
    Structured output contract from 3D Medical Imaging Pipeline.
    """
    embeddings: np.ndarray  # Shape (B, D), float64, finite
    sample_ids: List[str]
    embedding_dim: int
    metadata: Dict[str, Any] = field(default_factory=dict)


class Imaging3DPipeline:
    """
    Processing pipeline for 3D volumetric medical images (MRI / CT / NIfTI / DICOM).
    """

    def __init__(
        self,
        config: Optional[Imaging3DConfig] = None,
        encoder: Optional[Medical3DEncoder] = None,
    ):
        self.config = config or Imaging3DConfig()
        self.encoder = encoder or get_medical_3d_encoder(self.config)

    def _route_and_validate_input(self, input_item: Any) -> Any:
        """
        Verify that input_item is a valid 3D volume input via Stage 2 router.
        """
        if isinstance(input_item, (str, Path)):
            path_str = str(input_item)
            decision = route_input(path_str)
            if decision.processing_path not in (ProcessingPath.IMAGING_3D, ProcessingPath.DEFERRED_IMAGING):
                raise ValueError(
                    f"3D Imaging pipeline expects IMAGING_3D input, got path '{path_str}' "
                    f"routed to '{decision.processing_path}'"
                )
            return path_str

        if isinstance(input_item, RawInputContract):
            if input_item.filepath:
                return self._route_and_validate_input(input_item.filepath)

        return input_item

    def process_volume(
        self,
        volume_input: Any,
        sample_id: Optional[str] = None,
    ) -> VolumeRepresentation:
        """
        Process a single 3D medical volume.

        Parameters
        ----------
        volume_input : Any
            Path, NIfTI file, Volume3DData, or 3D numpy array.
        sample_id : Optional[str]
            Optional sample identifier.

        Returns
        -------
        VolumeRepresentation
        """
        return self.process_batch(volume_inputs=[volume_input], sample_ids=[sample_id] if sample_id else None)

    def process_batch(
        self,
        volume_inputs: List[Any],
        sample_ids: Optional[List[str]] = None,
    ) -> VolumeRepresentation:
        """
        Process a batch of 3D medical volumes in configurable batch sizes.

        Parameters
        ----------
        volume_inputs : List[Any]
            List of 3D volume file paths, Volume3DData, or 3D numpy arrays.
        sample_ids : Optional[List[str]]
            List of sample identifiers corresponding to volume_inputs.

        Returns
        -------
        VolumeRepresentation
            Structured result containing embeddings matrix of shape (B, D).
        """
        if not volume_inputs:
            raise ValueError("volume_inputs list cannot be empty.")

        n_samples = len(volume_inputs)
        ids = sample_ids if sample_ids is not None else [f"vol_{i:04d}" for i in range(n_samples)]

        if len(ids) != n_samples:
            raise ValueError(f"Length of sample_ids ({len(ids)}) does not match volume count ({n_samples})")

        preprocessed_tensors = []
        pipeline_meta_list = []

        for idx, item in enumerate(volume_inputs):
            validated_item = self._route_and_validate_input(item)
            tensor_4d, meta = preprocess_3d_volume(validated_item, config=self.config)
            preprocessed_tensors.append(tensor_4d)
            pipeline_meta_list.append(meta)

        # Batch feature extraction
        batch_size = self.config.batch_size
        all_embeddings = []

        for i in range(0, n_samples, batch_size):
            batch_list = preprocessed_tensors[i : i + batch_size]
            batch_tensor = torch.stack(batch_list, dim=0)  # Shape (B_sub, 1, D, H, W)
            sub_embeddings = self.encoder.encode(batch_tensor)
            all_embeddings.append(sub_embeddings)

        embeddings_matrix = np.vstack(all_embeddings).astype(np.float64)

        if not np.isfinite(embeddings_matrix).all():
            raise ValueError("Generated 3D volume embeddings contain NaN or Inf values.")

        meta_summary = {
            "modality": self.config.modality,
            "target_shape": self.config.target_shape,
            "batch_size": self.config.batch_size,
            "encoder_name": self.config.encoder_name,
            "total_samples": n_samples,
            "embedding_dim": self.encoder.embedding_dim,
        }

        return VolumeRepresentation(
            embeddings=embeddings_matrix,
            sample_ids=ids,
            embedding_dim=self.encoder.embedding_dim,
            metadata=meta_summary,
        )
