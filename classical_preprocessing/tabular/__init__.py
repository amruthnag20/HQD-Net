"""
Tabular Preprocessing and Validation package for Phase 1 Classical Ingestion.
"""

from classical_preprocessing.tabular.encoder import create_categorical_encoder
from classical_preprocessing.tabular.imputer import (
    create_categorical_imputer,
    create_numeric_imputer,
)
from classical_preprocessing.tabular.pipeline import (
    TabularPreprocessingPipeline,
    TabularPreprocessingResult,
)
from classical_preprocessing.tabular.validator import (
    TabularValidationReport,
    analyze_missing_values,
    validate_tabular_schema,
)

__all__ = [
    "validate_tabular_schema",
    "analyze_missing_values",
    "TabularValidationReport",
    "create_numeric_imputer",
    "create_categorical_imputer",
    "create_categorical_encoder",
    "TabularPreprocessingPipeline",
    "TabularPreprocessingResult",
]
