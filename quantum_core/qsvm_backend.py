import pennylane as qml
from sklearn.svm import SVC
import numpy as np

n_qubits = 4
dev = qml.device("default.qubit", wires=n_qubits)

# Define the QNode to compute quantum probabilities
@qml.qnode(dev)
def quantum_probs(x):
    """Encodes classical data into quantum states via angle embedding."""
    qml.AngleEmbedding(x, wires=range(n_qubits), rotation='Y')
    return qml.probs(wires=range(n_qubits))

def kernel_circuit(x1, x2):
    """Quantum kernel that computes the fidelity between two quantum states."""
    # Encode both data points and compute the overlap (fidelity) as kernel value
    probs1 = quantum_probs(x1)
    probs2 = quantum_probs(x2)
    # Use Bhattacharyya kernel (overlap of probability distributions)
    return float(np.sum(np.sqrt(probs1 * probs2 + 1e-10)))

def compute_kernel_matrix(X1, X2):
    """Computes the pairwise quantum kernel matrix K(x_i, x_j) = overlap(P(x_i), P(x_j))"""
    n1, n2 = len(X1), len(X2)
    K = np.zeros((n1, n2))
    
    for i in range(n1):
        for j in range(n2):
            K[i, j] = kernel_circuit(X1[i], X2[j])
    
    return K

if __name__ == "__main__":
    X_train = np.array([[0.5, -1.2, 0.8, 0.1], [0.2, 0.4, -0.5, 0.9]])
    y_train = np.array([0, 1])
    
    # 1. Compute Kernel Matrix
    k_train = compute_kernel_matrix(X_train, X_train)
    
    # 2. Feed into Scikit-learn Precomputed SVC
    qsvm = SVC(kernel="precomputed")
    qsvm.fit(k_train, y_train)
    print("QSVM Trained Successfully! Support Vectors Count:", len(qsvm.support_vectors_))