"""
End-to-End Multimodal Integration Tests for Stage 8 Unified 10-D Projection with Real Pretrained Encoders.
"""

import hashlib
import tempfile
import unittest
from pathlib import Path
import nibabel as nib
import numpy as np
from PIL import Image
import torch

from classical_preprocessing import (
    ImageRepresentation,
    Imaging2DConfig,
    Imaging2DPipeline,
    Imaging3DConfig,
    Imaging3DPipeline,
    MedicalNet3DEncoder,
    QuantumHandoffAdapter,
    TorchXRayVisionEncoder,
    Unified10DProjector,
    UnifiedProjectionConfig,
    UnifiedRepresentation,
    VolumeRepresentation,
    align_multimodal_inputs,
)
from quantum_core.hqd_quantum import DressedVQC


class TestPhase1UnifiedProjectionRealModels(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

        # 1. Create synthetic 2D CXR image file
        self.cxr_path = self.temp_path / "cxr_sample.png"
        cxr_arr = (np.random.rand(224, 224) * 255).astype(np.uint8)
        Image.fromarray(cxr_arr).save(self.cxr_path)

        # 2. Create synthetic 3D MRI volume file
        self.mri_path = self.temp_path / "mri_sample.nii.gz"
        mri_arr = np.random.randn(32, 32, 32).astype(np.float32)
        nii_img = nib.Nifti1Image(mri_arr, affine=np.eye(4))
        nib.save(nii_img, str(self.mri_path))

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
    # Test 1 — Tabular Only
    # -------------------------------------------------------------
    def test_tabular_only_projection(self):
        tab_data = np.random.randn(5, 8).astype(np.float64)
        sample_ids = [f"PATIENT_{i:03d}" for i in range(5)]

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=(tab_data, sample_ids))
        res = projector.transform(tabular=(tab_data, sample_ids))

        self.assertIsInstance(res, UnifiedRepresentation)
        self.assertEqual(res.representation.shape, (5, 10))
        self.assertEqual(res.representation.dtype, np.float64)
        self.assertTrue(np.isfinite(res.representation).all())
        np.testing.assert_array_equal(res.modality_presence[:, 0], True)
        np.testing.assert_array_equal(res.modality_presence[:, 1], False)
        np.testing.assert_array_equal(res.modality_presence[:, 2], False)

    # -------------------------------------------------------------
    # Test 2 — Tabular + Real TorchXRayVision 2D
    # -------------------------------------------------------------
    def test_tabular_plus_torchxrayvision_projection(self):
        tab_data = np.random.randn(3, 8).astype(np.float64)
        sample_ids = ["P_001", "P_002", "P_003"]

        cfg_2d = Imaging2DConfig(encoder_name="torchxrayvision")
        pipeline_2d = Imaging2DPipeline(config=cfg_2d, encoder=TorchXRayVisionEncoder(config=cfg_2d, weights=None))
        rep_2d = pipeline_2d.process_batch([self.cxr_path] * 3, sample_ids=sample_ids)

        self.assertEqual(rep_2d.embeddings.shape, (3, 1024))

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=(tab_data, sample_ids), image_2d=rep_2d)
        res = projector.transform(tabular=(tab_data, sample_ids), image_2d=rep_2d)

        self.assertEqual(res.representation.shape, (3, 10))
        self.assertTrue(np.isfinite(res.representation).all())
        np.testing.assert_array_equal(res.modality_presence[:, 0], True)
        np.testing.assert_array_equal(res.modality_presence[:, 1], True)

    # -------------------------------------------------------------
    # Test 3 — Tabular + Real MedicalNet 3D
    # -------------------------------------------------------------
    def test_tabular_plus_medicalnet_projection(self):
        tab_data = np.random.randn(3, 8).astype(np.float64)
        sample_ids = ["P_001", "P_002", "P_003"]

        cfg_3d = Imaging3DConfig(encoder_name="medicalnet", modality="mri", target_shape=(32, 32, 32))
        pipeline_3d = Imaging3DPipeline(config=cfg_3d, encoder=MedicalNet3DEncoder(config=cfg_3d))
        rep_3d = pipeline_3d.process_batch([self.mri_path] * 3, sample_ids=sample_ids)

        self.assertEqual(rep_3d.embeddings.shape, (3, 512))

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=(tab_data, sample_ids), image_3d=rep_3d)
        res = projector.transform(tabular=(tab_data, sample_ids), image_3d=rep_3d)

        self.assertEqual(res.representation.shape, (3, 10))
        self.assertTrue(np.isfinite(res.representation).all())
        np.testing.assert_array_equal(res.modality_presence[:, 0], True)
        np.testing.assert_array_equal(res.modality_presence[:, 2], True)

    # -------------------------------------------------------------
    # Test 4 — All Modalities (Tabular + TorchXRayVision 2D + MedicalNet 3D)
    # -------------------------------------------------------------
    def test_all_modalities_unified_projection(self):
        sample_ids = ["P_101", "P_102"]
        tab_data = np.random.randn(2, 6).astype(np.float64)

        cfg_2d = Imaging2DConfig(encoder_name="torchxrayvision")
        pipeline_2d = Imaging2DPipeline(config=cfg_2d, encoder=TorchXRayVisionEncoder(config=cfg_2d, weights=None))
        rep_2d = pipeline_2d.process_batch([self.cxr_path] * 2, sample_ids=sample_ids)

        cfg_3d = Imaging3DConfig(encoder_name="medicalnet", modality="mri", target_shape=(32, 32, 32))
        pipeline_3d = Imaging3DPipeline(config=cfg_3d, encoder=MedicalNet3DEncoder(config=cfg_3d))
        rep_3d = pipeline_3d.process_batch([self.mri_path] * 2, sample_ids=sample_ids)

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=(tab_data, sample_ids), image_2d=rep_2d, image_3d=rep_3d)
        res = projector.transform(tabular=(tab_data, sample_ids), image_2d=rep_2d, image_3d=rep_3d)

        self.assertEqual(res.representation.shape, (2, 10))
        self.assertTrue(np.isfinite(res.representation).all())
        self.assertTrue(res.modality_presence.all())

    # -------------------------------------------------------------
    # Test 5 & 6 & 7 — Missing Modalities & Mask Handling
    # -------------------------------------------------------------
    def test_missing_modality_presence_masks(self):
        sample_ids = ["P_A", "P_B"]
        tab_data = np.random.randn(2, 5).astype(np.float64)

        cfg_2d = Imaging2DConfig(encoder_name="torchxrayvision")
        pipeline_2d = Imaging2DPipeline(config=cfg_2d, encoder=TorchXRayVisionEncoder(config=cfg_2d, weights=None))
        rep_2d_single = pipeline_2d.process_batch([self.cxr_path], sample_ids=["P_A"])

        batch = align_multimodal_inputs(tabular=(tab_data, sample_ids), image_2d=rep_2d_single)

        self.assertTrue(batch.presence_mask[0, 0])  # P_A has tab
        self.assertTrue(batch.presence_mask[0, 1])  # P_A has 2D
        self.assertFalse(batch.presence_mask[0, 2]) # P_A no 3D

        self.assertTrue(batch.presence_mask[1, 0])  # P_B has tab
        self.assertFalse(batch.presence_mask[1, 1]) # P_B no 2D
        self.assertFalse(batch.presence_mask[1, 2]) # P_B no 3D

    # -------------------------------------------------------------
    # Test 8 — Shuffled Sample ID Alignment
    # -------------------------------------------------------------
    def test_shuffled_sample_id_alignment(self):
        tab_ids = ["P_1", "P_2", "P_3"]
        tab_data = np.array([[10.0], [20.0], [30.0]], dtype=np.float64)

        img2d_ids = ["P_3", "P_1", "P_2"]
        img2d_data = np.array([[300.0], [100.0], [200.0]], dtype=np.float64)

        batch = align_multimodal_inputs(
            tabular=(tab_data, tab_ids),
            image_2d=(img2d_data, img2d_ids),
            sample_ids=["P_1", "P_2", "P_3"],
        )

        np.testing.assert_array_equal(batch.tabular, [[10.0], [20.0], [30.0]])
        np.testing.assert_array_equal(batch.image_2d, [[100.0], [200.0], [300.0]])

    # -------------------------------------------------------------
    # Test 9 — Pretrained TorchXRayVision 2D Dimension Check (1024-D)
    # -------------------------------------------------------------
    def test_real_pretrained_xray_dimension(self):
        encoder = TorchXRayVisionEncoder(weights=None)
        self.assertEqual(encoder.embedding_dim, 1024)

    # -------------------------------------------------------------
    # Test 10 — Pretrained MedicalNet 3D Dimension Check (512-D)
    # -------------------------------------------------------------
    def test_real_pretrained_medicalnet_dimension(self):
        encoder = MedicalNet3DEncoder()
        self.assertEqual(encoder.embedding_dim, 512)
        self.assertEqual(encoder.matched_param_count, 72)

    # -------------------------------------------------------------
    # Test 11 & 12 — Finite Output and Exact 10-D Latent Dimension
    # -------------------------------------------------------------
    def test_finite_output_exact_10d_dimension(self):
        tab_data = np.random.randn(4, 10).astype(np.float64)
        sample_ids = [f"S_{i}" for i in range(4)]

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=(tab_data, sample_ids))
        res = projector.transform(tabular=(tab_data, sample_ids))

        self.assertEqual(res.representation.shape, (4, 10))
        self.assertTrue(np.isfinite(res.representation).all())

    # -------------------------------------------------------------
    # Test 13 — Stage 8 Determinism
    # -------------------------------------------------------------
    def test_stage8_determinism(self):
        tab_data = np.random.randn(3, 5).astype(np.float64)
        sample_ids = ["S_1", "S_2", "S_3"]

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca", random_state=42))
        projector.fit(tabular=(tab_data, sample_ids))

        res1 = projector.transform(tabular=(tab_data, sample_ids))
        res2 = projector.transform(tabular=(tab_data, sample_ids))

        np.testing.assert_array_almost_equal(res1.representation, res2.representation)

    # -------------------------------------------------------------
    # Test 14 — Serialization Round-Trip (Save / Load)
    # -------------------------------------------------------------
    def test_serialization_round_trip(self):
        tab_data = np.random.randn(4, 6).astype(np.float64)
        sample_ids = [f"SERIAL_{i}" for i in range(4)]

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=(tab_data, sample_ids))

        save_path = self.temp_path / "projector_stage8.pt"
        projector.save(save_path)

        loaded_projector = Unified10DProjector.load(save_path)
        res_loaded = loaded_projector.transform(tabular=(tab_data, sample_ids))

        res_orig = projector.transform(tabular=(tab_data, sample_ids))
        np.testing.assert_array_almost_equal(res_orig.representation, res_loaded.representation)

    # -------------------------------------------------------------
    # Test 15 — Full Sandwich Boundary Integration Test (Stage 8 -> Stage 9 -> Quantum Core)
    # -------------------------------------------------------------
    def test_full_sandwich_boundary_numerical_flow(self):
        sample_ids = ["PATIENT_Q01", "PATIENT_Q02"]
        tab_data = np.random.randn(2, 6).astype(np.float64)

        cfg_2d = Imaging2DConfig(encoder_name="torchxrayvision")
        pipeline_2d = Imaging2DPipeline(config=cfg_2d, encoder=TorchXRayVisionEncoder(config=cfg_2d, weights=None))
        rep_2d = pipeline_2d.process_batch([self.cxr_path] * 2, sample_ids=sample_ids)

        cfg_3d = Imaging3DConfig(encoder_name="medicalnet", modality="mri", target_shape=(32, 32, 32))
        pipeline_3d = Imaging3DPipeline(config=cfg_3d, encoder=MedicalNet3DEncoder(config=cfg_3d))
        rep_3d = pipeline_3d.process_batch([self.mri_path] * 2, sample_ids=sample_ids)

        # Stage 8: Multimodal Unified 10-D Projection
        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=(tab_data, sample_ids), image_2d=rep_2d, image_3d=rep_3d)
        stage8_res = projector.transform(tabular=(tab_data, sample_ids), image_2d=rep_2d, image_3d=rep_3d)

        self.assertEqual(stage8_res.representation.shape, (2, 10))

        # Stage 9: Quantum Handoff Adapter mapping z -> theta in [-pi, pi]^10
        handoff_adapter = QuantumHandoffAdapter()
        angles_tensor = handoff_adapter.prepare_quantum_input(stage8_res.representation)

        self.assertEqual(angles_tensor.shape, (2, 10))
        self.assertTrue(torch.isfinite(angles_tensor).all())

        # Existing Immutable Quantum Model Execution (DressedVQC)
        probs, angles = handoff_adapter.execute_quantum_model(stage8_res.representation)

        self.assertEqual(probs.shape, (2, 2))
        self.assertTrue(torch.isfinite(probs).all())
        torch.testing.assert_close(probs.sum(dim=1), torch.tensor([1.0, 1.0]))

    # -------------------------------------------------------------
    # Test 16 — Protected Files Integrity Verification
    # -------------------------------------------------------------
    def test_protected_files_integrity(self):
        for name, path in self.protected_files.items():
            self.assertTrue(path.exists(), f"Protected artifact {path} is missing!")
            cur_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(self.initial_hashes[name], cur_hash)


if __name__ == "__main__":
    unittest.main()
