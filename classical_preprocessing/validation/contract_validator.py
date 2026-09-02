"""
Quantum Input Contract Validator.

Validates that classical vectors/tensors satisfy all mathematical, structural,
and precision boundaries required by the 10-qubit Quantum Core.
"""

import math
from typing import Any, List, Optional
import numpy as np
import torch

from classical_preprocessing.constants import (
    QUANTUM_DTYPE,
    QUANTUM_INPUT_DIM,
    QUANTUM_MAX_ANGLE,
    QUANTUM_MIN_ANGLE,
)


def validate_quantum_input(
    x: Any,
    expected_ordering: Optional[List[str]] = None,
) -> torch.Tensor:
    """
    Validate and format input tensor for the 10-qubit quantum boundary.

    Parameters
    ----------
    x : Any
        Input data (torch.Tensor, np.ndarray, list, tuple).
    expected_ordering : Optional[List[str]]
        Optional list of feature/channel names expected (must have length 10).

    Returns
    -------
    torch.Tensor
        Validated tensor guaranteed to be shape (10,) or (B, 10),
        dtype torch.float64, finite, and in [-pi, pi].

    Raises
    ------
    TypeError
        If x cannot be converted to a PyTorch tensor.
    ValueError
        If shape, rank, values, range, or feature ordering fail validation.
    """
    if expected_ordering is not None:
        if not isinstance(expected_ordering, (list, tuple)):
            raise TypeError(f"expected_ordering must be a list or tuple, got {type(expected_ordering).__name__}")
        if len(expected_ordering) != QUANTUM_INPUT_DIM:
            raise ValueError(
                f"expected_ordering must contain exactly {QUANTUM_INPUT_DIM} items, "
                f"got {len(expected_ordering)}"
            )

    # 1. Type conversion to torch.Tensor
    if isinstance(x, torch.Tensor):
        tensor = x
    elif isinstance(x, (np.ndarray, list, tuple)):
        try:
            tensor = torch.as_tensor(x)
        except Exception as err:
            raise TypeError(f"Could not convert input of type {type(x).__name__} to PyTorch tensor: {err}") from err
    else:
        raise TypeError(f"Input must be a torch.Tensor, np.ndarray, list, or tuple. Got: {type(x).__name__}")

    # Ensure numerical floating point or integer dtype
    if tensor.dtype == torch.bool:
        raise TypeError("Boolean tensors are not valid quantum inputs.")

    if not torch.is_floating_point(tensor) and not tensor.dtype in (
        torch.int64, torch.int32, torch.int16, torch.int8, torch.uint8
    ):
        raise TypeError(f"Unsupported input tensor dtype: {tensor.dtype}")

    # Convert float32 or integer types to float64 at boundary
    if tensor.dtype != QUANTUM_DTYPE:
        try:
            tensor = tensor.to(dtype=QUANTUM_DTYPE)
        except Exception as err:
            raise TypeError(f"Cannot cast tensor of dtype {tensor.dtype} to {QUANTUM_DTYPE}: {err}") from err

    # 2. Shape and Rank verification
    shape = tensor.shape
    rank = len(shape)

    if rank == 1:
        if shape[0] != QUANTUM_INPUT_DIM:
            raise ValueError(
                f"Invalid 1D tensor shape {tuple(shape)}. Expected shape ({QUANTUM_INPUT_DIM},)."
            )
    elif rank == 2:
        if shape[0] == 0:
            raise ValueError(f"Empty batch dimension in tensor shape {tuple(shape)}.")
        if shape[1] != QUANTUM_INPUT_DIM:
            raise ValueError(
                f"Invalid 2D tensor shape {tuple(shape)}. Expected shape (B, {QUANTUM_INPUT_DIM})."
            )
    else:
        raise ValueError(
            f"Invalid tensor rank {rank} with shape {tuple(shape)}. "
            f"Quantum input contract accepts only rank-1 ({QUANTUM_INPUT_DIM},) or rank-2 (B, {QUANTUM_INPUT_DIM}) tensors."
        )

    # 3. Finite value check (NaN / +Inf / -Inf)
    if torch.isnan(tensor).any():
        raise ValueError("Quantum input validation failed: tensor contains NaN values.")

    if torch.isinf(tensor).any():
        raise ValueError("Quantum input validation failed: tensor contains Infinite (+Inf or -Inf) values.")

    # 4. Range check [-pi, pi]
    # Exact -pi and +pi are accepted. Strictly outside [-pi, pi] is rejected without silent clipping.
    min_val = tensor.min().item()
    max_val = tensor.max().item()

    if min_val < QUANTUM_MIN_ANGLE:
        raise ValueError(
            f"Quantum input validation failed: value {min_val} is below lower boundary -π ({QUANTUM_MIN_ANGLE}). "
            f"Values must not be silently clipped."
        )

    if max_val > QUANTUM_MAX_ANGLE:
        raise ValueError(
            f"Quantum input validation failed: value {max_val} is above upper boundary +π ({QUANTUM_MAX_ANGLE}). "
            f"Values must not be silently clipped."
        )

    return tensor


class QuantumInputValidator:
    """
    Validator class for verifying and enforcing the Quantum Input Contract.
    """

    def __init__(self, expected_ordering: Optional[List[str]] = None):
        if expected_ordering is not None:
            if len(expected_ordering) != QUANTUM_INPUT_DIM:
                raise ValueError(
                    f"expected_ordering must contain exactly {QUANTUM_INPUT_DIM} items, got {len(expected_ordering)}"
                )
        self.expected_ordering = expected_ordering

    def validate(self, x: Any) -> torch.Tensor:
        """Validate input data according to configured contract."""
        return validate_quantum_input(x, expected_ordering=self.expected_ordering)
