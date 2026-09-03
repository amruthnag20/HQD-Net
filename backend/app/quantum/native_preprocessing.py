"""
Native-domain preprocessing module for Phase 3B.2.
Reconstructs the exact original training preprocessing contract:
  clinical_data_synthetic.csv (500 rows × 24 biomarkers)
       ↓
  median imputation (SimpleImputer)
       ↓
  RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
       ↓
  top 10 features by Gini importance (feature_importances_)
       ↓
  StandardScaler fit on the entire 500-sample native dataset
       ↓
  exact 10-dimensional standardized input
"""

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

NATIVE_DATASET_FILENAME = "clinical_data_synthetic.csv"


@dataclass
class NativePreprocessingArtifacts:
    selected_feature_names: List[str]
    selected_indices: List[int]
    feature_importances: List[float]
    scaler_means: List[float]
    scaler_scales: List[float]
    scaler_variances: List[float]
    X_scaled: np.ndarray
    y: np.ndarray
    df: pd.DataFrame


def reproduce_native_preprocessing(csv_path: Optional[Path] = None) -> NativePreprocessingArtifacts:
    """
    Executes the exact original Phase 1 feature selection and scaling contract
    using clinical_data_synthetic.csv.
    """
    if csv_path is None:
        # Auto-detect root path
        current_dir = Path(__file__).resolve().parent
        project_root = current_dir.parent.parent.parent
        csv_path = project_root / NATIVE_DATASET_FILENAME

    if not csv_path.exists():
        raise FileNotFoundError(f"Authoritative native training dataset not found at: {csv_path}")

    df = pd.read_csv(csv_path)

    if len(df) != 500:
        raise ValueError(f"Expected native dataset with 500 rows, found {len(df)} rows.")

    if "diagnosis" not in df.columns:
        raise ValueError("Missing 'diagnosis' target column in native dataset.")

    # Drop identifiers and target
    X_raw = df.drop(columns=["patient_id", "diagnosis"], errors="ignore")
    y_raw = df["diagnosis"].values

    if X_raw.shape[1] != 24:
        raise ValueError(f"Expected 24 raw biomarker columns, found {X_raw.shape[1]}.")

    # Step 1: Median imputation
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X_raw)

    # Step 2: Random Forest feature ranking
    selector = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    selector.fit(X_imputed, y_raw)

    # Step 3 & 4: Top 10 feature extraction in descending importance order
    importances = selector.feature_importances_
    sorted_indices = np.argsort(importances)[::-1][:10]
    selected_features = [X_raw.columns[i] for i in sorted_indices]
    selected_importances = [float(importances[i]) for i in sorted_indices]

    # Step 5: Full-dataset StandardScaler fit
    X_selected = X_imputed[:, sorted_indices]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_selected)

    return NativePreprocessingArtifacts(
        selected_feature_names=selected_features,
        selected_indices=sorted_indices.tolist(),
        feature_importances=selected_importances,
        scaler_means=scaler.mean_.tolist(),
        scaler_scales=scaler.scale_.tolist(),
        scaler_variances=scaler.var_.tolist(),
        X_scaled=X_scaled,
        y=y_raw,
        df=df,
    )
