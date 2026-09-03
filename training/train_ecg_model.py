import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import pandas as pd
import pickle

class ECGDataset(Dataset):
    """
    Dataset wrapper for PyTorch 12-lead ECG signal dataset (ecg_dataset.pt).
    """
    def __init__(self, data_list, indices):
        self.data = [data_list[i] for i in indices]

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        ecg_signal = item['ecg'] # [12, 5000]
        # Replace any residual NaNs with zero
        ecg_signal = torch.nan_to_num(ecg_signal, nan=0.0)
        # Robust z-score per lead
        mean = ecg_signal.mean(dim=1, keepdim=True)
        std = ecg_signal.std(dim=1, keepdim=True)
        std = torch.where(std < 1e-4, torch.ones_like(std), std)
        norm_ecg = (ecg_signal - mean) / std
        norm_ecg = torch.clamp(norm_ecg, min=-10.0, max=10.0)

        label = item['label'] # [27] multilabel
        label = torch.nan_to_num(label, nan=0.0)
        return norm_ecg, label


class Compact1DECGEncoder(nn.Module):
    """
    CPU-compatible lightweight 1D ResNet/CNN encoder for 12-lead ECG signals.
    Exposes a 32-dimensional continuous latent embedding space.
    """
    def __init__(self, in_channels=12, embedding_dim=32):
        super().__init__()
        self.conv_block1 = nn.Sequential(
            nn.Conv1d(in_channels, 32, kernel_size=15, stride=2, padding=7),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.MaxPool1d(2)
        )
        self.conv_block2 = nn.Sequential(
            nn.Conv1d(32, 64, kernel_size=7, stride=2, padding=3),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.MaxPool1d(2)
        )
        self.conv_block3 = nn.Sequential(
            nn.Conv1d(64, 128, kernel_size=5, stride=2, padding=2),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.AdaptiveAvgPool1d(1)
        )
        self.fc_embed = nn.Sequential(
            nn.Linear(128, embedding_dim),
            nn.LayerNorm(embedding_dim),
            nn.ReLU()
        )

    def forward(self, x):
        # x: [Batch, 12, 5000]
        x = self.conv_block1(x)
        x = self.conv_block2(x)
        x = self.conv_block3(x) # [Batch, 128, 1]
        x = x.squeeze(-1) # [Batch, 128]
        embedding = self.fc_embed(x) # [Batch, 32]
        return embedding

class ECGClassifier(nn.Module):
    """
    Multilabel classifier head operating on the 32D ECG embedding.
    """
    def __init__(self, embedding_dim=32, num_classes=27):
        super().__init__()
        self.classifier = nn.Linear(embedding_dim, num_classes)

    def forward(self, embedding):
        return self.classifier(embedding)

def train_ecg_pipeline():
    print("=== Starting ECG Pipeline Training & Evaluation ===")
    data_path = 'data/raw/ecg/ecg_dataset.pt'
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"ECG dataset not found at {data_path}")

    raw_data = torch.load(data_path)
    num_samples = len(raw_data)
    print(f"Loaded {num_samples} total ECG samples.")

    # Create reproducible splits
    np.random.seed(42)
    indices = np.arange(num_samples)
    np.random.shuffle(indices)

    train_end = int(0.70 * num_samples) # 1400
    val_end = int(0.85 * num_samples)   # 300

    train_idx = indices[:train_end]
    val_idx = indices[train_end:val_end]
    test_idx = indices[val_end:]

    # Save split manifests
    os.makedirs('data/splits', exist_ok=True)
    pd.DataFrame({'record_index': train_idx, 'split': 'train'}).to_csv('data/splits/ecg_train.csv', index=False)
    pd.DataFrame({'record_index': val_idx, 'split': 'val'}).to_csv('data/splits/ecg_val.csv', index=False)
    pd.DataFrame({'record_index': test_idx, 'split': 'test'}).to_csv('data/splits/ecg_test.csv', index=False)
    print(f"Splits saved: Train={len(train_idx)}, Val={len(val_idx)}, Test={len(test_idx)}")

    train_dataset = ECGDataset(raw_data, train_idx)
    val_dataset = ECGDataset(raw_data, val_idx)
    test_dataset = ECGDataset(raw_data, test_idx)

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)

    encoder = Compact1DECGEncoder(in_channels=12, embedding_dim=32)
    classifier = ECGClassifier(embedding_dim=32, num_classes=27)

    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(list(encoder.parameters()) + list(classifier.parameters()), lr=1e-3)

    epochs = 5
    print(f"Training 1D ResNet encoder + classifier sequentially for {epochs} epochs on CPU...")
    for epoch in range(1, epochs + 1):
        encoder.train()
        classifier.train()
        total_loss = 0.0
        for signals, labels in train_loader:
            optimizer.zero_grad()
            embeds = encoder(signals)
            logits = classifier(embeds)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * signals.size(0)

        epoch_loss = total_loss / len(train_dataset)
        
        # Val evaluation
        encoder.eval()
        classifier.eval()
        val_loss = 0.0
        with torch.no_grad():
            for signals, labels in val_loader:
                embeds = encoder(signals)
                logits = classifier(embeds)
                loss = criterion(logits, labels)
                val_loss += loss.item() * signals.size(0)
        val_loss = val_loss / len(val_dataset)
        print(f"Epoch {epoch}/{epochs} | Train Loss: {epoch_loss:.4f} | Val Loss: {val_loss:.4f}")

    # Evaluate on held-out test set
    encoder.eval()
    classifier.eval()
    test_loss = 0.0
    all_preds = []
    all_targets = []
    with torch.no_grad():
        for signals, labels in test_loader:
            embeds = encoder(signals)
            logits = classifier(embeds)
            loss = criterion(logits, labels)
            test_loss += loss.item() * signals.size(0)
            probs = torch.sigmoid(logits)
            all_preds.append(probs.numpy())
            all_targets.append(labels.numpy())

    test_loss /= len(test_dataset)
    all_preds = np.vstack(all_preds)
    all_targets = np.vstack(all_targets)

    # Multilabel accuracy (exact match & threshold micro F1)
    binary_preds = (all_preds > 0.5).astype(int)
    correct_elementwise = (binary_preds == all_targets).sum()
    total_elements = all_targets.size
    elementwise_acc = float(correct_elementwise / total_elements)

    tp = np.sum((binary_preds == 1) & (all_targets == 1))
    fp = np.sum((binary_preds == 1) & (all_targets == 0))
    fn = np.sum((binary_preds == 0) & (all_targets == 1))

    micro_precision = float(tp / (tp + fp + 1e-8))
    micro_recall = float(tp / (tp + fn + 1e-8))
    micro_f1 = float(2 * micro_precision * micro_recall / (micro_precision + micro_recall + 1e-8))

    print(f"Test Loss: {test_loss:.4f} | Elementwise Acc: {elementwise_acc:.4f} | Micro F1: {micro_f1:.4f}")

    # Save artifacts
    output_dir = 'models/ecg'
    os.makedirs(output_dir, exist_ok=True)
    torch.save(encoder.state_dict(), os.path.join(output_dir, 'encoder.pth'))
    torch.save(classifier.state_dict(), os.path.join(output_dir, 'classifier.pth'))

    config = {
        'in_channels': 12,
        'signal_length': 5000,
        'embedding_dim': 32,
        'num_classes': 27,
        'architecture': 'Compact1DECGEncoder'
    }
    with open(os.path.join(output_dir, 'config.json'), 'w') as f:
        json.dump(config, f, indent=2)

    metrics = {
        'test_loss': float(test_loss),
        'elementwise_accuracy': float(elementwise_acc),
        'micro_precision': float(micro_precision),
        'micro_recall': float(micro_recall),
        'micro_f1': float(micro_f1),
        'num_train_samples': len(train_idx),
        'num_val_samples': len(val_idx),
        'num_test_samples': len(test_idx)
    }
    with open(os.path.join(output_dir, 'metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)

    preprocessing = {
        'lead_normalization': 'zscore_per_lead',
        'sampling_rate_hz': 500,
        'num_leads': 12
    }
    with open(os.path.join(output_dir, 'preprocessing.pkl'), 'wb') as f:
        pickle.dump(preprocessing, f)

    manifest = {
        'status': 'REAL_TRAINED',
        'modality': 'ECG_WAVEFORM',
        'dataset_source': 'julienrund/ecg-dataset',
        'artifacts': ['encoder.pth', 'classifier.pth', 'config.json', 'metrics.json', 'preprocessing.pkl']
    }
    with open(os.path.join(output_dir, 'training_manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)

    with open(os.path.join(output_dir, 'README.md'), 'w') as f:
        f.write("# ECG Waveform Encoder Artifacts\n\nContains 1D ResNet ECG encoder and multilabel classifier trained on 12-lead ECG signals.\n")

    print(f"ECG pipeline artifacts successfully written to {output_dir}/")
    return metrics

if __name__ == '__main__':
    train_ecg_pipeline()
