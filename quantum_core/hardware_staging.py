import pennylane as qml
import numpy as np

# Note: For this to work with Qiskit Aer noise models, you'll need:
# pip install qiskit-aer
# However, we can still demonstrate with PennyLane's built-in device
# If qiskit-aer is available, uncomment the lines below

# from qiskit_aer import AerSimulator
# from qiskit_aer.noise import NoiseModel, depolarizing_error

# Fallback: Using PennyLane's default.mixed device which supports noise channels
n_qubits = 4
dev_noisy = qml.device("default.mixed", wires=n_qubits)

@qml.qnode(dev_noisy)
def noisy_circuit_pennylane(weights, features):
    """Quantum circuit with simulated depolarizing noise via PennyLane."""
    qml.AngleEmbedding(features, wires=range(n_qubits), rotation='Y')
    qml.StronglyEntanglingLayers(weights, wires=range(n_qubits))
    
    # Add depolarizing noise channels (1% error per gate)
    for i in range(n_qubits):
        qml.DepolarizingChannel(0.01, wires=i)
    
    return [qml.expval(qml.PauliZ(i)) for i in range(n_qubits)]

# Optional: Qiskit Aer-based implementation (uncomment if qiskit-aer is installed)
# try:
#     from qiskit_aer import AerSimulator
#     from qiskit_aer.noise import NoiseModel, depolarizing_error
#
#     # Create a custom Qiskit Aer noise model (e.g., 1% gate error)
#     noise_model = NoiseModel()
#     error_gate = depolarizing_error(0.01, 1)
#     noise_model.add_all_qubit_quantum_error(error_gate, ['RZ', 'RY'])
#
#     # Initialize PennyLane device backed by Qiskit Aer with noise
#     dev_qiskit_noisy = qml.device("qiskit.aer", wires=n_qubits, noise_model=noise_model)
#
#     @qml.qnode(dev_qiskit_noisy)
#     def noisy_circuit_qiskit(weights, features):
#         qml.AngleEmbedding(features, wires=range(n_qubits), rotation='Y')
#         qml.StronglyEntanglingLayers(weights, wires=range(n_qubits))
#         return [qml.expval(qml.PauliZ(i)) for i in range(n_qubits)]
#
#     qiskit_available = True
# except ImportError:
#     qiskit_available = False

if __name__ == "__main__":
    sample_features = np.array([0.5, -0.2, 0.8, -0.9])
    dummy_weights = np.zeros((2, n_qubits, 3))
    
    print("--- Noisy Hardware Staging Inference ---")
    
    # Test with PennyLane mixed device
    result_pl = noisy_circuit_pennylane(dummy_weights, sample_features)
    print("PennyLane (Default Mixed Device) with Depolarizing Noise:")
    print(f"Qubit Expectation Outputs: {result_pl}")
    
    # Try Qiskit Aer if available
    # if qiskit_available:
    #     result_qiskit = noisy_circuit_qiskit(dummy_weights, sample_features)
    #     print("\nQiskit Aer Device with Depolarizing Noise:")
    #     print(f"Qubit Expectation Outputs: {result_qiskit}")
    # else:
    #     print("\nQiskit Aer not available (install with: pip install qiskit-aer)")
    
    print("\nNoisy Hardware Staging Inference Complete!")
