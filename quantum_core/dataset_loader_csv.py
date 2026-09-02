"""
HQD-Net Phase 1: Classical Feature Selection & CSV Data Preprocessing

Handles ingestion of raw, high-dimensional clinical CSV data, performs
feature ranking via Random Forest, isolates top 10 continuous biomarkers,
and scales them for stable Ry angle embedding in the 10-qubit quantum core.

Usage:
    from quantum_core.dataset_loader_csv import load_real_clinical_csv
    X_train, X_test, y_train, y_test, biomarker_names = load_real_clinical_csv(
        "clinical_data.csv",
        target_column="diagnosis",
        n_features=10
    )
"""

import os
import pandas as pd
import numpy as np
import torch
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer


def load_real_clinical_csv(csv_path, target_column, drop_columns=None, n_features=10):
    """
    Phase 1: Pre-Quantum Ingestion, Cleaning, and Feature Selection.
    
    Reads raw clinical tabular data, imputes missing values, extracts the
    most predictive continuous biomarkers, scales them, and outputs float64 tensors.
    
    Args:
        csv_path (str): Path to clinical CSV file
        target_column (str): Name of target diagnosis/outcome column
        drop_columns (list): Columns to exclude (e.g., patient IDs, dates)
        n_features (int): Number of top biomarkers to select (default: 10)
    
    Returns:
        tuple: (X_train, X_test, y_train, y_test, feature_names)
            - X_train: torch.Tensor of shape (n_train, 10) in float64
            - X_test: torch.Tensor of shape (n_test, 10) in float64
            - y_train: torch.Tensor of shape (n_train,) in int64
            - y_test: torch.Tensor of shape (n_test,) in int64
            - feature_names: list of selected biomarker names
    """
    
    candidate_paths = [
        csv_path,
        os.path.join("data", "processed", os.path.basename(csv_path)),
        os.path.join("data", "raw", os.path.basename(csv_path)),
        os.path.join("data", "processed", csv_path),
        os.path.join("data", "raw", csv_path),
    ]
    resolved_path = None
    for p in candidate_paths:
        if p and os.path.exists(p):
            resolved_path = p
            break

    if not resolved_path:
        raise FileNotFoundError(f"Clinical CSV file not found at path: {csv_path}")

    csv_path = resolved_path
    print(f"\n[Phase 1] Loading raw clinical CSV: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"  [+] Extracted {len(df)} patient records with {len(df.columns)} raw columns")

    # Drop identifiers, keys, or non-numeric columns
    if drop_columns is None:
        drop_columns = []
    ignore_cols = [col for col in drop_columns if col in df.columns]

    # Separate features and target
    try:
        X_raw = df.drop(columns=ignore_cols + [target_column], errors='ignore')
        y_raw = df[target_column].values
    except KeyError as e:
        raise ValueError(f"Target column '{target_column}' not found in CSV. Available: {df.columns.tolist()}")

    print(f"  [+] Selected {len(X_raw.columns)} feature columns for analysis")

    # Impute missing clinical data using median values to preserve feature distributions
    print(f"  - Handling missing values via median imputation...")
    imputer = SimpleImputer(strategy='median')
    X_imputed = imputer.fit_transform(X_raw)

    # Classical feature ranking via Random Forest to isolate top biomarkers
    # This prevents barren plateaus in quantum gradient descent
    print(f"  - Ranking {X_raw.shape[1]} features classically via Random Forest...")
    print(f"    (Isolating top {n_features} high-signal biomarkers to prevent barren plateaus)")
    
    selector = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    selector.fit(X_imputed, y_raw)

    importances = selector.feature_importances_
    sorted_indices = np.argsort(importances)[::-1]

    selected_indices = sorted_indices[:n_features]
    selected_feature_names = [X_raw.columns[i] for i in selected_indices]

    print(f"  [+] Top Diagnostic Biomarkers Selected:")
    for rank, idx in enumerate(selected_indices[:5]):
        print(f"    Rank {rank+1}: {X_raw.columns[idx]:<30} (importance: {importances[idx]:.4f})")
    
    if n_features > 5:
        print(f"    ... ({n_features - 5} more biomarkers)")

    # Extract selected features
    X_selected = X_imputed[:, selected_indices]

    # Scale variables using StandardScaler to fit Ry angle embedding ranges [-pi, pi]
    print(f"  - Standardizing {n_features} biomarkers for stable angle embedding...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_selected)

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_raw, test_size=0.2, random_state=42, stratify=y_raw
    )

    # Output double precision (float64) PyTorch tensors for gradient stability
    X_train_t = torch.tensor(X_train, dtype=torch.float64)
    X_test_t = torch.tensor(X_test, dtype=torch.float64)
    y_train_t = torch.tensor(y_train, dtype=torch.long)
    y_test_t = torch.tensor(y_test, dtype=torch.long)

    print(f"  [+] Phase 1 preprocessing complete!")
    print(f"  [+] Data ready as high-precision tensors (float64)")
    print(f"    - Training split: {X_train_t.shape}")
    print(f"    - Test split:     {X_test_t.shape}")
    
    return X_train_t, X_test_t, y_train_t, y_test_t, selected_feature_names


if __name__ == "__main__":
    # Example usage with synthetic dataset
    import tempfile
    
    print("="*70)
    print("TESTING: Clinical CSV Data Loader")
    print("="*70)
    
    # Generate a mock clinical dataset for testing
    np.random.seed(42)
    n_patients = 500
    n_raw_features = 24
    
    mock_data = np.random.randn(n_patients, n_raw_features)
    mock_df = pd.DataFrame(mock_data, columns=[f"biomarker_{i:02d}" for i in range(n_raw_features)])
    mock_df["patient_id"] = [f"PAT_{1000+i}" for i in range(n_patients)]
    mock_df["diagnosis"] = np.random.choice([0, 1], size=n_patients, p=[0.6, 0.4])
    
    # Save to temporary CSV
    temp_csv = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    temp_path = temp_csv.name
    temp_csv.close()
    
    mock_df.to_csv(temp_path, index=False)
    print(f"\nGenerated mock clinical dataset: {temp_path}\n")
    
    # Load and process
    X_train, X_test, y_train, y_test, feature_names = load_real_clinical_csv(
        temp_path,
        target_column="diagnosis",
        drop_columns=["patient_id"],
        n_features=10
    )
    
    print(f"\n[OK] Data loader test successful!")
    print(f"   Selected biomarkers: {feature_names}")
    
    # Cleanup
    os.remove(temp_path)
