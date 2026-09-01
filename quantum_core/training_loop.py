import torch
import torch.nn as nn
from hqd_quantum import DressedVQC
from dataset_loader import load_clinical_data

def train_vqc():
    print("="*70)
    print("Initializing 10-Qubit HQD-Net VQC Training")
    print("="*70)
    
    # 1. Load real split data with 10 clinical biomarkers
    print("\n[Step 1] Loading 10-feature clinical dataset...")
    X_train, X_test, y_train, y_test = load_clinical_data(n_samples=600, n_features=10)
    print(f"✓ Dataset loaded: Train {X_train.shape}, Test {X_test.shape}")

    # 2. Initialize Model, Loss, and Optimizer
    print("\n[Step 2] Initializing 10-qubit Dressed VQC model...")
    model = DressedVQC(n_layers=2)  # Reduced from 3 to 2 for faster training
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    print(f"✓ Model initialized with {sum(p.numel() for p in model.parameters())} trainable parameters")
    print(f"✓ Using {sum(p.numel() for p in model.parameters())} quantum parameters (2 layers × 10 qubits × 3)")

    # 3. Training Loop with mini-batch gradient descent
    print("\n[Step 3] Training 10-qubit VQC with mini-batches...")
    print("-" * 70)
    epochs = 10  # Reduced from 15 for practical execution
    batch_size = 32  # Mini-batch training for better performance
    model.train()
    
    n_samples = X_train.shape[0]
    for epoch in range(epochs):
        epoch_loss = 0.0
        n_batches = 0
        
        # Mini-batch training
        for i in range(0, n_samples, batch_size):
            batch_X = X_train[i:i+batch_size]
            batch_y = y_train[i:i+batch_size]
            
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            n_batches += 1
        
        avg_loss = epoch_loss / n_batches
        
        # Print progress every 2 epochs
        if (epoch + 1) % 2 == 0 or epoch == 0:
            print(f"Epoch {epoch+1:2d}/{epochs} | Avg Batch Loss: {avg_loss:.4f}")

    # 4. Evaluation Pass
    print("-" * 70)
    print("\n[Step 4] Evaluating on test set...")
    model.eval()
    with torch.no_grad():
        # Evaluate in batches to avoid memory issues
        all_preds = []
        all_labels = []
        total_loss = 0.0
        n_test_batches = 0
        
        for i in range(0, len(X_test), batch_size):
            batch_X = X_test[i:i+batch_size]
            batch_y = y_test[i:i+batch_size]
            
            test_outputs = model(batch_X)
            test_loss = criterion(test_outputs, batch_y)
            total_loss += test_loss.item()
            n_test_batches += 1
            
            _, predicted = torch.max(test_outputs, 1)
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(batch_y.cpu().numpy())
        
        accuracy = sum(p == l for p, l in zip(all_preds, all_labels)) / len(all_labels)
        avg_test_loss = total_loss / n_test_batches
        
        print(f"✓ Test Loss: {avg_test_loss:.4f}")
        print(f"✓ 10-Qubit VQC Test Accuracy: {accuracy * 100:.2f}%")
    
    print("\n" + "="*70)
    print("Training Complete!")
    print("="*70)

if __name__ == "__main__":
    train_vqc()