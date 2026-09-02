"""
Centralized constants for classical preprocessing and quantum input boundaries.
"""

import math
import torch

QUANTUM_INPUT_DIM: int = 10
QUANTUM_MIN_ANGLE: float = -math.pi
QUANTUM_MAX_ANGLE: float = math.pi
QUANTUM_DTYPE: torch.dtype = torch.float64
CLASSICAL_DTYPE: torch.dtype = torch.float32
