"""
Unit tests for Phase 1 Stage 7 3D Volumetric Medical Imaging Pipeline.
"""

import tempfile
import unittest
from pathlib import Path
import nibabel as nib
import numpy as np
import torch

from classical_preprocessing.imaging_3d import (
    Imaging3DConfig,
    Imaging3DPipeline,
    LightweightMedical3DEncoder,
    MedicalNet3DEncoder,
    Volume3DData,
    VolumeRepresentation,
    VolumeValidationReport,
    load_3d_volume,
    preprocess_3d_volume,
    validate_3d_volume,
)


class TestPhase13DImaging(unittest.TestCase):

    def setUp(self):
        np.random.seed(42)
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

        # Create valid synthetic 3D NIfTI file
        self.nii_path = self.temp_path / "brain_mri_test.nii.gz"
        synthetic_vol = np.random.randn(30, 40, 50).astype(np.float32)
        affine = np.eye(4, dtype=np.float64)
        nii_img = nib.Nifti1Image(synthetic_vol, affine)
        nib.save(nii_img, str(self.nii_path))

        # Create corrupt volume file
        self.corrupt_nii_path = self.temp_path / "corrupt_volume.nii.gz"
        with open(self.corrupt_nii_path, "wb") as f:
            f.write(b"NOT_A_VALID_NIFTI_FILE_DATA_99999")

    def tearDown(self):
        self.temp_dir.cleanup()

    # -------------------------------------------------------------
    # Test 1 — Valid 3D Volume Validation
    # -------------------------------------------------------------
    def test_valid_3d_volume_validation(self):
        report = validate_3d_volume(self.nii_path)
        self.assertIsInstance(report, VolumeValidationReport)
        self.assertTrue(report.is_valid)
        self.assertEqual(report.file_format, "NIfTI")
        self.assertEqual(report.original_shape, (30, 40, 50))

    # -------------------------------------------------------------
    # Test 2 — Invalid Dimensionality (2D Rejection)
    # -------------------------------------------------------------
    def test_2d_matrix_rejection(self):
        arr_2d = np.random.randn(50, 50).astype(np.float32)
        report = validate_3d_volume(arr_2d)
        self.assertFalse(report.is_valid)
        self.assertIn("cannot be silently treated as 3D volume", report.errors[0])

    # -------------------------------------------------------------
    # Test 3 — Corrupt File Rejection
    # -------------------------------------------------------------
    def test_corrupt_volume_rejection(self):
        report = validate_3d_volume(self.corrupt_nii_path)
        self.assertFalse(report.is_valid)
        self.assertIn("Corrupt or unreadable", report.errors[0])

    # -------------------------------------------------------------
    # Test 4 — Non-Finite Value Rejection
    # -------------------------------------------------------------
    def test_non_finite_value_rejection(self):
        vol_bad = np.random.randn(20, 20, 20).astype(np.float32)
        vol_bad[5, 5, 5] = np.nan
        report = validate_3d_volume(vol_bad)
        self.assertFalse(report.is_valid)
        self.assertIn("contains NaN or Inf", report.errors[0])

    # -------------------------------------------------------------
    # Test 5 — Metadata Extraction & Spacing Retention
    # -------------------------------------------------------------
    def test_metadata_extraction(self):
        vol_data = load_3d_volume(self.nii_path)
        self.assertIsInstance(vol_data, Volume3DData)
        self.assertEqual(vol_data.orientation, "RAS")
        self.assertEqual(len(vol_data.voxel_spacing), 3)

    # -------------------------------------------------------------
    # Test 6 — Resampling & Volumetric Shape Formatting
    # -------------------------------------------------------------
    def test_volumetric_resampling(self):
        config = Imaging3DConfig(target_shape=(32, 32, 32))
        tensor_4d, meta = preprocess_3d_volume(self.nii_path, config=config)

        self.assertEqual(tensor_4d.shape, (1, 32, 32, 32))
        self.assertEqual(tensor_4d.dtype, torch.float32)

    # -------------------------------------------------------------
    # Test 7 — MRI Normalization
    # -------------------------------------------------------------
    def test_mri_zscore_normalization(self):
        config = Imaging3DConfig(modality="mri", target_shape=(32, 32, 32))
        tensor_4d, meta = preprocess_3d_volume(self.nii_path, config=config)

        self.assertEqual(meta["modality"], "mri")
        self.assertTrue(torch.isfinite(tensor_4d).all())

    # -------------------------------------------------------------
    # Test 8 — CT HU Windowing Normalization
    # -------------------------------------------------------------
    def test_ct_hu_windowing(self):
        ct_vol = np.random.uniform(-1000, 1000, size=(20, 20, 20)).astype(np.float32)
        config = Imaging3DConfig(modality="ct", ct_window_center=40.0, ct_window_width=400.0, target_shape=(16, 16, 16))

        tensor_4d, meta = preprocess_3d_volume(ct_vol, config=config)

        self.assertEqual(meta["modality"], "ct")
        self.assertGreaterEqual(float(tensor_4d.min()), 0.0)
        self.assertLessEqual(float(tensor_4d.max()), 1.0)

    # -------------------------------------------------------------
    # Test 9 — Deterministic Preprocessing & Extraction
    # -------------------------------------------------------------
    def test_preprocessing_determinism(self):
        config = Imaging3DConfig(target_shape=(32, 32, 32), random_state=42)
        t1, _ = preprocess_3d_volume(self.nii_path, config=config)
        t2, _ = preprocess_3d_volume(self.nii_path, config=config)

        torch.testing.assert_close(t1, t2)

    # -------------------------------------------------------------
    # Test 10 — Batch Processing & Ordering Preservation
    # -------------------------------------------------------------
    def test_batch_processing_ordering(self):
        config = Imaging3DConfig(batch_size=2, embedding_dim=512)
        pipeline = Imaging3DPipeline(config=config)

        vols = [self.nii_path, self.nii_path, self.nii_path]
        sample_ids = ["MRI_001", "MRI_002", "MRI_003"]

        result = pipeline.process_batch(vols, sample_ids=sample_ids)

        self.assertIsInstance(result, VolumeRepresentation)
        self.assertEqual(result.embeddings.shape, (3, 512))
        self.assertEqual(result.sample_ids, sample_ids)
        self.assertEqual(result.embedding_dim, 512)

    # -------------------------------------------------------------
    # Test 11 — Patient ID & Metadata Separation
    # -------------------------------------------------------------
    def test_sample_id_metadata_separation(self):
        pipeline = Imaging3DPipeline()
        result = pipeline.process_volume(self.nii_path, sample_id="SECRET_PATIENT_3D_777")

        self.assertIn("SECRET_PATIENT_3D_777", result.sample_ids)
        self.assertEqual(result.embeddings.shape, (1, 512))

    # -------------------------------------------------------------
    # Test 12 — Encoder Interface Modularity
    # -------------------------------------------------------------
    def test_3d_encoder_interface_modularity(self):
        config = Imaging3DConfig(embedding_dim=256)
        encoder = LightweightMedical3DEncoder(config=config)

        batch_tensor = torch.randn(2, 1, 32, 32, 32)
        emb = encoder.encode(batch_tensor)

        self.assertEqual(emb.shape, (2, 256))
        self.assertEqual(encoder.embedding_dim, 256)

    # -------------------------------------------------------------
    # Test 13 — Finite Embedding Guarantee
    # -------------------------------------------------------------
    def test_finite_embedding_guarantee(self):
        pipeline = Imaging3DPipeline()
        result = pipeline.process_volume(self.nii_path)

        self.assertTrue(np.isfinite(result.embeddings).all())
        self.assertEqual(result.embeddings.dtype, np.float32)

    # -------------------------------------------------------------
    # Test 14 — CPU Execution Safety
    # -------------------------------------------------------------
    def test_cpu_execution_safety(self):
        config = Imaging3DConfig(device="cpu")
        pipeline = Imaging3DPipeline(config=config)

        result = pipeline.process_volume(self.nii_path)
        self.assertEqual(result.embeddings.shape[0], 1)

    # -------------------------------------------------------------
    # Test 15 — MedicalNet 3D Encoder Initialization
    # -------------------------------------------------------------
    def test_medicalnet_encoder_initialization(self):
        config = Imaging3DConfig(encoder_name="medicalnet")
        encoder = MedicalNet3DEncoder(config=config)
        self.assertEqual(encoder.embedding_dim, 512)


if __name__ == "__main__":
    unittest.main()
