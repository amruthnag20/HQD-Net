import numpy as np
import torch
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

def load_clinical_data(n_samples=500, n_features=4):
    """
    Simulates or loads preprocessed clinical biomarker data matching 
    the 4-8 feature output requirement of the classical preprocessing layer.
    """
    # Generating synthetic clinical data mimicking high-signal biomedical biomarkers
    X, y = make_classification(
        n_samples=n_samples, 
        n_features=n_features, 
        n_informative=n_features, 
        n_redundant=0, 
        n_classes=2, 
        random_state=42
    )
    
    # Normalize features to fit Angle Embedding ranges [-pi, pi] or standard scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    return (
        torch.tensor(X_train, dtype=torch.float32),
        torch.tensor(X_test, dtype=torch.float32),
        torch.tensor(y_train, dtype=torch.long),
        torch.tensor(y_test, dtype=torch.long)
    )
