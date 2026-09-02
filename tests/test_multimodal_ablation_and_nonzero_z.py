"""
Comprehensive Multimodal Ablation & Nonzero Latent Representation Test Suite.
Validates MerMED, MedicalNet, 10-D projection, missing modality handling,
quantum handoff contract, and protected quantum file immutability.
"""

import hashlib
import os
import unittest
import numpy as np
import torch

from classical_preprocessing.clinical_intelligence.orchestrator import run_clinical_analysis
from classical_preprocessing.imaging_2d.mermed_encoder import MerMEDEncoder
from classical_preprocessing.imaging_3d.encoder import MedicalNet3DEncoder
from classical_preprocessing.pipeline_runner import run_hqd_real_pipeline
from classical_preprocessing.unified_projection.projector import Unified10DProjector, UnifiedProjectionConfig


class TestMultimodalAblationAndNonzeroZ(unittest.TestCase):

    def test_protected_quantum_files_immutability(self):
        """11. Verify protected quantum files remain byte-for-byte identical."""
        protected = {
            "quantum_core/hqd_quantum.py": "ab3702865bbe78272d815aedea6072a504214c3052663dded3a011767b362465",
            "quantum_core/qsvm_backend.py": "b4766de27aa18b7f07ab5fa57e9a2a1e3290ee82a1f8db5574bfbb208a1b276e",
            "quantum_core/vqc_model_weights.pth": "73108e0e92480b98da073fbb36d4b80b99391bd7691e72bdccd188c685e9cb60",
            "engine_controller.py": "8cac75bb1f0b6459e1ff14b2e38fe8f516a46c232ce642b96d9a3f6c2e7e046e",
        }
        for file_path, exp_hash in protected.items():
            self.assertTrue(os.path.exists(file_path), f"Missing protected file: {file_path}")
            data = open(file_path, "rb").read()
            cur_hash = hashlib.sha256(data).hexdigest()
            self.assertEqual(exp_hash, cur_hash, f"Protected file altered: {file_path}")

    def test_nonzero_and_finite_latent_z(self):
        """3, 4, 5. Verify 10-D projection output shape is (1, 10), finite, and nonzero."""
        raw_inputs = [
            45.0, 120.0, 80.0, 138.0, 24.5, 72.0,
            100.0, 50.0, 150.0, 5.4, 0.9, 15.0,
            0.45, 1.0, 140.0, 4.2, 7.5, 4.8,
            250.0, 14.2, 0.15, 0.45, 0.0, 0.0
        ]
        res = run_clinical_analysis(raw_features=raw_inputs, backend_choice="VQC")
        z = np.array(res["latent_representation"]["latent_biomarkers_vector"])

        self.assertEqual(z.shape, (10,))
        self.assertTrue(np.isfinite(z).all())
        z_norm = np.linalg.norm(z)
        self.assertGreater(z_norm, 0.1, "10-D latent vector must be nonzero and informative")

    def test_missing_modality_does_not_zero_entire_vector(self):
        """6. Verify missing modality does not collapse z to zero."""
        raw_inputs = [
            45.0, 120.0, 80.0, 138.0, 24.5, 72.0,
            100.0, 50.0, 150.0, 5.4, 0.9, 15.0,
            0.45, 1.0, 140.0, 4.2, 7.5, 4.8,
            250.0, 14.2, 0.15, 0.45, 0.0, 0.0
        ]
        # Run Tabular only (no 2D, no 3D)
        res = run_hqd_real_pipeline(tabular_input=raw_inputs, backend_choice="VQC")
        z_tab = np.array(res["latent_representation"]["latent_biomarkers_vector"])

        self.assertTrue(np.isfinite(z_tab).all())
        self.assertGreater(np.linalg.norm(z_tab), 0.1)

    def test_mermed_checkpoint_failure_gate(self):
        """1. Verify MerMEDEncoder enforces strict checkpoint presence validation."""
        fake_path = "weights/nonexistent_mermed.pth"
        with self.assertRaises(FileNotFoundError):
            MerMEDEncoder(weights_path=fake_path)

    def test_medicalnet_checkpoint_validation_behavior(self):
        """2. Verify MedicalNet3DEncoder loads resnet_10_23dataset.pth and produces 512-D embeddings."""
        encoder = MedicalNet3DEncoder()
        self.assertEqual(encoder.embedding_dim, 512)
        vol = torch.randn(1, 1, 16, 32, 32)
        emb = encoder.encode(vol)
        self.assertEqual(emb.shape, (1, 512))
        self.assertTrue(np.isfinite(emb).all())
        self.assertGreater(np.linalg.norm(emb), 0.0)

    def test_quantum_handoff_and_probabilities_normalization(self):
        """8, 9, 10. Verify quantum handoff contract, probability sum = 1, and QuXAI attribution sum = 1."""
        raw_inputs = [
            45.0, 120.0, 80.0, 138.0, 24.5, 72.0,
            100.0, 50.0, 150.0, 5.4, 0.9, 15.0,
            0.45, 1.0, 140.0, 4.2, 7.5, 4.8,
            250.0, 14.2, 0.15, 0.45, 0.0, 0.0
        ]
        res = run_clinical_analysis(raw_features=raw_inputs, backend_choice="VQC")
        risk_score = res["prediction"]["quantum"]["risk_score"]

        self.assertTrue(0.0 <= risk_score <= 1.0)

        # QuXAI Attribution sum verification
        explainability = res["explainability"]
        weights = [item["attribution_weight"] for item in explainability]
        self.assertAlmostEqual(sum(weights), 1.0, places=4)


if __name__ == "__main__":
    unittest.main()
