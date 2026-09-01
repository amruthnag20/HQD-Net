import pennylane as qml
import torch
import torch.nn as nn
from pennylane.qnn import TorchLayer

# Configuration: Number of qubits matching the compressed feature vector (4 to 8 qubits)
n_qubits = 4

# Initialize the local high-performance quantum simulator device
dev = qml.device("default.qubit", wires=n_qubits)

@qml.qnode(dev, diff_method="parameter-shift", interface="torch")
def quantum_circuit(inputs, weights):
    # State Encoding Layer using Pure Angle Embedding (Ry rotation gates)
    qml.AngleEmbedding(inputs, wires=range(n_qubits), rotation='Y')
    
    # Variational Quantum Classifier (VQC) Ansatz
    qml.StronglyEntanglingLayers(weights, wires=range(n_qubits))
    
    # Measure expectation values of Pauli-Z operators for each qubit
    return [qml.expval(qml.PauliZ(i)) for i in range(n_qubits)]

class DressedVQC(nn.Module):
    def __init__(self, n_layers=2):
        super().__init__()
        # Shape for StronglyEntanglingLayers weights: (n_layers, n_qubits, 3)
        weight_shapes = {"weights": (n_layers, n_qubits, 3)}
        
        # Updated TorchLayer import fix
        self.qlayer = TorchLayer(quantum_circuit, weight_shapes)
        
        # Classical 2-Neuron Dressed Circuit (Softmax Layer)
        self.fc = nn.Linear(n_qubits, 2)
        self.softmax = nn.Softmax(dim=1)

    def forward(self, x):
        q_out = self.qlayer(x)
        logits = self.fc(q_out)
        return self.softmax(logits)

# Example usage for training loop initialization:
if __name__ == "__main__":
    model = DressedVQC(n_layers=2)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    
    # Dummy batch of patient biological states (batch_size=2, features=4)
    sample_patient_features = torch.tensor([[0.5, -1.2, 0.8, 0.1], [0.2, 0.4, -0.5, 0.9]], dtype=torch.float32)
    
    predictions = model(sample_patient_features)
    print("Diagnostic Probabilities Output:", predictions)