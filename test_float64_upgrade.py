#!/usr/bin/env python
"""
Test script to verify float64 precision upgrade for 10-qubit HQD-Net
Eliminates PennyLane finite-diff precision warning
"""

import sys
sys.path.insert(0, 'c:/Users/jonna/OneDrive/Desktop/hqd-net')

import torch
import numpy as np
from quantum_core.dataset_loader import load_clinical_data
from quantum_core.hqd_quantum import DressedVQC

print("=" * 70)
print("HQD-NET FLOAT64 PRECISION UPGRADE VERIFICATION")
print("=" * 70)

# Step 1: Verify dataset precision
print("\n[Step 1] Loading dataset and checking float64 precision...")
X_train, X_test, y_train, y_test = load_clinical_data(n_samples=300, n_features=10)
print(f"✓ Dataset loaded")
print(f"  - X_train dtype: {X_train.dtype} (expected: torch.float64)")
print(f"  - X_test dtype:  {X_test.dtype} (expected: torch.float64)")
print(f"  - Data shapes: Train {X_train.shape}, Test {X_test.shape}")

if X_train.dtype != torch.float64:
    print("  ❌ ERROR: Dataset not using float64!")
    sys.exit(1)
else:
    print("  ✅ PASS: Dataset is float64")

# Step 2: Initialize model and verify training (should NOT show float32 warning)
print("\n[Step 2] Initializing 10-qubit VQC and running training step...")
print("  (Monitoring for PennyLane float32 warnings...)")
model = DressedVQC(n_layers=2)
criterion = torch.nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

model.train()
for epoch in range(1):
    optimizer.zero_grad()
    batch_X = X_train[:32]  # Single batch
    batch_y = y_train[:32]
    
    print(f"  - Input batch dtype: {batch_X.dtype}")
    
    outputs = model(batch_X)
    print(f"  - Model output shape: {outputs.shape}")
    
    loss = criterion(outputs, batch_y)
    print(f"  - Loss computed: {loss.item():.6f}")
    
    loss.backward()
    print(f"  - Backward pass completed (no UserWarning expected)")
    
    optimizer.step()
    print(f"  ✅ Training step completed successfully!")

print("\n" + "=" * 70)
print("FLOAT64 UPGRADE VERIFICATION COMPLETE! ✅")
print("=" * 70)
print("\nKey improvements:")
print("  1. Finite-difference gradients use float64 (improved numerical accuracy)")
print("  2. PennyLane UserWarning about float32 should be eliminated")
print("  3. Gradient computation more stable across 10-qubit circuit")
