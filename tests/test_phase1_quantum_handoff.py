"""
Unit tests for Phase 1 Stage 9 Quantum Handoff & Immutable Quantum Core Integration.
"""

import hashlib
import math
import unittest
from pathlib import Path
import numpy as np
import torch

from classical_preprocessing.quantum_handoff import QuantumHandoffAdapter, map_latent_to_quantum_angles


class TestPhase1QuantumHandoff(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        # Baseline file integrity hashes for immutable quantum core
        self.protected_files = {
            "hqd_quantum": Path("quantum_core/hqd_quantum.py"),
            "qsvm_backend": Path("quantum_core/qsvm_backend.py"),
            "vqc_weights": Path("quantum_core/vqc_model_weights.pth"),
        }
        self.initial_hashes = {
            name: hashlib.sha256(path.read_bytes()).hexdigest()
            for name, path in self.protected_files.items()
            if path.exists()
        }

    def tearDown(self):
        # Verify immutable quantum core files were not modified during test execution
        for name, path in self.protected_files.items():
            if path.exists() and name in self.initial_hashes:
                current_hash = hashlib.sha256(path.read_bytes()).hexdigest()
                self.assertEqual(
                    self.initial_hashes[name],
                    current_hash,
                    f"Protected file {path} was modified during test execution!",
                )

    # -------------------------------------------------------------
    # Test A — Single 10-D Vector Input (10,)
    # -------------------------------------------------------------
    def test_single_10d_vector_input(self):
        z = torch.randn(10, dtype=torch.float32)
        theta = map_latent_to_quantum_angles(z)

        self.assertEqual(theta.shape, (10,))
        self.assertEqual(theta.dtype, torch.float64)
        self.assertTrue((theta >= -math.pi).all() and (theta <= math.pi).all())

    # -------------------------------------------------------------
    # Test B — Batch 10-D Input (B, 10)
    # -------------------------------------------------------------
    def test_batch_10d_input(self):
        z = torch.randn(4, 10, dtype=torch.float32)
        theta = map_latent_to_quantum_angles(z)

        self.assertEqual(theta.shape, (4, 10))
        self.assertEqual(theta.dtype, torch.float64)
        self.assertTrue((theta >= -math.pi).all() and (theta <= math.pi).all())

    # -------------------------------------------------------------
    # Test C — Canonical Mapping Exact Formula Verification
    # -------------------------------------------------------------
    def test_canonical_mapping_formula(self):
        z = torch.tensor([0.0, 1.0, -1.0, 2.0, -2.0, 0.5, -0.5, 3.0, -3.0, 0.0], dtype=torch.float64)
        theta = map_latent_to_quantum_angles(z)

        expected = math.pi * torch.tanh(z)
        torch.testing.assert_close(theta, expected)

    # -------------------------------------------------------------
    # Test D — Range Validation [-pi, pi]
    # -------------------------------------------------------------
    def test_range_validation(self):
        z = torch.randn(20, 10, dtype=torch.float64) * 5.0
        theta = map_latent_to_quantum_angles(z)

        self.assertTrue((theta >= -math.pi).all())
        self.assertTrue((theta <= math.pi).all())

    # -------------------------------------------------------------
    # Test E — Extreme Values Approach +/- pi Safely
    # -------------------------------------------------------------
    def test_extreme_values_approach_pi(self):
        z_extreme = torch.tensor([1e5, -1e5] + [0.0] * 8, dtype=torch.float64)
        theta = map_latent_to_quantum_angles(z_extreme)

        self.assertAlmostEqual(theta[0].item(), math.pi, places=5)
        self.assertAlmostEqual(theta[1].item(), -math.pi, places=5)
        self.assertTrue((theta >= -math.pi).all() and (theta <= math.pi).all())

    # -------------------------------------------------------------
    # Test F — NaN Input Rejection
    # -------------------------------------------------------------
    def test_nan_input_rejection(self):
        z = torch.zeros(10, dtype=torch.float64)
        z[4] = float("nan")

        with self.assertRaises(ValueError) as ctx:
            map_latent_to_quantum_angles(z)
        self.assertIn("NaN", str(ctx.exception))

    # -------------------------------------------------------------
    # Test G — Inf Input Rejection
    # -------------------------------------------------------------
    def test_inf_input_rejection(self):
        z = torch.zeros(10, dtype=torch.float64)
        z[2] = float("inf")

        with self.assertRaises(ValueError) as ctx:
            map_latent_to_quantum_angles(z)
        self.assertIn("Inf", str(ctx.exception))

        z_neg = torch.zeros(10, dtype=torch.float64)
        z_neg[0] = float("-inf")
        with self.assertRaises(ValueError) as ctx:
            map_latent_to_quantum_angles(z_neg)
        self.assertIn("Inf", str(ctx.exception))

    # -------------------------------------------------------------
    # Test H — Invalid Dimensions Rejection
    # -------------------------------------------------------------
    def test_invalid_dimensions_rejection(self):
        z_3d = torch.zeros(2, 5, 10, dtype=torch.float64)
        with self.assertRaises(ValueError) as ctx:
            map_latent_to_quantum_angles(z_3d)
        self.assertIn("rank", str(ctx.exception))

        z_scalar = torch.tensor(1.0, dtype=torch.float64)
        with self.assertRaises(ValueError):
            map_latent_to_quantum_angles(z_scalar)

    # -------------------------------------------------------------
    # Test I — Wrong Feature Count Rejection
    # -------------------------------------------------------------
    def test_wrong_feature_count_rejection(self):
        z_9d = torch.zeros(9, dtype=torch.float64)
        with self.assertRaises(ValueError) as ctx:
            map_latent_to_quantum_angles(z_9d)
        self.assertIn("Expected 1D shape (10,)", str(ctx.exception))

        z_11d = torch.zeros(4, 11, dtype=torch.float64)
        with self.assertRaises(ValueError) as ctx:
            map_latent_to_quantum_angles(z_11d)
        self.assertIn("Expected 2D shape (B, 10)", str(ctx.exception))

    # -------------------------------------------------------------
    # Test J — Explicit Dtype Conversion to float64
    # -------------------------------------------------------------
    def test_dtype_conversion_to_float64(self):
        z_f32 = torch.randn(10, dtype=torch.float32)
        theta_f32 = map_latent_to_quantum_angles(z_f32)
        self.assertEqual(theta_f32.dtype, torch.float64)

        z_np = np.random.randn(10).astype(np.float32)
        theta_np = map_latent_to_quantum_angles(z_np)
        self.assertEqual(theta_np.dtype, torch.float64)

    # -------------------------------------------------------------
    # Test K — Input Immutability Guarantee
    # -------------------------------------------------------------
    def test_input_immutability(self):
        z_orig = torch.randn(4, 10, dtype=torch.float32)
        z_copy = z_orig.clone()

        _ = map_latent_to_quantum_angles(z_orig)

        torch.testing.assert_close(z_orig, z_copy)

    # -------------------------------------------------------------
    # Test L — Actual Quantum Core Smoke Test (DressedVQC Execution)
    # -------------------------------------------------------------
    def test_quantum_core_smoke_test(self):
        adapter = QuantumHandoffAdapter()
        z_batch = torch.randn(2, 10, dtype=torch.float32)

        probs, theta = adapter.execute_quantum_model(z_batch)

        self.assertIsInstance(probs, torch.Tensor)
        self.assertEqual(probs.shape, (2, 2))
        self.assertEqual(theta.shape, (2, 10))
        self.assertEqual(theta.dtype, torch.float64)

    # -------------------------------------------------------------
    # Test M — Output Validity & Probability Normalization
    # -------------------------------------------------------------
    def test_quantum_output_validity(self):
        adapter = QuantumHandoffAdapter()
        z_single = torch.randn(10, dtype=torch.float32)

        probs, theta = adapter.execute_quantum_model(z_single)

        self.assertEqual(probs.shape, (2,))
        self.assertTrue(torch.isfinite(probs).all())
        self.assertTrue((probs >= 0.0).all() and (probs <= 1.0).all())
        self.assertAlmostEqual(probs.sum().item(), 1.0, places=4)

    # -------------------------------------------------------------
    # Test N — Immutable Quantum Core Verification
    # -------------------------------------------------------------
    def test_immutable_quantum_core_verification(self):
        for name, path in self.protected_files.items():
            self.assertTrue(path.exists(), f"Protected file {path} is missing!")
            current_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(self.initial_hashes[name], current_hash)


if __name__ == "__main__":
    unittest.main()
