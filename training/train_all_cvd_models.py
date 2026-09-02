r"""
HQD-Net Real Medical Model Training & Benchmarking Engine

Executes end-to-end CVD model training on data/raw/cardio_train.csv:
1. Dataset validation & clinical preprocessing (outlier filtering, BMI derivation)
2. Stratified 80/20 train/test splitting (random_state=42)
3. Tabular 10-D feature projection for quantum handoff
4. Classical model training (SVM RBF, Random Forest, HistGradientBoosting, Logistic Regression)
5. Baseline VQC evaluation (quantum_core/vqc_model_weights.pth)
6. New CVD 10-Qubit VQC training & weight serialization (models/quantum/cvd_vqc/vqc_cvd.pth)
7. Held-out test set benchmarking (Accuracy, Precision, Recall, Specificity, F1, ROC-AUC, Brier Score)
8. QuXAI Jacobian feature sensitivity explainability analysis
"""

import os
import sys
import json
import time
import math
import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from pathlib import Path
from typing import Dict, Any, Tuple

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    brier_score_loss,
    confusion_matrix,
)

import pennylane as qml
from pennylane.qnn import TorchLayer

# Setup Project Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "quantum_core"))

# -----------------------------------------------------------------------------
# 1. QUANTUM CIRCUIT & MODEL DEFINITION
# -----------------------------------------------------------------------------
n_qubits = 10
dev = qml.device("default.qubit", wires=n_qubits)


@qml.qnode(dev, interface="torch", diff_method="backprop")
def cvd_quantum_circuit(inputs, weights):
    """10-Qubit Angle Embedding with Strongly Entangling Layers."""
    inputs_64 = inputs.to(torch.float64) if isinstance(inputs, torch.Tensor) else torch.tensor(inputs, dtype=torch.float64)
    qml.AngleEmbedding(inputs_64, wires=range(n_qubits), rotation="Y")
    qml.StronglyEntanglingLayers(weights, wires=range(n_qubits))
    return [qml.expval(qml.PauliZ(i)) for i in range(n_qubits)]


class DressedCVDVQC(nn.Module):
    """Hybrid 10-Qubit VQC for Cardiovascular Disease Classification."""

    def __init__(self, n_layers: int = 2):
        super().__init__()
        weight_shapes = {"weights": (n_layers, n_qubits, 3)}
        self.q_layer = TorchLayer(cvd_quantum_circuit, weight_shapes)
        self.post_processing = nn.Sequential(
            nn.Linear(n_qubits, 16),
            nn.ReLU(),
            nn.Linear(16, 2),
            nn.Softmax(dim=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        q_out = self.q_layer(x)
        return self.post_processing(q_out)


# -----------------------------------------------------------------------------
# 2. CLINICAL PREPROCESSING & PIPELINE
# -----------------------------------------------------------------------------
def load_and_preprocess_cvd_data(raw_csv_path: Path) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, Dict[str, Any]]:
    """Loads raw cardio_train.csv and applies physiological validation & feature engineering."""
    if not raw_csv_path.exists():
        raise FileNotFoundError(f"Raw dataset not found at {raw_csv_path}")

    # Determine delimiter
    with open(raw_csv_path, "r", encoding="utf-8") as f:
        first_line = f.readline()
    sep = ";" if ";" in first_line else ","

    df_raw = pd.read_csv(raw_csv_path, sep=sep)
    raw_count = len(df_raw)

    # Feature Engineering
    df = df_raw.copy()
    df["age_years"] = df["age"] / 365.25
    df["bmi"] = df["weight"] / ((df["height"] / 100.0) ** 2)

    # Physiological Filtering Mask
    valid_mask = (
        (df["ap_hi"] >= 60)
        & (df["ap_hi"] <= 240)
        & (df["ap_lo"] >= 40)
        & (df["ap_lo"] <= 160)
        & (df["ap_hi"] > df["ap_lo"])
        & (df["height"] >= 100)
        & (df["height"] <= 220)
        & (df["weight"] >= 30)
        & (df["weight"] <= 200)
    )

    df_clean = df[valid_mask].copy()
    clean_count = len(df_clean)
    removed_count = raw_count - clean_count

    # Select Feature Matrix
    feature_cols = [
        "age_years",
        "gender",
        "height",
        "weight",
        "bmi",
        "ap_hi",
        "ap_lo",
        "cholesterol",
        "gluc",
        "smoke",
        "alco",
        "active",
    ]
    target_col = "cardio"

    X = df_clean[feature_cols]
    y = df_clean[target_col]

    metadata = {
        "raw_rows": raw_count,
        "retained_rows": clean_count,
        "removed_rows": removed_count,
        "removed_percentage": float(removed_count / raw_count * 100.0),
        "target_balance_raw": df_raw[target_col].value_counts(normalize=True).to_dict(),
        "target_balance_clean": y.value_counts(normalize=True).to_dict(),
        "feature_names": feature_cols,
    }

    return df_raw, X, y, metadata


# -----------------------------------------------------------------------------
# 3. METRICS EVALUATION HELPER
# -----------------------------------------------------------------------------
def evaluate_model_performance(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> Dict[str, float]:
    """Calculates complete clinical evaluation metrics."""
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    auc = roc_auc_score(y_true, y_prob) if len(np.unique(y_true)) > 1 else 0.5
    brier = brier_score_loss(y_true, y_prob)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    return {
        "accuracy": float(acc),
        "precision": float(prec),
        "recall_sensitivity": float(rec),
        "specificity": float(spec),
        "f1_score": float(f1),
        "roc_auc": float(auc),
        "brier_score": float(brier),
    }


# -----------------------------------------------------------------------------
# 4. MAIN EXECUTION PIPELINE
# -----------------------------------------------------------------------------
def run_cvd_pipeline():
    print("=" * 80)
    print("HQD-NET: REAL CARDIOVASCULAR DATASET MODEL TRAINING & EVALUATION Core")
    print("=" * 80)

    # Paths Setup
    raw_csv_path = PROJECT_ROOT / "data" / "raw" / "cardio_train.csv"
    output_dir_models = PROJECT_ROOT / "models"
    models_classical_svm = output_dir_models / "classical" / "svm"
    models_classical_rf = output_dir_models / "classical" / "random_forest"
    models_quantum_cvd = output_dir_models / "quantum" / "cvd_vqc"
    splits_dir = PROJECT_ROOT / "data" / "splits"

    for d in [models_classical_svm, models_classical_rf, models_quantum_cvd, splits_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # 1. Dataset Preprocessing
    print("\n[Phase 1] Loading & Preprocessing Cardiovascular Dataset...")
    df_raw, X, y, meta = load_and_preprocess_cvd_data(raw_csv_path)
    print(f"  Raw Rows: {meta['raw_rows']}")
    print(f"  Clean Rows: {meta['retained_rows']} (Filtered {meta['removed_rows']} outliers, {meta['removed_percentage']:.2f}%)")
    print(f"  Features ({len(meta['feature_names'])}): {', '.join(meta['feature_names'])}")
    print(f"  Clean Class Balance: Cardio 0={meta['target_balance_clean'][0]*100:.2f}%, Cardio 1={meta['target_balance_clean'][1]*100:.2f}%")

    # 2. Train / Test Split
    print("\n[Phase 2] Executing 80/20 Stratified Train/Test Split (random_state=42)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"  Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    # 3. Tabular 10-D Feature Projection for Quantum Handoff
    print("\n[Phase 3] Fitting 10-D Feature Scaling & PCA Mapping on Training Set Only...")
    scaler = StandardScaler()
    pca = PCA(n_components=10, random_state=42)

    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    X_train_10d = pca.fit_transform(X_train_scaled)
    X_test_10d = pca.transform(X_test_scaled)

    # Save preprocessing transforms
    prep_path = models_quantum_cvd / "preprocessing.pkl"
    joblib.dump({"scaler": scaler, "pca": pca, "feature_names": meta["feature_names"]}, prep_path)
    print(f"  [+] Saved preprocessing & 10D projection pipeline to: {prep_path}")

    # 4. Classical Model Training
    print("\n[Phase 4] Training Classical Tabular Models on CVD Data...")

    # A. SVM (RBF Kernel)
    print("  -> Training SVM (RBF Kernel with Calibrated Probabilities)...", flush=True)
    t0 = time.time()
    from sklearn.calibration import CalibratedClassifierCV
    svm_base = SVC(kernel="rbf", C=1.0, random_state=42)
    svm_model = Pipeline([
        ("scaler", StandardScaler()),
        ("svm", CalibratedClassifierCV(svm_base, cv=3))
    ])
    svm_train_subset_n = min(5000, len(X_train))
    svm_model.fit(X_train.iloc[:svm_train_subset_n], y_train.iloc[:svm_train_subset_n])
    t_svm = time.time() - t0
    svm_path = models_classical_svm / "svm_cvd.pkl"
    joblib.dump(svm_model, svm_path)
    print(f"     [+] SVM trained in {t_svm:.2f}s and saved to {svm_path}", flush=True)

    # B. Random Forest Classifier
    print("  -> Training Random Forest Classifier (100 trees)...")
    t0 = time.time()
    rf_model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    rf_model.fit(X_train, y_train)
    t_rf = time.time() - t0
    rf_path = models_classical_rf / "random_forest_cvd.pkl"
    joblib.dump(rf_model, rf_path)
    print(f"     [+] Random Forest trained in {t_rf:.2f}s and saved to {rf_path}")

    # C. HistGradientBoosting Classifier
    print("  -> Training HistGradientBoosting Classifier...")
    t0 = time.time()
    hgb_model = HistGradientBoostingClassifier(max_iter=100, random_state=42)
    hgb_model.fit(X_train, y_train)
    t_hgb = time.time() - t0
    hgb_path = output_dir_models / "classical" / "hist_gb_cvd.pkl"
    joblib.dump(hgb_model, hgb_path)
    print(f"     [+] HistGradientBoosting trained in {t_hgb:.2f}s and saved to {hgb_path}")

    # D. Logistic Regression
    print("  -> Training Logistic Regression Baseline...")
    t0 = time.time()
    lr_model = Pipeline([
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(random_state=42, max_iter=1000))
    ])
    lr_model.fit(X_train, y_train)
    t_lr = time.time() - t0
    lr_path = output_dir_models / "classical" / "logistic_cvd.pkl"
    joblib.dump(lr_model, lr_path)
    print(f"     [+] Logistic Regression trained in {t_lr:.2f}s and saved to {lr_path}")

    # 5. Baseline Quantum Model Evaluation (Existing Frozen VQC)
    print("\n[Phase 5] Evaluating Existing Frozen VQC Baseline (quantum_core/vqc_model_weights.pth)...")
    baseline_vqc_path = PROJECT_ROOT / "quantum_core" / "vqc_model_weights.pth"
    vqc_baseline = DressedCVDVQC(n_layers=3 if "layers_3" in str(baseline_vqc_path) else 2).double()
    if baseline_vqc_path.exists():
        try:
            state_dict = torch.load(baseline_vqc_path, weights_only=True)
            vqc_baseline.load_state_dict(state_dict, strict=False)
            print("  [+] Loaded baseline VQC weights.")
        except Exception as err:
            print(f"  [!] Notice loading baseline weights: {err}")
    vqc_baseline.eval()

    X_test_10d_t = torch.tensor(X_test_10d, dtype=torch.float64)

    with torch.no_grad():
        baseline_outputs = vqc_baseline(X_test_10d_t)
        baseline_probs = baseline_outputs[:, 1].numpy()
        baseline_preds = (baseline_probs >= 0.5).astype(int)

    metrics_baseline_vqc = evaluate_model_performance(y_test.values, baseline_preds, baseline_probs)

    # 6. Train New CVD 10-Qubit VQC Model
    print("\n[Phase 6] Training New CVD 10-Qubit VQC Model on 10-D Features...")
    epochs = 15
    batch_size = 128
    learning_rate = 0.01

    X_train_10d_t = torch.tensor(X_train_10d, dtype=torch.float64)
    y_train_t = torch.tensor(y_train.values, dtype=torch.long)

    # Class Weights for balanced loss
    n_0 = (y_train == 0).sum()
    n_1 = (y_train == 1).sum()
    weights_cls = torch.tensor([len(y_train) / (2.0 * n_0), len(y_train) / (2.0 * n_1)], dtype=torch.float64)

    new_vqc = DressedCVDVQC(n_layers=2).double()
    criterion = nn.CrossEntropyLoss(weight=weights_cls)
    optimizer = torch.optim.Adam(new_vqc.parameters(), lr=learning_rate)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    # Training on pilot subset of 1,000 samples per epoch to balance PennyLane simulator time on CPU
    q_train_n = min(1000, len(X_train_10d))
    print(f"  - Training on {q_train_n} samples per epoch across {epochs} epochs...")

    new_vqc.train()
    t_q0 = time.time()

    for epoch in range(epochs):
        perm = torch.randperm(q_train_n)
        epoch_loss = 0.0
        n_b = 0

        for i in range(0, q_train_n, batch_size):
            idxs = perm[i:i+batch_size]
            bx = X_train_10d_t[idxs]
            by = y_train_t[idxs]

            optimizer.zero_grad()
            out = new_vqc(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()
            n_b += 1

        scheduler.step()
        avg_loss = epoch_loss / max(1, n_b)
        if (epoch + 1) % 3 == 0 or epoch == 0 or epoch == epochs - 1:
            print(f"    Epoch {epoch+1:2d}/{epochs} | Loss: {avg_loss:.4f} | LR: {scheduler.get_last_lr()[0]:.6f}")

    t_q_total = time.time() - t_q0
    print(f"  [+] CVD Quantum Model training completed in {t_q_total:.2f}s.")

    # Save New CVD VQC Weights
    new_vqc_path = models_quantum_cvd / "vqc_cvd.pth"
    torch.save(new_vqc.state_dict(), new_vqc_path)
    print(f"  [+] Saved new CVD VQC weights to: {new_vqc_path}")

    # Evaluate New CVD VQC on full held-out test set
    new_vqc.eval()
    with torch.no_grad():
        new_vqc_outputs = new_vqc(X_test_10d_t)
        new_vqc_probs = new_vqc_outputs[:, 1].numpy()
        new_vqc_preds = (new_vqc_probs >= 0.5).astype(int)

    metrics_new_vqc = evaluate_model_performance(y_test.values, new_vqc_preds, new_vqc_probs)

    # 7. Evaluate All Classical Models on Held-out Test Set
    print("\n[Phase 7] Evaluating All Trained Models on Held-Out CVD Test Set (N=13,728)...")
    svm_probs = svm_model.predict_proba(X_test)[:, 1]
    svm_preds = (svm_probs >= 0.5).astype(int)
    metrics_svm = evaluate_model_performance(y_test.values, svm_preds, svm_probs)

    rf_probs = rf_model.predict_proba(X_test)[:, 1]
    rf_preds = (rf_probs >= 0.5).astype(int)
    metrics_rf = evaluate_model_performance(y_test.values, rf_preds, rf_probs)

    hgb_probs = hgb_model.predict_proba(X_test)[:, 1]
    hgb_preds = (hgb_probs >= 0.5).astype(int)
    metrics_hgb = evaluate_model_performance(y_test.values, hgb_preds, hgb_probs)

    lr_probs = lr_model.predict_proba(X_test)[:, 1]
    lr_preds = (lr_probs >= 0.5).astype(int)
    metrics_lr = evaluate_model_performance(y_test.values, lr_preds, lr_probs)

    all_results = {
        "Logistic Regression": metrics_lr,
        "SVM (RBF Kernel)": metrics_svm,
        "Random Forest": metrics_rf,
        "HistGradientBoosting": metrics_hgb,
        "Existing VQC Baseline": metrics_baseline_vqc,
        "New CVD-Trained VQC": metrics_new_vqc,
    }

    # Save metrics JSON
    metrics_out_path = models_quantum_cvd / "metrics.json"
    with open(metrics_out_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)
    print(f"  [+] Saved evaluation metrics to: {metrics_out_path}")

    # Print Summary Table
    print("\n" + "=" * 95)
    print(f"{'Model':<25} | {'Accuracy':<9} | {'Precision':<9} | {'Recall':<9} | {'Spec':<8} | {'F1':<8} | {'ROC-AUC':<8}")
    print("=" * 95)
    for model_name, m in all_results.items():
        print(
            f"{model_name:<25} | {m['accuracy']*100:8.2f}% | {m['precision']*100:8.2f}% | "
            f"{m['recall_sensitivity']*100:8.2f}% | {m['specificity']*100:7.2f}% | "
            f"{m['f1_score']*100:7.2f}% | {m['roc_auc']:8.4f}"
        )
    print("=" * 95)

    # 8. QuXAI Quantum Explainability Validation
    print("\n[Phase 8] Computing QuXAI Jacobian Sensitivity Maps for CVD Quantum Model...")
    sample_pt = X_test_10d_t[0].unsqueeze(0).requires_grad_(True)
    out_pt = new_vqc(sample_pt)
    out_pt[0, 1].backward()
    grads = sample_pt.grad.squeeze(0).abs().detach().numpy()
    norm_grads = grads / (np.sum(grads) + 1e-10)

    print("  Top 5 Quantum 10-D Latent Feature Attributions (Patient 1):")
    sorted_idxs = np.argsort(norm_grads)[::-1]
    for r, idx in enumerate(sorted_idxs[:5]):
        print(f"    Rank {r+1}: Latent Feature z_{idx:02d} -> Impact: {norm_grads[idx]*100:.2f}%")

    print("\n" + "=" * 80)
    print("[SUCCESS] FULL REAL CVD TRAINING & BENCHMARKING COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    run_cvd_pipeline()
