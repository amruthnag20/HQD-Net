"""
2D Medical Imaging Pipeline for Stage 6 Classical Ingestion.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np

from PIL import Image
import torch

from classical_preprocessing.contracts import RawInputContract
from classical_preprocessing.imaging_2d.config import Imaging2DConfig
from classical_preprocessing.imaging_2d.encoder import MedicalImageEncoder, get_medical_encoder
from classical_preprocessing.imaging_2d.preprocessing import preprocess_2d_image
from classical_preprocessing.router.input_router import InputKind, ProcessingPath, route_input


@dataclass
class ImageRepresentation:
    """
    Structured output contract from 2D Medical Imaging Pipeline.
    """
    embeddings: np.ndarray  # Shape (B, D), float64, finite
    sample_ids: List[str]
    embedding_dim: int
    metadata: Dict[str, Any] = field(default_factory=dict)


class Imaging2DPipeline:
    """
    Processing pipeline for 2D medical images (X-ray, PNG, JPG, JPEG).
    """

    def __init__(
        self,
        config: Optional[Imaging2DConfig] = None,
        encoder: Optional[MedicalImageEncoder] = None,
    ):
        self.config = config or Imaging2DConfig()
        self.encoder = encoder or get_medical_encoder(self.config)

    def _route_and_validate_input(self, input_item: Any) -> Any:
        """
        Verify that input_item is a valid 2D image input via Stage 2 router.
        """
        if isinstance(input_item, (str, Path)):
            path_str = str(input_item)
            decision = route_input(path_str)
            if decision.processing_path != ProcessingPath.IMAGING_2D:
                raise ValueError(
                    f"2D Imaging pipeline expects IMAGING_2D input, got path '{path_str}' "
                    f"routed to '{decision.processing_path}'"
                )
            return path_str

        if isinstance(input_item, RawInputContract):
            if input_item.filepath:
                return self._route_and_validate_input(input_item.filepath)
            if input_item.image_tensor is not None:
                return input_item.image_tensor

        return input_item

    def process_image(
        self,
        image_input: Any,
        sample_id: Optional[str] = None,
    ) -> ImageRepresentation:
        """
        Process a single 2D medical image.

        Parameters
        ----------
        image_input : Any
            Path, PIL Image, or numpy array.
        sample_id : Optional[str]
            Optional sample identifier.

        Returns
        -------
        ImageRepresentation
        """
        return self.process_batch(image_inputs=[image_input], sample_ids=[sample_id] if sample_id else None)

    def process_batch(
        self,
        image_inputs: List[Any],
        sample_ids: Optional[List[str]] = None,
    ) -> ImageRepresentation:
        """
        Process a batch of 2D medical images in configurable batch sizes.

        Parameters
        ----------
        image_inputs : List[Any]
            List of image paths, PIL Images, or numpy arrays.
        sample_ids : Optional[List[str]]
            List of sample identifiers corresponding to image_inputs.

        Returns
        -------
        ImageRepresentation
            Structured result containing embeddings matrix of shape (B, D).
        """
        if not image_inputs:
            raise ValueError("image_inputs list cannot be empty.")

        n_samples = len(image_inputs)
        ids = sample_ids if sample_ids is not None else [f"img_{i:04d}" for i in range(n_samples)]

        if len(ids) != n_samples:
            raise ValueError(f"Length of sample_ids ({len(ids)}) does not match image count ({n_samples})")

        preprocessed_tensors = []
        pipeline_meta_list = []

        for idx, item in enumerate(image_inputs):
            validated_item = self._route_and_validate_input(item)
            tensor, meta = preprocess_2d_image(validated_item, config=self.config)
            preprocessed_tensors.append(tensor)
            pipeline_meta_list.append(meta)

        # Batch feature extraction
        batch_size = self.config.batch_size
        all_embeddings = []

        for i in range(0, n_samples, batch_size):
            batch_list = preprocessed_tensors[i : i + batch_size]
            batch_tensor = torch.stack(batch_list, dim=0)  # Shape (B_sub, C, H, W)
            sub_embeddings = self.encoder.encode(batch_tensor)
            all_embeddings.append(sub_embeddings)

        embeddings_matrix = np.vstack(all_embeddings).astype(np.float64)

        if not np.isfinite(embeddings_matrix).all():
            raise ValueError("Generated 2D image embeddings contain NaN or Inf values.")

        meta_summary = {
            "modality": self.config.modality,
            "color_mode": self.config.color_mode,
            "target_size": self.config.target_size,
            "batch_size": self.config.batch_size,
            "encoder_name": self.config.encoder_name,
            "total_samples": n_samples,
            "embedding_dim": self.encoder.embedding_dim,
        }

        return ImageRepresentation(
            embeddings=embeddings_matrix,
            sample_ids=ids,
            embedding_dim=self.encoder.embedding_dim,
            metadata=meta_summary,
        )
