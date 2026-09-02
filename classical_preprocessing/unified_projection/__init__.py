"""
Phase 1 Stage 8 Unified Multimodal 10-D Projection Package.
"""

from classical_preprocessing.unified_projection.alignment import AlignedMultimodalBatch, align_multimodal_inputs
from classical_preprocessing.unified_projection.config import UnifiedProjectionConfig
from classical_preprocessing.unified_projection.evaluation import ProjectionEvaluationReport, evaluate_10d_projection
from classical_preprocessing.unified_projection.fusion import MultimodalFusionNetwork
from classical_preprocessing.unified_projection.projector import Unified10DProjector, UnifiedRepresentation

__all__ = [
    "UnifiedProjectionConfig",
    "AlignedMultimodalBatch",
    "align_multimodal_inputs",
    "MultimodalFusionNetwork",
    "Unified10DProjector",
    "UnifiedRepresentation",
    "ProjectionEvaluationReport",
    "evaluate_10d_projection",
]
