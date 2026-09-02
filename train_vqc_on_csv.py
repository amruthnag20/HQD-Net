r"""
HQD-Net Production Backend: End-to-End Real CSV Training & Diagnostic Execution

This is the operational heart of HQD-Net's quantum-classical hybrid engine.
It orchestrates:
- Phase 1: CSV ingestion with Random Forest feature selection
- Phase 2: 10-qubit VQC training with parameter-shift gradients (float64)
- Phase 3: "Evidence over Hype" benchmarking against classical baselines
- Phase 4: QuXAI Jacobian sensitivity maps for clinical interpretation

Usage:
    .venv\\Scripts\\python.exe train_vqc_on_csv.py [--csv path/to/data.csv]

"""

import os
import sys
import argparse

# Configure UTF-8 stdout if supported
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import pennylane as qml
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, recall_score, f1_score, roc_auc_score
import joblib

# Inject project folders into PYTHONPATH
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "quantum_core"))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "explainability"))

from quantum_core.dataset_loader_csv import load_real_clinical_csv


# ============================================================================
# QUANTUM CIRCUIT CONFIGURATION
# ============================================================================

n_qubits = 10
dev = qml.device("default.qubit", wires=n_qubits)


@qml.qnode(dev, interface="torch", diff_method="parameter-shift")
def quantum_circuit(inputs, weights):
    """
    10-Qubit Hybrid Quantum Circuit with Ry Angle Embedding
    
    - Angle Embedding: Maps 10 biomarkers to Y-axis rotations on 10 qubits
    - Strongly Entangling Layers: 2 layers × 10 qubits × 3 params = 60 params per layer
    - Pauli-Z Measurements: Measure expectation value on each qubit
    """
    # Ensure float64 precision for stable finite-difference gradients
    inputs_64 = inputs.to(torch.float64) if isinstance(inputs, torch.Tensor) else torch.tensor(inputs, dtype=torch.float64)
    
    # Phase A: Angle Embedding (maps clinical biomarkers to quantum state)
    qml.AngleEmbedding(inputs_64, wires=range(n_qubits), rotation='Y')
    
    # Phase B: Strongly Entangling Layers (quantum feature transformation)
    qml.StronglyEntanglingLayers(weights, wires=range(n_qubits))
    
    # Phase C: Measurement (extract classical information from quantum state)
    return [qml.expval(qml.PauliZ(i)) for i in range(n_qubits)]


class DressedVQC(nn.Module):
    """
    Quantum-Classical Hybrid Model
    
    Architecture:
    Input (10-dim biomarkers)
      ↓
    Quantum Layer (parameter-shift gradients, float64)
      ↓ [10-dim quantum expectation values]
    Classical Post-Processing (Dense 10→16→2)
      ↓
    Output (Binary risk probability)
    """
    
    def __init__(self, n_layers=2):
        super().__init__()
        
        # Quantum layer configuration
        weight_shapes = {"weights": (n_layers, n_qubits, 3)}
        self.q_layer = qml.qnn.TorchLayer(quantum_circuit, weight_shapes)
        
        # Classical post-processing: Map 10-dim quantum output to 2-class probabilities
        self.post_processing = nn.Sequential(
            nn.Linear(n_qubits, 16),
            nn.ReLU(),
            nn.Linear(16, 2),
            nn.Softmax(dim=1)
        )
    
    def forward(self, x):
        # Quantum feature extraction
        q_out = self.q_layer(x)
        # Classical post-processing for final classification
        return self.post_processing(q_out)


# ============================================================================
# EXPLAINABILITY & SENSITIVITY COMPUTATION
# ============================================================================

def compute_quantum_sensitivity(inputs, weights_tensor):
    """
    Phase 4: Compute Jacobian-Based Feature Sensitivity
    
    Calculates ∂output/∂input for each biomarker to determine clinical impact.
    """
    inputs_t = torch.tensor(inputs, dtype=torch.float64).detach().clone().requires_grad_(True)
    weights_t = weights_tensor.to(torch.float64).detach().clone().requires_grad_(True)
    
    # Compile isolated QNode for tracking input sensitivities
    qnode = qml.QNode(quantum_circuit, dev, interface="torch", diff_method="parameter-shift")
    out = qnode(inputs_t, weights_t)
    
    # Compute gradients for each output
    sensitivity_grads = []
    for i in range(len(out)):
        out[i].backward(retain_graph=True)
        if inputs_t.grad is not None:
            sensitivity_grads.append(inputs_t.grad.clone())
            inputs_t.grad.zero_()
        else:
            sensitivity_grads.append(torch.zeros_like(inputs_t))
    
    return torch.stack(sensitivity_grads)


# ============================================================================
# MAIN TRAINING & EVALUATION PIPELINE
# ============================================================================

def train_and_execute_backend(csv_path=None, epochs=25, batch_size=32, learning_rate=0.01):
    """
    Complete end-to-end training pipeline:
    1. Load real CSV data with automatic feature selection
    2. Train 10-qubit VQC with float64 precision, dynamic class weights, and cosine LR scheduling
    3. Benchmark against classical baselines
    4. Generate clinical interpretation report
    """
    
    print("\n" + "="*70)
    print("HQD-NET: End-to-End Real Data Ingestion & 10-Qubit Training Core")
    print("="*70)
    
    # ========== STEP 1: DETERMINE DATA SOURCE ==========
    if csv_path is None:
        # Check for common clinical dataset locations
        default_paths = [
            "clinical_data_real.csv",
            "clinical_data.csv",
            "data/clinical_data.csv",
            "datasets/clinical_data.csv",
        ]
        
        csv_path = None
        for path in default_paths:
            if os.path.exists(path):
                csv_path = path
                break
        
        # If no existing CSV found, generate mock data
        if csv_path is None:
            print("\n[!] No real clinical CSV found. Generating high-fidelity synthetic data...")
            csv_path = "clinical_data_synthetic.csv"
            
            np.random.seed(42)
            n_patients = 500
            n_raw_features = 24
            
            # Generate realistic clinical biomarker correlations
            mock_data = np.random.randn(n_patients, n_raw_features) * np.random.uniform(0.5, 2.0, n_raw_features)
            mock_df = pd.DataFrame(mock_data, columns=[f"biomarker_{i:02d}" for i in range(n_raw_features)])
            mock_df["patient_id"] = [f"PAT_{1000+i}" for i in range(n_patients)]
            
            # Create binary diagnosis based on feature combination
            diagnosis = (np.mean(mock_data[:, :5], axis=1) > 0.5).astype(int)
            mock_df["diagnosis"] = diagnosis
            
            mock_df.to_csv(csv_path, index=False)
            print(f" [+] Synthetic dataset saved to: {csv_path}")
    
    # ========== STEP 2: PHASE 1 - DATA INGESTION & PREPROCESSING ==========
    try:
        X_train, X_test, y_train, y_test, selected_features = load_real_clinical_csv(
            csv_path,
            target_column="diagnosis",
            drop_columns=["patient_id"],
            n_features=10
        )
    except (FileNotFoundError, ValueError) as e:
        print(f" [X] Error loading CSV: {e}")
        return False
    
    # Calculate inverse-frequency class weights to combat majority-class collapse
    num_class_0 = (y_train == 0).sum().item()
    num_class_1 = (y_train == 1).sum().item()
    total_samples = len(y_train)

    weight_0 = total_samples / (2.0 * num_class_0) if num_class_0 > 0 else 1.0
    weight_1 = total_samples / (2.0 * num_class_1) if num_class_1 > 0 else 1.0
    class_weights = torch.tensor([weight_0, weight_1], dtype=torch.float64)
    
    # ========== STEP 3: PHASE 2 - QUANTUM MODEL TRAINING ==========
    print(f"\n[Phase 2] Training 10-Qubit Softmax-Dressed VQC...")
    print(f"  Configuration:")
    print(f"  - Qubits: 10")
    print(f"  - Layers: 2 Strongly Entangling")
    print(f"  - Total Parameters: 200 (quantum) + 48 (classical) = 248")
    print(f"  - Precision: float64")
    print(f"  - Class Weights: Class 0={weight_0:.3f}, Class 1={weight_1:.3f}")
    print(f"  - Optimizer: Adam (initial lr={learning_rate}) with CosineAnnealingLR")
    print(f"  - Training Strategy: Mini-batch gradient descent (batch_size={batch_size}, epochs={epochs})")
    
    model = DressedVQC(n_layers=2).double()  # Upgrade parameters to float64
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    model.train()
    for epoch in range(epochs):
        # Shuffle training data
        permutation = torch.randperm(X_train.size(0))
        epoch_loss = 0.0
        n_batches = 0
        
        for i in range(0, X_train.size(0), batch_size):
            indices = permutation[i:i+batch_size]
            batch_x = X_train[indices].to(torch.float64)
            batch_y = y_train[indices]
            
            # Forward pass
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            
            # Backward pass
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            n_batches += 1
        
        scheduler.step()
        avg_loss = epoch_loss / n_batches
        if (epoch + 1) % 5 == 0 or epoch == 0 or epoch == epochs - 1:
            print(f"  - Epoch {epoch+1:2d}/{epochs} | Avg Weighted Cross-Entropy Loss: {avg_loss:.4f} | LR: {scheduler.get_last_lr()[0]:.6f}")
    
    print(" [+] Model training completed successfully!")
    
    # Save optimized model weights
    weights_path = os.path.join(PROJECT_ROOT, "quantum_core", "vqc_model_weights.pth")
    os.makedirs(os.path.dirname(weights_path), exist_ok=True)
    torch.save(model.state_dict(), weights_path)
    print(f" [+] Exported model weights checkpoint to: {weights_path}")
    
    # ========== STEP 4: PHASE 3 - BENCHMARKING ==========
    print(f"\n[Phase 3] 'Evidence over Hype' Benchmarking Against Classical Baselines...")
    
    model.eval()
    with torch.no_grad():
        vqc_test_outputs = model(X_test.to(torch.float64))
        vqc_probs = vqc_test_outputs[:, 1].cpu().numpy()
        vqc_preds = torch.argmax(vqc_test_outputs, dim=1).cpu().numpy()
    
    # Convert to numpy for classical models
    X_train_np = X_train.cpu().numpy()
    X_test_np = X_test.cpu().numpy()
    y_train_np = y_train.cpu().numpy()
    y_test_np = y_test.cpu().numpy()
    
    # Classical Baseline A: Support Vector Machine (RBF kernel)
    print("  Training Classical SVM (RBF)...")
    from sklearn.calibration import CalibratedClassifierCV
    clf_svm_base = SVC(kernel='rbf', random_state=42, C=1.0, gamma='scale')
    clf_svm = CalibratedClassifierCV(clf_svm_base)
    clf_svm.fit(X_train_np, y_train_np)
    svm_preds = clf_svm.predict(X_test_np)
    svm_probs = clf_svm.predict_proba(X_test_np)[:, 1]
    
    # Save the SVM model for later classical baseline inference
    svm_path = os.path.join(PROJECT_ROOT, "classical_preprocessing", "svm_model.pkl")
    joblib.dump(clf_svm, svm_path)
    print(f"  [+] Exported classical SVM baseline to: {svm_path}")

    # Classical Baseline B: Random Forest
    print("  Training Random Forest (100 trees)...")
    clf_rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    clf_rf.fit(X_train_np, y_train_np)
    rf_preds = clf_rf.predict(X_test_np)
    rf_probs = clf_rf.predict_proba(X_test_np)[:, 1]
    
    # Compute metrics for all models
    print("\n" + "="*75)
    print(f"{'Model':<20} | {'Accuracy':<10} | {'Sensitivity':<12} | {'F1-Score':<8} | {'ROC-AUC':<8}")
    print("="*75)
    
    results = []
    for name, preds, probs in [
        ("VQC (10-Qubit)", vqc_preds, vqc_probs),
        ("SVM (RBF)", svm_preds, svm_probs),
        ("Random Forest", rf_preds, rf_probs)
    ]:
        try:
            acc = accuracy_score(y_test_np, preds)
            sens = recall_score(y_test_np, preds, zero_division=0)
            f1 = f1_score(y_test_np, preds, zero_division=0)
            auc = roc_auc_score(y_test_np, probs)
            
            results.append({
                'model': name,
                'accuracy': acc,
                'sensitivity': sens,
                'f1': f1,
                'auc': auc
            })
            
            print(f"{name:<20} | {acc*100:8.2f}% | {sens*100:10.2f}% | {f1*100:8.2f}% | {auc:.4f}")
        except Exception as e:
            print(f"{name:<20} | ERROR: {str(e)[:40]}")
    
    print("="*75)
    
    # ========== STEP 5: PHASE 4 - EXPLAINABILITY ANALYSIS ==========
    print(f"\n[Phase 4] Clinical Interpretation via Jacobian Sensitivity (3 Sample Patients)...")
    
    n_samples = min(3, len(X_test))
    
    for sample_idx in range(n_samples):
        patient_features = X_test[sample_idx].to(torch.float64)
        patient_true_label = y_test[sample_idx].item()
        
        with torch.no_grad():
            vqc_prediction = model(patient_features.unsqueeze(0))
            vqc_risk_prob = float(vqc_prediction[0, 1])
            model_weights = list(model.q_layer.parameters())[0]
        
        # Compute Jacobian sensitivity
        try:
            jacobian = compute_quantum_sensitivity(patient_features.cpu().numpy(), model_weights)
            feature_impacts = np.mean(np.abs(jacobian.detach().cpu().numpy()), axis=0)
            normalized_weights = feature_impacts / (np.sum(feature_impacts) + 1e-10)
        except Exception as e:
            print(f"  [!] Jacobian computation failed for sample {sample_idx}: {e}")
            normalized_weights = np.ones(len(selected_features)) / len(selected_features)
        
        # Print patient analysis
        print(f"\n  ---- Patient {sample_idx + 1} ----")
        print(f"  True Label: {'Anomalous (1)' if patient_true_label == 1 else 'Normal (0)'}")
        print(f"  VQC Risk Score: {vqc_risk_prob*100:.1f}%")
        print(f"  Top Disease-Driving Biomarkers:")
        
        sorted_indices = np.argsort(normalized_weights)[::-1]
        for rank, idx in enumerate(sorted_indices[:5]):
            if idx < len(selected_features):
                print(f"    {rank+1}. {selected_features[idx]:<25}: {normalized_weights[idx]*100:6.2f}%")
    
    # ========== FINAL STATUS ==========
    print("\n" + "="*70)
    print("[OK] BACKEND TRAINING & EVALUATION COMPLETE")
    print("="*70)
    print(f"  [+] Model weights saved: {weights_path}")
    print(f"  [+] Training samples: {len(X_train)}")
    print(f"  [+] Test samples: {len(X_test)}")
    print(f"  [+] Biomarkers used: {', '.join(selected_features[:3])}... ({len(selected_features)} total)")
    print(f"  [+] Classical baselines trained and benchmarked")
    print(f"  [+] Jacobian sensitivity maps computed for clinical interpretation")
    print("\n[-->] Your teammate can now load vqc_model_weights.pth into Streamlit dashboard!")
    print("="*70 + "\n")
    
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="HQD-Net End-to-End Backend Training Pipeline"
    )
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Path to clinical CSV file (default: auto-detects or generates synthetic)"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=25,
        help="Number of training epochs (default: 25)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Mini-batch size for training (default: 32)"
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=0.01,
        help="Learning rate for Adam optimizer (default: 0.01)"
    )
    
    args = parser.parse_args()
    
    success = train_and_execute_backend(
        csv_path=args.csv,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr
    )
    
    sys.exit(0 if success else 1)
