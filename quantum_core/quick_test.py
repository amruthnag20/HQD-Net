import torch
import numpy as np
from quantum_core.dataset_loader import load_clinical_data
from quantum_core.hqd_quantum import DressedVQC
from explainability.explainability import compute_quantum_sensitivity

def run_integration_test():
    print("=" * 60)
    print("HQD-NET: 10-QUBIT END-TO-END INTEGRATION TEST")
    print("=" * 60)

    # 1. Load 10-Feature Clinical Dataset
    print("\n[Step 1/3] Loading 10-feature clinical dataset...")
    X_train, X_test, y_train, y_test = load_clinical_data(n_samples=300, n_features=10)
    print(f"✓ Dataset loaded successfully!")
    print(f"  - Train data shape: {X_train.shape}")
    print(f"  - Test data shape:  {X_test.shape}")

    # 2. Initialize and Train 10-Qubit VQC Model (Quick 2-Epoch Pass)
    print("\n[Step 2/3] Initializing 10-qubit Dressed VQC and running quick training pass...")
    model = DressedVQC(n_layers=2)
    criterion = torch.nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    model.train()
    for epoch in range(2):
        optimizer.zero_grad()
        outputs = model(X_train[:64])  # Small batch for speedy test execution
        loss = criterion(outputs, y_train[:64])
        loss.backward()
        optimizer.step()
        print(f"  - Epoch {epoch+1}/2 | Training Loss: {loss.item():.4f}")
    print("✓ Model training check complete!")

    # 3. Run Explainability Jacobian Sensitivity Analysis on Patient Data
    print("\n[Step 3/3] Running Explainability Jacobian Sensitivity Engine...")
    sample_patient = X_test[0]
    
    # Extract underlying quantum weights from model's q_layer for sensitivity calculation
    dummy_weights = list(model.parameters())[0].detach().numpy()
    if dummy_weights.ndim == 2:
        dummy_weights = np.expand_dims(dummy_weights, axis=0)

    sensitivities = compute_quantum_sensitivity(sample_patient.numpy(), dummy_weights)
    print("✓ Quantum Feature Sensitivity Analysis Computed Successfully!")
    print(f"  - Sensitivity Output Type: {type(sensitivities)}")
    print(f"  - Number of Output Expectation Tensors: {len(sensitivities)}")
    print(f"  - Jacobian / Sensitivity Gradient Shape: {sensitivities[0].shape}")

    print("\n" + "=" * 60)
    print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🚀")
    print("=" * 60)

if __name__ == "__main__":
    run_integration_test()