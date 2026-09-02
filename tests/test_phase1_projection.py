"""
Unit tests for Phase 1 Unified Quantum Angle Projection (pi * tanh(z)).
"""

import math
import unittest
import torch

from classical_preprocessing.projection.unified_projection import project_to_quantum_angles


class TestUnifiedQuantumAngleProjection(unittest.TestCase):

    def test_shape_preservation_1d(self):
        z = torch.randn(10)
        theta = project_to_quantum_angles(z)
        self.assertEqual(theta.shape, (10,))

    def test_shape_preservation_2d_batch(self):
        z = torch.randn(8, 10)
        theta = project_to_quantum_angles(z)
        self.assertEqual(theta.shape, (8, 10))

    def test_zero_mapping(self):
        z = torch.zeros(10, dtype=torch.float64)
        theta = project_to_quantum_angles(z)
        expected = torch.zeros(10, dtype=torch.float64)
        self.assertTrue(torch.allclose(theta, expected))

    def test_mathematical_correctness(self):
        z = torch.tensor([-2.0, -1.0, 0.0, 1.0, 2.0, 0.5, -0.5, 3.0, -3.0, 10.0], dtype=torch.float64)
        theta = project_to_quantum_angles(z)
        expected = torch.tensor(math.pi, dtype=torch.float64) * torch.tanh(z)
        self.assertTrue(torch.allclose(theta, expected))

    def test_bounded_output_range(self):
        # Even for extreme positive/negative inputs, output must strictly stay in [-pi, pi]
        z_extreme = torch.tensor([-1e5, -100.0, -10.0, -1.0, 0.0, 1.0, 10.0, 100.0, 1e5, 0.0], dtype=torch.float64)
        theta = project_to_quantum_angles(z_extreme)
        self.assertTrue(torch.all(theta >= -math.pi))
        self.assertTrue(torch.all(theta <= math.pi))

    def test_dtype_preservation(self):
        z_f32 = torch.randn(10, dtype=torch.float32)
        theta_f32 = project_to_quantum_angles(z_f32)
        self.assertEqual(theta_f32.dtype, torch.float32)

        z_f64 = torch.randn(10, dtype=torch.float64)
        theta_f64 = project_to_quantum_angles(z_f64)
        self.assertEqual(theta_f64.dtype, torch.float64)

    def test_invalid_input_type(self):
        with self.assertRaises(TypeError):
            project_to_quantum_angles([0.0] * 10)  # Must be torch.Tensor

    def test_invalid_last_dimension(self):
        z_invalid = torch.randn(9)
        with self.assertRaises(ValueError):
            project_to_quantum_angles(z_invalid)

        z_invalid_2d = torch.randn(4, 11)
        with self.assertRaises(ValueError):
            project_to_quantum_angles(z_invalid_2d)


if __name__ == "__main__":
    unittest.main()
