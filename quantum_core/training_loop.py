import torch
import torch.nn as nn
from hqd_quantum import DressedVQC
from dataset_loader import load_clinical_data

# 1. Load real split data
X_train, X_test, y_train, y_test = load_clinical_data(n_samples=400, n_features=4)

# 2. Initialize Model, Loss, and Optimizer
model = DressedVQC(n_layers=2)
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

# 3. Training Loop across multiple epochs
epochs = 10
model.train()
print("--- VQC Training with Real Clinical Data ---")
for epoch in range(epochs):
    optimizer.zero_grad()
    outputs = model(X_train)
    loss = criterion(outputs, y_train)
    loss.backward()
    optimizer.step()
    print(f"Epoch {epoch+1}/{epochs} | Training Loss: {loss.item():.4f}")

# 4. Evaluation Pass
model.eval()
with torch.no_grad():
    test_outputs = model(X_test)
    _, predicted = torch.max(test_outputs, 1)
    accuracy = (predicted == y_test).float().mean()
    print(f"\nVQC Test Accuracy: {accuracy.item() * 100:.2f}%")