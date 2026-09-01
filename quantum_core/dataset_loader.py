import numpy as np
import torch
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

def load_clinical_data(n_samples=600, n_features=10):
    """
    Generates and normalizes clinical biomarker data scaled up to 10 features 
    to match a 10-qubit quantum core engine. Simulates multi-biomarker health 
    records for early disease risk detection.
    """
    # Generating synthetic clinical data mimicking high-signal biomedical biomarkers
    # 8 informative features + 2 redundant for realistic correlation patterns
    X, y = make_classification(
        n_samples=n_samples, 
        n_features=n_features, 
        n_informative=8, 
        n_redundant=2, 
        n_classes=2, 
        random_state=42
    )
    
    # Scale features to [-pi, pi] or standard normal range for stable angle embedding
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train/test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    return (
        torch.tensor(X_train, dtype=torch.float64),
        torch.tensor(X_test, dtype=torch.float64),
        torch.tensor(y_train, dtype=torch.long),
        torch.tensor(y_test, dtype=torch.long)
    )

if __name__ == "__main__":
    Xt, Xte, yt, yte = load_clinical_data(n_features=10)
    print(f"Dataset Loaded Successfully! Train Shape: {Xt.shape}, Test Shape: {Xte.shape}")
