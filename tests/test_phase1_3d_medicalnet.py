"""
Unit tests for MedicalNet Pretrained 3D ResNet Backbone Integration in HQD-Net Stage 7.
"""

import hashlib
import tempfile
import unittest
from pathlib import Path
import nibabel as nib
import numpy as np
import torch

from classical_preprocessing import (
    Imaging3DConfig,
    Imaging3DPipeline,
    MedicalNet3DEncoder,
    Unified10DProjector,
    UnifiedProjectionConfig,
    VolumeRepresentation,
    get_medical_3d_encoder,
)


class TestPhase13DMedicalNet(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

        # Synthetic NIfTI volume (32x32x32)
        self.nii_path = self.temp_path / "brain_mri_medicalnet.nii.gz"
        vol_arr = np.random.randn(32, 32, 32).astype(np.float32)
        nii_img = nib.Nifti1Image(vol_arr, affine=np.eye(4))
        nib.save(nii_img, self.nii_path)

        # Baseline SHA256 hashes of protected files
        self.protected_files = {
            "hqd_quantum": Path("quantum_core/hqd_quantum.py"),
            "qsvm_backend": Path("quantum_core/qsvm_backend.py"),
            "vqc_weights": Path("quantum_core/vqc_model_weights.pth"),
            "app_py": Path("frontend/app.py"),
            "app_v2_py": Path("frontend/app-v2.py"),
            "engine_controller": Path("engine_controller.py"),
        }
        self.initial_hashes = {
            name: hashlib.sha256(path.read_bytes()).hexdigest()
            for name, path in self.protected_files.items()
            if path.exists()
        }

    def tearDown(self):
        for name, path in self.protected_files.items():
            if path.exists() and name in self.initial_hashes:
                current_hash = hashlib.sha256(path.read_bytes()).hexdigest()
                self.assertEqual(
                    self.initial_hashes[name],
                    current_hash,
                    f"Protected artifact {path} was modified during test execution!",
                )
        self.temp_dir.cleanup()

    # -------------------------------------------------------------
    # Test 1 — Encoder Import & Factory Construction
    # -------------------------------------------------------------
    def test_encoder_import_and_factory(self):
        cfg = Imaging3DConfig(encoder_name="medicalnet")
        encoder = get_medical_3d_encoder(cfg)
        self.assertIsInstance(encoder, MedicalNet3DEncoder)
        self.assertEqual(encoder.embedding_dim, 512)

    # -------------------------------------------------------------
    # Test 2 & 3 — Real Pretrained Checkpoint Loading & Param Count
    # -------------------------------------------------------------
    def test_real_checkpoint_parameter_matching(self):
        encoder = MedicalNet3DEncoder()
        self.assertEqual(encoder.matched_param_count, 72)
        self.assertEqual(encoder.embedding_dim, 512)

    # -------------------------------------------------------------
    # Test 4 — Single Volume Inference (1, 512)
    # -------------------------------------------------------------
    def test_single_volume_inference(self):
        cfg = Imaging3DConfig(encoder_name="medicalnet", modality="mri", target_shape=(32, 32, 32))
        pipeline = Imaging3DPipeline(config=cfg, encoder=MedicalNet3DEncoder(config=cfg))

        rep = pipeline.process_volume(self.nii_path, sample_id="MEDNET_001")

        self.assertIsInstance(rep, VolumeRepresentation)
        self.assertEqual(rep.embeddings.shape, (1, 512))
        self.assertEqual(rep.embeddings.dtype, np.float64)
        self.assertTrue(np.isfinite(rep.embeddings).all())

    # -------------------------------------------------------------
    # Test 5 — Batch Volume Inference (N, 512)
    # -------------------------------------------------------------
    def test_batch_volume_inference(self):
        cfg = Imaging3DConfig(encoder_name="medicalnet", modality="mri", target_shape=(32, 32, 32))
        pipeline = Imaging3DPipeline(config=cfg, encoder=MedicalNet3DEncoder(config=cfg))

        inputs = [self.nii_path, self.nii_path, self.nii_path]
        sample_ids = ["MEDNET_001", "MEDNET_002", "MEDNET_003"]

        rep = pipeline.process_batch(inputs, sample_ids=sample_ids)

        self.assertEqual(rep.embeddings.shape, (3, 512))
        self.assertEqual(rep.sample_ids, sample_ids)
        self.assertTrue(np.isfinite(rep.embeddings).all())

    # -------------------------------------------------------------
    # Test 6 — Finite Embeddings Verification
    # -------------------------------------------------------------
    def test_finite_embeddings(self):
        encoder = MedicalNet3DEncoder()
        x_vol = torch.rand(2, 1, 32, 32, 32, dtype=torch.float32)
        out = encoder.encode(x_vol)

        self.assertEqual(out.shape, (2, 512))
        self.assertTrue(np.isfinite(out).all())

    # -------------------------------------------------------------
    # Test 7 — Deterministic Inference
    # -------------------------------------------------------------
    def test_deterministic_inference(self):
        cfg = Imaging3DConfig(encoder_name="medicalnet", modality="mri", target_shape=(32, 32, 32))
        pipeline = Imaging3DPipeline(config=cfg, encoder=MedicalNet3DEncoder(config=cfg))

        rep1 = pipeline.process_volume(self.nii_path, sample_id="MEDNET_DET")
        rep2 = pipeline.process_volume(self.nii_path, sample_id="MEDNET_DET")

        np.testing.assert_array_almost_equal(rep1.embeddings, rep2.embeddings)

    # -------------------------------------------------------------
    # Test 8 — CPU Device Execution
    # -------------------------------------------------------------
    def test_cpu_execution(self):
        cfg = Imaging3DConfig(encoder_name="medicalnet", device="cpu")
        encoder = MedicalNet3DEncoder(config=cfg)
        self.assertEqual(encoder.device.type, "cpu")

    # -------------------------------------------------------------
    # Test 9 — Invalid Input Handling
    # -------------------------------------------------------------
    def test_invalid_input_dimension_rejection(self):
        encoder = MedicalNet3DEncoder()
        x_3d = torch.rand(32, 32, 32, dtype=torch.float32)

        with self.assertRaises(ValueError):
            encoder.encode(x_3d)

    # -------------------------------------------------------------
    # Test 10 — Strict No Silent Fallback Block Check
    # -------------------------------------------------------------
    def test_strict_no_silent_fallback(self):
        fake_path = self.temp_path / "non_existent_corrupted_file.pth"
        fake_path.write_bytes(b"INVALID_CORRUPTED_BYTES")

        with self.assertRaises(RuntimeError) as ctx:
            MedicalNet3DEncoder(checkpoint_path=str(fake_path))

        self.assertIn("MEDICALNET INTEGRATION BLOCKED", str(ctx.exception))

    # -------------------------------------------------------------
    # Test 11 — Stage 8 Unified Projection Compatibility
    # -------------------------------------------------------------
    def test_stage8_unified_projection_compatibility(self):
        cfg_3d = Imaging3DConfig(encoder_name="medicalnet", modality="mri", target_shape=(32, 32, 32))
        pipeline_3d = Imaging3DPipeline(config=cfg_3d, encoder=MedicalNet3DEncoder(config=cfg_3d))

        rep_3d = pipeline_3d.process_volume(self.nii_path, sample_id="MEDNET_STAGE8")

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(image_3d=rep_3d)
        proj_res = projector.transform(image_3d=rep_3d)

        self.assertEqual(proj_res.representation.shape, (1, 10))
        self.assertEqual(proj_res.representation.dtype, np.float64)
        self.assertTrue(np.isfinite(proj_res.representation).all())

    # -------------------------------------------------------------
    # Test 12 — Immutable Protected Files Verification
    # -------------------------------------------------------------
    def test_protected_files_integrity(self):
        for name, path in self.protected_files.items():
            self.assertTrue(path.exists(), f"Protected artifact {path} is missing!")
            cur_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(self.initial_hashes[name], cur_hash)


if __name__ == "__main__":
    unittest.main()
