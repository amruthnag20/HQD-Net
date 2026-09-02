"""
Tabular Preprocessing Pipeline for Phase 1 Classical Ingestion & Validation.

Converts raw clinical tabular data (CSV, XLSX, DataFrame) into a clean,
standardized, finite numerical feature matrix without performing compression
or quantum projection.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import os
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from classical_preprocessing.contracts import RawInputContract
from classical_preprocessing.router.input_router import InputKind, ProcessingPath, route_input
from classical_preprocessing.tabular.encoder import create_categorical_encoder
from classical_preprocessing.tabular.imputer import (
    create_categorical_imputer,
    create_numeric_imputer,
)
from classical_preprocessing.tabular.validator import (
    TabularValidationReport,
    validate_tabular_schema,
)

KNOWN_ID_COLUMNS = {
    "patient_id",
    "patient_id_",
    "pat_id",
    "mrn",
    "record_id",
    "id",
    "name",
    "ssn",
    "subject_id",
}

KNOWN_TARGET_COLUMNS = {
    "diagnosis",
    "target",
    "label",
    "class",
    "outcome",
    "risk",
}


@dataclass
class TabularPreprocessingResult:
    """
    Structured output contract from tabular preprocessing.
    """
    processed_features: np.ndarray  # Shape (B, N), float64, finite
    feature_names: List[str]
    target: Optional[np.ndarray] = None
    traceability_metadata: Dict[str, Any] = field(default_factory=dict)
    preprocessing_metadata: Dict[str, Any] = field(default_factory=dict)


class TabularPreprocessingPipeline:
    """
    Classical tabular ingestion and preprocessing pipeline.

    Handles schema validation, patient ID / target separation, missing-value
    imputation, categorical encoding, and numerical scaling.
    """

    def __init__(
        self,
        id_columns: Optional[List[str]] = None,
        target_column: Optional[str] = None,
        numeric_impute_strategy: str = "median",
        categorical_impute_strategy: str = "most_frequent",
        scale_numeric: bool = True,
        validate_schema: bool = True,
    ):
        self.id_columns = id_columns
        self.target_column = target_column
        self.numeric_impute_strategy = numeric_impute_strategy
        self.categorical_impute_strategy = categorical_impute_strategy
        self.scale_numeric = scale_numeric
        self.validate_schema = validate_schema

        self.column_transformer_: Optional[ColumnTransformer] = None
        self.fitted_numeric_cols_: List[str] = []
        self.fitted_cat_cols_: List[str] = []
        self.fitted_id_cols_: List[str] = []
        self.fitted_target_col_: Optional[str] = None
        self.fitted_feature_names_: List[str] = []
        self.is_fitted_: bool = False

    def _read_input(self, input_data: Any) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Ingest input_data using the Stage 2 Input Router.
        """
        if input_data is None:
            raise ValueError("Tabular input cannot be None.")

        metadata: Dict[str, Any] = {}

        # If it's a RawInputContract, unpack
        if isinstance(input_data, RawInputContract):
            metadata.update(input_data.metadata)
            if input_data.dataframe is not None:
                return input_data.dataframe.copy(), metadata
            if input_data.filepath:
                input_data = input_data.filepath
            else:
                raise ValueError("RawInputContract contains neither dataframe nor filepath.")

        decision = route_input(input_data, metadata=metadata)
        if decision.processing_path != ProcessingPath.TABULAR:
            raise ValueError(
                f"Tabular pipeline only accepts TABULAR routing, got input_kind '{decision.input_kind}' "
                f"and processing_path '{decision.processing_path}'."
            )

        if isinstance(input_data, pd.DataFrame):
            return input_data.copy(), metadata

        if isinstance(input_data, (str, Path)):
            path_str = str(input_data)
            candidate_paths = [
                path_str,
                os.path.join("data", "processed", os.path.basename(path_str)),
                os.path.join("data", "raw", os.path.basename(path_str)),
            ]
            for p in candidate_paths:
                if os.path.exists(p):
                    path_str = p
                    break
            ext = decision.extension or Path(path_str).suffix.lower()
            if ext == ".csv":
                df = pd.read_csv(path_str)
            elif ext in (".xlsx", ".xls"):
                df = pd.read_excel(path_str)
            else:
                raise ValueError(f"Unsupported tabular extension: '{ext}'")
            return df, metadata

        raise TypeError(f"Unsupported input object type for tabular pipeline: {type(input_data).__name__}")

    def _detect_columns(self, df: pd.DataFrame) -> Tuple[List[str], Optional[str], List[str], List[str]]:
        """
        Identify ID columns, Target column, Numeric columns, and Categorical columns.
        """
        cols = list(df.columns)

        # Detect IDs
        id_cols = []
        if self.id_columns is not None:
            id_cols = [c for c in self.id_columns if c in cols]
        else:
            id_cols = [c for c in cols if str(c).lower() in KNOWN_ID_COLUMNS]

        # Detect Target
        target_col = None
        if self.target_column is not None:
            if self.target_column in cols:
                target_col = self.target_column
        else:
            for c in cols:
                if str(c).lower() in KNOWN_TARGET_COLUMNS and c not in id_cols:
                    target_col = c
                    break

        feature_cols = [c for c in cols if c not in id_cols and c != target_col]
        if not feature_cols:
            raise ValueError("No usable feature columns remain after identifier/target separation.")

        num_cols = []
        cat_cols = []

        for c in feature_cols:
            if pd.api.types.is_numeric_dtype(df[c]):
                num_cols.append(c)
            else:
                num_cols.append(c) if self._can_convert_to_numeric(df[c]) else cat_cols.append(c)

        return id_cols, target_col, num_cols, cat_cols

    @staticmethod
    def _can_convert_to_numeric(series: pd.Series) -> bool:
        """Check if non-numeric series can be safely cast to float without all becoming NaN."""
        try:
            converted = pd.to_numeric(series.dropna(), errors="coerce")
            return not converted.isnull().all() and len(converted) > 0
        except Exception:
            return False

    def fit(self, input_data: Any) -> "TabularPreprocessingPipeline":
        """
        Fit the tabular preprocessing transformers (imputers, encoder, scaler) on input data.
        """
        df, _ = self._read_input(input_data)

        if self.validate_schema:
            report = validate_tabular_schema(df)
            if not report.is_valid:
                raise ValueError(f"Schema validation failed: {'; '.join(report.errors)}")

        id_cols, target_col, num_cols, cat_cols = self._detect_columns(df)

        transformers = []
        if num_cols:
            num_steps = [("imputer", create_numeric_imputer(self.numeric_impute_strategy))]
            if self.scale_numeric:
                num_steps.append(("scaler", StandardScaler()))
            transformers.append(("numeric", Pipeline(num_steps), num_cols))

        if cat_cols:
            cat_steps = [
                ("imputer", create_categorical_imputer(self.categorical_impute_strategy)),
                ("encoder", create_categorical_encoder(handle_unknown="ignore")),
            ]
            transformers.append(("categorical", Pipeline(cat_steps), cat_cols))

        ct = ColumnTransformer(transformers=transformers, remainder="drop")
        ct.fit(df)

        self.column_transformer_ = ct
        self.fitted_id_cols_ = id_cols
        self.fitted_target_col_ = target_col
        self.fitted_numeric_cols_ = num_cols
        self.fitted_cat_cols_ = cat_cols

        # Extract feature names
        feature_names = []
        if num_cols:
            feature_names.extend(num_cols)
        if cat_cols:
            cat_encoder = ct.named_transformers_["categorical"].named_steps["encoder"]
            encoded_names = list(cat_encoder.get_feature_names_out(cat_cols))
            feature_names.extend(encoded_names)

        self.fitted_feature_names_ = feature_names
        self.is_fitted_ = True
        return self

    def transform(self, input_data: Any) -> TabularPreprocessingResult:
        """
        Transform input data using fitted transformers.
        """
        if not self.is_fitted_ or self.column_transformer_ is None:
            raise RuntimeError("TabularPreprocessingPipeline is not fitted. Call fit() first.")

        df, input_meta = self._read_input(input_data)

        # Extract IDs
        traceability_metadata = {}
        for id_col in self.fitted_id_cols_:
            if id_col in df.columns:
                traceability_metadata[id_col] = df[id_col].tolist()

        # Extract Target
        target_array = None
        if self.fitted_target_col_ and self.fitted_target_col_ in df.columns:
            target_array = df[self.fitted_target_col_].to_numpy()

        # Coerce numeric features if strings are numeric
        for c in self.fitted_numeric_cols_:
            if c in df.columns and not pd.api.types.is_numeric_dtype(df[c]):
                df[c] = pd.to_numeric(df[c], errors="coerce")

        # Transform clinical features
        features_matrix = self.column_transformer_.transform(df)
        features_matrix = np.asarray(features_matrix, dtype=np.float64)

        if not np.isfinite(features_matrix).all():
            raise ValueError("Processed tabular feature matrix contains NaN or Inf values.")

        prep_meta = {
            "numeric_columns": self.fitted_numeric_cols_,
            "categorical_columns": self.fitted_cat_cols_,
            "id_columns": self.fitted_id_cols_,
            "target_column": self.fitted_target_col_,
            "output_dim": features_matrix.shape[1],
            "input_metadata": input_meta,
        }

        return TabularPreprocessingResult(
            processed_features=features_matrix,
            feature_names=self.fitted_feature_names_,
            target=target_array,
            traceability_metadata=traceability_metadata,
            preprocessing_metadata=prep_meta,
        )

    def fit_transform(self, input_data: Any) -> TabularPreprocessingResult:
        """
        Fit transformers and transform input data in a single operation.
        """
        return self.fit(input_data).transform(input_data)
