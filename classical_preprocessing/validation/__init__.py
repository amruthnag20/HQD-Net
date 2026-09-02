"""
Validation module for Quantum Input Contract enforcement.
"""

from classical_preprocessing.validation.contract_validator import (
    QuantumInputValidator,
    validate_quantum_input,
)

__all__ = ["validate_quantum_input", "QuantumInputValidator"]
