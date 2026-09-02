"""
Tabular Representation Compression Package using PCA for Stage 5.
"""

from classical_preprocessing.compression.config import CompressionConfig
from classical_preprocessing.compression.evaluation import (
    InformationRetentionReport,
    evaluate_information_retention,
)
from classical_preprocessing.compression.tabular_compressor import (
    TabularCompressionResult,
    TabularCompressor,
)

__all__ = [
    "CompressionConfig",
    "TabularCompressor",
    "TabularCompressionResult",
    "InformationRetentionReport",
    "evaluate_information_retention",
]
