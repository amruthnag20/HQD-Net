import sys
import os

# Add the parent directory and quantum_core to Python's path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../quantum_core')))

from hqd_quantum import quantum_circuit, n_qubits
from dataset_loader import load_clinical_data
import pennylane as qml
import torch
import numpy as np

dev = qml.device("default.qubit", wires=n_qubits)

def compute_quantum_sensitivity(inputs, weights):
    """Calculates the Jacobian of the quantum expectation values with respect to input clinical features."""
    # Convert to numpy first if needed, then to tensor
    inputs_np = np.array(inputs, dtype=np.float32)
    weights_np = weights.cpu().numpy() if isinstance(weights, torch.Tensor) else np.array(weights, dtype=np.float32)
    
    # Create tensors with proper gradient tracking
    inputs_t = torch.tensor(inputs_np, dtype=torch.float32, requires_grad=True)
    weights_t = torch.tensor(weights_np, dtype=torch.float32, requires_grad=True)
    
    # Define qnode for gradient tracking with torch interface
    qnode = qml.QNode(quantum_circuit, dev, interface="torch", diff_method="parameter-shift")
    
    # Compute output expectation values
    out = qnode(inputs_t, weights_t)
    
    # Handle both single output and list of outputs - convert to tensor
    if isinstance(out, list):
        out_tensor = torch.stack(out) if len(out) > 0 else torch.tensor(out)
    else:
        out_tensor = out
    
    # Compute Jacobian with respect to inputs (Sensitivity Map)
    sensitivity_jacobian = torch.autograd.functional.jacobian(
        lambda x: torch.stack(qnode(x, weights_t)) if isinstance(qnode(x, weights_t), list) else qnode(x, weights_t),
        inputs_t
    )
        
    return sensitivity_jacobian

if __name__ == "__main__":
    # Load real patient data from clinical dataset
    X_train, X_test, y_train, y_test = load_clinical_data(n_samples=400, n_features=4)
    
    # Initialize trainable quantum circuit weights
    dummy_weights = torch.zeros((2, n_qubits, 3), dtype=torch.float32, requires_grad=True)
    
    print("\n" + "="*70)
    print("QUANTUM EXPLAINABILITY ENGINE: Input Feature Sensitivity Analysis")
    print("="*70)
    
    # Analyze sensitivities for first 3 patients in test set
    for patient_idx in range(min(3, len(X_test))):
        patient_record = X_test[patient_idx]
        true_label = y_test[patient_idx].item()
        
        print(f"\n--- Patient {patient_idx + 1} ---")
        print(f"Clinical Features: {patient_record.numpy()}")
        print(f"True Risk Label: {['Low Risk', 'High Risk'][true_label]}")
        
        # Compute quantum feature sensitivities (Jacobian)
        sensitivities = compute_quantum_sensitivity(patient_record.numpy(), dummy_weights)
        
        # Identify which features have highest sensitivity (most influential)
        feature_importance = torch.abs(sensitivities).mean(dim=0)
        top_features = torch.argsort(feature_importance, descending=True)
        
        print("\nFeature Importance Ranking (Jacobian-based sensitivity):")
        biomarker_names = ["Biomarker A", "Biomarker B", "Biomarker C", "Biomarker D"]
        for rank, feature_idx in enumerate(top_features[:4]):
            sensitivity_score = feature_importance[feature_idx].item()
            print(f"  {rank+1}. {biomarker_names[feature_idx]}: {sensitivity_score:.4f}")
        
        print(f"\nJacobian Matrix Shape: {sensitivities.shape}")
    
    print("\n" + "="*70)
    print("Explainability Analysis Complete!")
    print("="*70)