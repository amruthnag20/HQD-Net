"""
Unit tests for MONAI 3D Medical Preprocessing & Infrastructure Integration in HQD-Net Stage 7.
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
    Unified10DProjector,
    UnifiedProjectionConfig,
    VolumeRepresentation,
    preprocess_3d_volume,
)


class TestPhase13DMONAI(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

        # Create synthetic NIfTI volume (32x32x32)
        self.nii_path = self.temp_path / "brain_mri.nii.gz"
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
    # Test A — MONAI Package Availability
    # -------------------------------------------------------------
    def test_monai_import(self):
        import monai
        self.assertTrue(hasattr(monai, "__version__"))

    # -------------------------------------------------------------
    # Test B — Synthetic Volume Preprocessing via MONAI
    # -------------------------------------------------------------
    def test_synthetic_volume_monai_preprocessing(self):
        cfg = Imaging3DConfig(modality="mri", target_shape=(32, 32, 32))
        synth_arr = np.random.randn(40, 40, 40).astype(np.float32)

        t_4d, meta = preprocess_3d_volume(synth_arr, config=cfg)

        self.assertEqual(t_4d.shape, (1, 32, 32, 32))
        self.assertTrue(torch.isfinite(t_4d).all())
        self.assertTrue(meta["monai_transforms_applied"])

    # -------------------------------------------------------------
    # Test C — NIfTI File MONAI Preprocessing
    # -------------------------------------------------------------
    def test_nifti_file_monai_preprocessing(self):
        cfg = Imaging3DConfig(modality="mri", target_shape=(32, 32, 32))
        t_4d, meta = preprocess_3d_volume(self.nii_path, config=cfg)

        self.assertEqual(t_4d.shape, (1, 32, 32, 32))
        self.assertTrue(torch.isfinite(t_4d).all())
        self.assertEqual(meta["modality"], "mri")

    # -------------------------------------------------------------
    # Test D — Metadata Preservation (Spacing, Affine, Orientation)
    # -------------------------------------------------------------
    def test_metadata_preservation(self):
        cfg = Imaging3DConfig(modality="mri", target_shape=(32, 32, 32))
        t_4d, meta = preprocess_3d_volume(self.nii_path, config=cfg)

        self.assertIn("original_shape", meta)
        self.assertIn("target_shape", meta)
        self.assertIn("original_spacing", meta)
        self.assertIn("affine", meta)
        self.assertEqual(meta["target_shape"], (32, 32, 32))

    # -------------------------------------------------------------
    # Test E — CT Hounsfield Unit Windowing Path
    # -------------------------------------------------------------
    def test_ct_hu_windowing_path(self):
        cfg = Imaging3DConfig(
            modality="ct",
            ct_window_center=40.0,
            ct_window_width=400.0,
            target_shape=(32, 32, 32),
        )
        ct_arr = np.random.randn(32, 32, 32).astype(np.float32) * 500.0 + 40.0

        t_4d, meta = preprocess_3d_volume(ct_arr, config=cfg)

        self.assertEqual(t_4d.shape, (1, 32, 32, 32))
        self.assertEqual(meta["modality"], "ct")
        self.assertTrue((t_4d >= 0.0).all() and (t_4d <= 1.0).all())

    # -------------------------------------------------------------
    # Test F — MRI Z-score Normalization Path
    # -------------------------------------------------------------
    def test_mri_zscore_normalization_path(self):
        cfg = Imaging3DConfig(modality="mri", target_shape=(32, 32, 32))
        mri_arr = np.random.randn(32, 32, 32).astype(np.float32) * 10.0 + 100.0

        t_4d, meta = preprocess_3d_volume(mri_arr, config=cfg)

        self.assertEqual(t_4d.shape, (1, 32, 32, 32))
        self.assertEqual(meta["modality"], "mri")
        self.assertTrue(torch.isfinite(t_4d).all())

    # -------------------------------------------------------------
    # Test G — Unknown Modality Safety Check
    # -------------------------------------------------------------
    def test_unknown_modality_rejection(self):
        cfg = Imaging3DConfig(modality="unknown", target_shape=(32, 32, 32))
        synth_arr = np.random.randn(32, 32, 32).astype(np.float32)

        with self.assertRaises(ValueError):
            preprocess_3d_volume(synth_arr, config=cfg)

    # -------------------------------------------------------------
    # Test H — Determinism Verification
    # -------------------------------------------------------------
    def test_monai_pipeline_determinism(self):
        cfg = Imaging3DConfig(modality="mri", target_shape=(32, 32, 32))
        synth_arr = np.random.randn(32, 32, 32).astype(np.float32)

        t1, _ = preprocess_3d_volume(synth_arr, config=cfg)
        t2, _ = preprocess_3d_volume(synth_arr, config=cfg)

        torch.testing.assert_close(t1, t2)

    # -------------------------------------------------------------
    # Test I — Batch Volume Processing
    # -------------------------------------------------------------
    def test_batch_volume_processing(self):
        cfg = Imaging3DConfig(modality="mri", target_shape=(32, 32, 32))
        pipeline = Imaging3DPipeline(config=cfg)

        inputs = [self.nii_path, self.nii_path]
        sample_ids = ["VOL_001", "VOL_002"]

        rep = pipeline.process_batch(inputs, sample_ids=sample_ids)

        self.assertIsInstance(rep, VolumeRepresentation)
        self.assertEqual(rep.embeddings.shape, (2, 512))
        self.assertEqual(rep.sample_ids, sample_ids)

    # -------------------------------------------------------------
    # Test J — Invalid non-finite values handling
    # -------------------------------------------------------------
    def test_non_finite_volume_rejection(self):
        cfg = Imaging3DConfig(modality="mri", target_shape=(32, 32, 32))
        bad_arr = np.random.randn(32, 32, 32).astype(np.float32)
        bad_arr[0, 0, 0] = np.nan

        with self.assertRaises(ValueError):
            preprocess_3d_volume(bad_arr, config=cfg)

    # -------------------------------------------------------------
    # Test K — Stage 8 Unified Projection Compatibility
    # -------------------------------------------------------------
    def test_stage8_unified_projection_compatibility(self):
        cfg = Imaging3DConfig(modality="mri", target_shape=(32, 32, 32))
        pipeline_3d = Imaging3DPipeline(config=cfg)

        rep_3d = pipeline_3d.process_volume(self.nii_path, sample_id="VOL_STAGE8")

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(image_3d=rep_3d)
        proj_res = projector.transform(image_3d=rep_3d)

        self.assertEqual(proj_res.representation.shape, (1, 10))
        self.assertEqual(proj_res.representation.dtype, np.float64)
        self.assertTrue(np.isfinite(proj_res.representation).all())

    # -------------------------------------------------------------
    # Test L — Immutable Protected Files Verification
    # -------------------------------------------------------------
    def test_protected_files_integrity(self):
        for name, path in self.protected_files.items():
            self.assertTrue(path.exists(), f"Protected artifact {path} is missing!")
            cur_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(self.initial_hashes[name], cur_hash)


if __name__ == "__main__":
    unittest.main()
