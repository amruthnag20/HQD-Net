import torch
from quantum_core.dataset_loader import load_clinical_data

print("Testing 10-qubit dataset loader...")
X_train, X_test, y_train, y_test = load_clinical_data(n_samples=300, n_features=10)
print(f"✓ Training set shape: {X_train.shape}")
print(f"✓ Test set shape: {X_test.shape}")
print(f"✓ Labels (unique): {set(y_train.tolist())}")
print("Dataset loader verified successfully!")
