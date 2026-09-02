"""
Stage 9 Quantum Handoff Adapter & Immutable Quantum Core Integration.
"""

from pathlib import Path
from typing import Optional, Tuple, Union
import math
import numpy as np
import torch

from classical_preprocessing.constants import QUANTUM_INPUT_DIM
from classical_preprocessing.validation.contract_validator import validate_quantum_input
from quantum_core.hqd_quantum import DressedVQC


def map_latent_to_quantum_angles(z: Union[np.ndarray, torch.Tensor, list]) -> torch.Tensor:
    """
    Map a 10-dimensional classical latent representation z in R^10 to quantum rotation angles theta in (-pi, pi)^10.

    Canonical formula:
        theta = pi * tanh(z)

    Parameters
    ----------
    z : Union[np.ndarray, torch.Tensor, list]
        Input tensor or array of shape (10,) or (B, 10).

    Returns
    -------
    torch.Tensor
        Validated float64 rotation angle tensor theta in range [-pi, pi].

    Raises
    ------
    TypeError
        If z cannot be converted to float tensor.
    ValueError
        If z contains NaN/Inf, or shape does not conform to (10,) or (B, 10).
    """
    if z is None:
        raise ValueError("Input z cannot be None.")

    # 1. Convert to PyTorch float64 tensor without mutating input
    if isinstance(z, torch.Tensor):
        z_tensor = z.clone().detach().to(dtype=torch.float64)
    elif isinstance(z, np.ndarray):
        z_tensor = torch.from_numpy(z.copy()).to(dtype=torch.float64)
    elif isinstance(z, (list, tuple)):
        z_tensor = torch.tensor(z, dtype=torch.float64)
    else:
        raise TypeError(f"Unsupported input type for quantum angle mapping: {type(z).__name__}")

    # 2. Validate input dimensionality
    if z_tensor.ndim == 1:
        if z_tensor.shape[0] != QUANTUM_INPUT_DIM:
            raise ValueError(f"Expected 1D shape ({QUANTUM_INPUT_DIM},), got {tuple(z_tensor.shape)}")
    elif z_tensor.ndim == 2:
        if z_tensor.shape[0] == 0:
            raise ValueError("Empty batch dimension.")
        if z_tensor.shape[1] != QUANTUM_INPUT_DIM:
            raise ValueError(f"Expected 2D shape (B, {QUANTUM_INPUT_DIM}), got {tuple(z_tensor.shape)}")
    else:
        raise ValueError(f"Quantum angle mapping accepts only 1D or 2D tensors, got rank {z_tensor.ndim}")

    # 3. Enforce finite values prior to non-linear transformation
    if not torch.isfinite(z_tensor).all():
        raise ValueError("Latent vector z contains NaN or Inf values.")

    # 4. Canonical angle transformation: theta = pi * tanh(z)
    pi_val = torch.tensor(math.pi, dtype=torch.float64, device=z_tensor.device)
    theta = pi_val * torch.tanh(z_tensor)

    # 5. Enforce Stage 1 quantum input contract
    validated_theta = validate_quantum_input(theta)
    return validated_theta


class QuantumHandoffAdapter:
    """
    Thin adapter connecting Phase 1 Stage 8 classical 10-D representations to the frozen Quantum Core.
    """

    def __init__(
        self,
        weights_path: Optional[Union[str, Path]] = "quantum_core/vqc_model_weights.pth",
        n_layers: int = 2,
        device: str = "cpu",
    ):
        self.device = torch.device(device)
        self.weights_path = str(weights_path) if weights_path else None

        if self.weights_path and Path(self.weights_path).exists():
            state_dict = torch.load(self.weights_path, map_location=self.device, weights_only=False)
            if "q_layer.weights" in state_dict:
                inferred_layers = state_dict["q_layer.weights"].shape[0]
            else:
                inferred_layers = n_layers
            self.quantum_model = DressedVQC(n_layers=inferred_layers).to(self.device)
            self.quantum_model.load_state_dict(state_dict)
        else:
            self.quantum_model = DressedVQC(n_layers=n_layers).to(self.device)

        self.quantum_model.eval()

    def prepare_quantum_input(self, z: Union[np.ndarray, torch.Tensor, list]) -> torch.Tensor:
        """
        Prepare and validate float64 quantum rotation angle tensor from classical latent representation z.
        """
        return map_latent_to_quantum_angles(z).to(self.device)

    def execute_quantum_model(
        self,
        z: Union[np.ndarray, torch.Tensor, list],
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Execute the existing immutable quantum core model on mapped quantum angles.

        Parameters
        ----------
        z : Union[np.ndarray, torch.Tensor, list]
            Latent representation tensor of shape (10,) or (B, 10).

        Returns
        -------
        Tuple[torch.Tensor, torch.Tensor]
            (Class probabilities tensor of shape (B, 2), Validated angle tensor theta of shape (B, 10))
        """
        theta = self.prepare_quantum_input(z)
        is_1d = (theta.ndim == 1)

        # Format input for DressedVQC post-processing expectation
        model_input = (theta.unsqueeze(0) if is_1d else theta).to(torch.float32)

        with torch.no_grad():
            prob_output = self.quantum_model(model_input)

        if not isinstance(prob_output, torch.Tensor):
            raise TypeError(f"Quantum model output must be a torch.Tensor, got {type(prob_output).__name__}")

        if not torch.isfinite(prob_output).all():
            raise ValueError("Quantum model output contains NaN or Inf values.")

        if prob_output.ndim != 2 or prob_output.shape[1] != 2:
            raise ValueError(f"Expected quantum output shape (B, 2), got {tuple(prob_output.shape)}")

        # Validate probability range [0, 1] and sum ~ 1.0
        if (prob_output < -1e-6).any() or (prob_output > 1.0 + 1e-6).any():
            raise ValueError("Quantum model output probabilities out of valid range [0, 1].")

        if is_1d:
            prob_output = prob_output.squeeze(0)

        return prob_output, theta
