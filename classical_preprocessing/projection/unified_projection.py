"""
Unified Quantum Angle Projection.

Implements the canonical Phase 1 to Phase 2 mathematical mapping:
    theta = pi * tanh(z)
where z in R^10 and theta in [-pi, pi]^10.
"""

import math
import torch

from classical_preprocessing.constants import QUANTUM_INPUT_DIM, QUANTUM_MAX_ANGLE


def project_to_quantum_angles(z: torch.Tensor) -> torch.Tensor:
    """
    Project latent unconstrained real vectors z into bounded quantum rotation angles theta.

    Mathematical formula:
        theta = pi * tanh(z)

    Parameters
    ----------
    z : torch.Tensor
        Latent tensor of shape (..., 10).

    Returns
    -------
    torch.Tensor
        Bounded quantum rotation angles tensor of shape (..., 10) in range [-pi, pi].

    Raises
    ------
    TypeError
        If z is not a PyTorch tensor.
    ValueError
        If the last dimension of z is not QUANTUM_INPUT_DIM (10).
    """
    if not isinstance(z, torch.Tensor):
        raise TypeError(f"Input z must be a torch.Tensor, got {type(z).__name__}")

    if z.ndim == 0 or z.shape[-1] != QUANTUM_INPUT_DIM:
        raise ValueError(
            f"Input tensor last dimension must be {QUANTUM_INPUT_DIM}, got shape {tuple(z.shape)}"
        )

    pi_val = torch.tensor(math.pi, dtype=z.dtype, device=z.device)
    theta = pi_val * torch.tanh(z)

    return theta
