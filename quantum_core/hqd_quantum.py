import pennylane as qml
import torch
import torch.nn as nn
from pennylane.qnn import TorchLayer

# Configuration: Number of qubits matching the compressed feature vector (10 qubits for 10-biomarker clinical data)
n_qubits = 10

# Initialize the local high-performance quantum simulator device
dev = qml.device("default.qubit", wires=n_qubits)

@qml.qnode(dev, diff_method="finite-diff", interface="torch")
def quantum_circuit(inputs, weights):
    # Angle Embedding across 10 qubits using Y-axis rotations
    # Maps 10 clinical biomarkers to quantum state amplitudes
    # Use float64 for accurate finite-difference gradient computation
    inputs_64 = inputs.to(torch.float64) if isinstance(inputs, torch.Tensor) else torch.tensor(inputs, dtype=torch.float64)
    qml.AngleEmbedding(inputs_64, wires=range(n_qubits), rotation='Y')
    
    # Parameterized Ansatz: Strongly Entangling Layers for quantum feature extraction
    # Builds entanglement across all 10 qubits
    qml.StronglyEntanglingLayers(weights, wires=range(n_qubits))
    
    # Measure Pauli-Z expectation values across all 10 qubits
    # Provides 10-dimensional quantum feature vector
    return [qml.expval(qml.PauliZ(i)) for i in range(n_qubits)]

class DressedVQC(nn.Module):
    def __init__(self, n_layers=3):
        super().__init__()
        # Shape of weights for Strongly Entangling Layers: (n_layers, n_qubits, 3)
        # 3 parameters per gate rotation (RX, RY, RZ equivalents)
        weight_shapes = {"weights": (n_layers, n_qubits, 3)}
        
        # Quantum layer: executes parameterized quantum circuit
        self.q_layer = TorchLayer(quantum_circuit, weight_shapes)
        
        # Classical post-processing: 10-dimensional quantum output → 2-class probabilities
        # Multi-layer perceptron provides additional expressivity for classification
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

# Example usage for training loop initialization:
if __name__ == "__main__":
    # Initialize 10-qubit VQC with 3 entangling layers
    model = DressedVQC(n_layers=3)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    
    # Test batch: 2 patients with 10 clinical biomarkers each
    sample_patient_features = torch.randn(2, n_qubits, dtype=torch.float32)
    
    predictions = model(sample_patient_features)
    print(f"10-Qubit VQC Model Test")
    print(f"Input Shape: {sample_patient_features.shape}")
    print(f"Output Probabilities Shape: {predictions.shape}")
    print(f"Sample Predictions: {predictions}")