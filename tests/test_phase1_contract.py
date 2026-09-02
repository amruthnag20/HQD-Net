"""
Unit tests for Phase 1 Quantum Input Contract Validator and Data Contracts.
"""

import math
import unittest
import numpy as np
import torch

from classical_preprocessing.constants import (
    QUANTUM_DTYPE,
    QUANTUM_INPUT_DIM,
    QUANTUM_MAX_ANGLE,
    QUANTUM_MIN_ANGLE,
)
from classical_preprocessing.contracts import (
    ImageTensorContract,
    LatentVectorContract,
    RawInputContract,
    TabularFeatureContract,
    Unified10DRepresentation,
)
from classical_preprocessing.validation.contract_validator import (
    QuantumInputValidator,
    validate_quantum_input,
)


class TestQuantumInputContract(unittest.TestCase):

    # -------------------------------------------------------------
    # 1. Valid Input Tests
    # -------------------------------------------------------------
    def test_valid_1d_float64(self):
        x = torch.zeros(10, dtype=torch.float64)
        out = validate_quantum_input(x)
        self.assertEqual(out.shape, (10,))
        self.assertEqual(out.dtype, torch.float64)

    def test_valid_1d_float32_conversion(self):
        x = torch.zeros(10, dtype=torch.float32)
        out = validate_quantum_input(x)
        self.assertEqual(out.shape, (10,))
        self.assertEqual(out.dtype, torch.float64)

    def test_valid_2d_batch_float64(self):
        x = torch.randn(4, 10, dtype=torch.float64).clamp(-math.pi, math.pi)
        out = validate_quantum_input(x)
        self.assertEqual(out.shape, (4, 10))
        self.assertEqual(out.dtype, torch.float64)

    def test_valid_2d_batch_float32_conversion(self):
        x = torch.randn(4, 10, dtype=torch.float32).clamp(-3.1415, 3.1415)
        out = validate_quantum_input(x)
        self.assertEqual(out.shape, (4, 10))
        self.assertEqual(out.dtype, torch.float64)

    def test_valid_exact_boundaries(self):
        x_min = torch.full((10,), -math.pi, dtype=torch.float64)
        out_min = validate_quantum_input(x_min)
        self.assertEqual(out_min.dtype, torch.float64)
        self.assertTrue(torch.allclose(out_min, torch.tensor(-math.pi, dtype=torch.float64)))

        x_max = torch.full((10,), math.pi, dtype=torch.float64)
        out_max = validate_quantum_input(x_max)
        self.assertEqual(out_max.dtype, torch.float64)
        self.assertTrue(torch.allclose(out_max, torch.tensor(math.pi, dtype=torch.float64)))

    def test_valid_numpy_and_list_inputs(self):
        np_arr = np.zeros(10, dtype=np.float32)
        out_np = validate_quantum_input(np_arr)
        self.assertEqual(out_np.shape, (10,))
        self.assertEqual(out_np.dtype, torch.float64)

        py_list = [0.0] * 10
        out_list = validate_quantum_input(py_list)
        self.assertEqual(out_list.shape, (10,))
        self.assertEqual(out_list.dtype, torch.float64)

    def test_validator_class(self):
        ordering = [f"feat_{i}" for i in range(10)]
        validator = QuantumInputValidator(expected_ordering=ordering)
        x = torch.zeros(10, dtype=torch.float64)
        out = validator.validate(x)
        self.assertEqual(out.shape, (10,))

    # -------------------------------------------------------------
    # 2. Invalid Input Tests
    # -------------------------------------------------------------
    def test_invalid_dimension_9(self):
        x = torch.zeros(9, dtype=torch.float64)
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x)
        self.assertIn("Expected shape (10,)", str(ctx.exception))

    def test_invalid_dimension_11(self):
        x = torch.zeros(11, dtype=torch.float64)
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x)
        self.assertIn("Expected shape (10,)", str(ctx.exception))

    def test_invalid_batch_dimension(self):
        x_b9 = torch.zeros(4, 9, dtype=torch.float64)
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x_b9)
        self.assertIn("Expected shape (B, 10)", str(ctx.exception))

        x_b11 = torch.zeros(4, 11, dtype=torch.float64)
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x_b11)
        self.assertIn("Expected shape (B, 10)", str(ctx.exception))

        x_3d = torch.zeros(4, 10, 1, dtype=torch.float64)
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x_3d)
        self.assertIn("accepts only rank-1", str(ctx.exception))

    def test_invalid_empty_tensor(self):
        x_empty = torch.zeros(0, 10, dtype=torch.float64)
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x_empty)
        self.assertIn("Empty batch dimension", str(ctx.exception))

    def test_invalid_scalar(self):
        x_scalar = torch.tensor(1.0, dtype=torch.float64)
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x_scalar)
        self.assertIn("accepts only rank-1", str(ctx.exception))

    def test_invalid_nan_values(self):
        x = torch.zeros(10, dtype=torch.float64)
        x[3] = float('nan')
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x)
        self.assertIn("NaN values", str(ctx.exception))

    def test_invalid_inf_values(self):
        x_pos = torch.zeros(10, dtype=torch.float64)
        x_pos[0] = float('inf')
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x_pos)
        self.assertIn("Infinite", str(ctx.exception))

        x_neg = torch.zeros(10, dtype=torch.float64)
        x_neg[5] = float('-inf')
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x_neg)
        self.assertIn("Infinite", str(ctx.exception))

    def test_invalid_out_of_range_above_pi(self):
        x = torch.zeros(10, dtype=torch.float64)
        x[0] = 3.5  # 3.5 > pi (~3.14159)
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x)
        self.assertIn("above upper boundary +π", str(ctx.exception))

    def test_invalid_out_of_range_below_neg_pi(self):
        x = torch.zeros(10, dtype=torch.float64)
        x[2] = -3.5  # -3.5 < -pi (~ -3.14159)
        with self.assertRaises(ValueError) as ctx:
            validate_quantum_input(x)
        self.assertIn("below lower boundary -π", str(ctx.exception))

    def test_invalid_type(self):
        with self.assertRaises(TypeError):
            validate_quantum_input("invalid_string_input")

        with self.assertRaises(TypeError):
            validate_quantum_input(torch.tensor([True] * 10))

    def test_invalid_ordering_length(self):
        with self.assertRaises(ValueError):
            QuantumInputValidator(expected_ordering=["feat1", "feat2"])

    # -------------------------------------------------------------
    # 3. Contract Data Structures Tests
    # -------------------------------------------------------------
    def test_shared_contracts_instantiation(self):
        raw = RawInputContract(
            input_source="filepath",
            input_type="tabular",
            modality="clinical_tabular",
            patient_metadata={"patient_id": "P-12345"},
        )
        self.assertEqual(raw.patient_metadata["patient_id"], "P-12345")

        tab = TabularFeatureContract(
            feature_matrix=torch.randn(5, 10),
            feature_names=[f"f{i}" for i in range(10)],
        )
        self.assertEqual(len(tab.feature_names), 10)

        img = ImageTensorContract(
            image_tensor=torch.randn(1, 224, 224),
            modality="chest_xray",
            shape=(1, 224, 224),
        )
        self.assertEqual(img.shape, (1, 224, 224))

        latent = LatentVectorContract(
            latent_tensor=torch.randn(10),
            source_modality="chest_xray",
            latent_dimension=10,
        )
        self.assertEqual(latent.latent_dimension, 10)

        unified = Unified10DRepresentation(
            tensor=torch.zeros(10, dtype=torch.float64),
            feature_ordering=[f"ch_{i}" for i in range(10)],
            source_modality="clinical_tabular",
        )
        self.assertEqual(unified.tensor.shape, (10,))
        self.assertEqual(len(unified.feature_ordering), 10)


if __name__ == "__main__":
    unittest.main()
