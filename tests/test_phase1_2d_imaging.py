"""
Unit tests for Phase 1 Stage 6 2D Medical Imaging Pipeline.
"""

import tempfile
import unittest
from pathlib import Path
import numpy as np
from PIL import Image
import torch

from classical_preprocessing.imaging_2d import (
    ImageRepresentation,
    ImageValidationReport,
    Imaging2DConfig,
    Imaging2DPipeline,
    LightweightMedicalEncoder,
    TorchXRayVisionEncoder,
    preprocess_2d_image,
    validate_2d_image,
)


class TestPhase12DImaging(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

        # Create valid synthetic grayscale test image
        self.valid_png_path = self.temp_path / "chest_xray_test.png"
        arr = np.random.randint(0, 256, (300, 400), dtype=np.uint8)
        img = Image.fromarray(arr, mode="L")
        img.save(self.valid_png_path)

        # Create valid synthetic RGB test image
        self.rgb_png_path = self.temp_path / "histology_test.jpg"
        rgb_arr = np.random.randint(0, 256, (200, 200, 3), dtype=np.uint8)
        rgb_img = Image.fromarray(rgb_arr, mode="RGB")
        rgb_img.save(self.rgb_png_path)

        # Create corrupt image file
        self.corrupt_png_path = self.temp_path / "corrupt_image.png"
        with open(self.corrupt_png_path, "wb") as f:
            f.write(b"NOT_AN_IMAGE_FILE_DATA_123456789")

    def tearDown(self):
        self.temp_dir.cleanup()

    # -------------------------------------------------------------
    # Test 1 — Valid Image Loading & Validation
    # -------------------------------------------------------------
    def test_valid_image_validation(self):
        report = validate_2d_image(self.valid_png_path)
        self.assertIsInstance(report, ImageValidationReport)
        self.assertTrue(report.is_valid)
        self.assertEqual(report.file_format, "PNG")
        self.assertEqual(report.original_shape, (300, 400))
        self.assertEqual(report.channel_count, 1)

    # -------------------------------------------------------------
    # Test 2 — Unsupported Extension
    # -------------------------------------------------------------
    def test_unsupported_extension_rejection(self):
        txt_path = self.temp_path / "notes.txt"
        txt_path.write_text("clinical notes")
        report = validate_2d_image(txt_path)
        self.assertFalse(report.is_valid)
        self.assertIn("Unsupported image extension", report.errors[0])

    # -------------------------------------------------------------
    # Test 3 — Corrupt Image Handling
    # -------------------------------------------------------------
    def test_corrupt_image_rejection(self):
        report = validate_2d_image(self.corrupt_png_path)
        self.assertFalse(report.is_valid)
        self.assertIn("Corrupt or unreadable", report.errors[0])

    # -------------------------------------------------------------
    # Test 4 — Grayscale Tensor Normalization
    # -------------------------------------------------------------
    def test_grayscale_normalization(self):
        config = Imaging2DConfig(color_mode="grayscale", target_size=(224, 224))
        tensor, meta = preprocess_2d_image(self.valid_png_path, config=config)

        self.assertEqual(tensor.shape, (1, 224, 224))
        self.assertEqual(tensor.dtype, torch.float32)
        self.assertGreaterEqual(float(tensor.min()), 0.0)
        self.assertLessEqual(float(tensor.max()), 1.0)

    # -------------------------------------------------------------
    # Test 5 — RGB Tensor Handling
    # -------------------------------------------------------------
    def test_rgb_normalization(self):
        config = Imaging2DConfig(color_mode="rgb", target_size=(224, 224))
        tensor, meta = preprocess_2d_image(self.rgb_png_path, config=config)

        self.assertEqual(tensor.shape, (3, 224, 224))
        self.assertEqual(tensor.dtype, torch.float32)

    # -------------------------------------------------------------
    # Test 6 — Resizing Strategy
    # -------------------------------------------------------------
    def test_custom_resizing_dimensions(self):
        config = Imaging2DConfig(target_size=(128, 128), resizing_strategy="letterbox_pad")
        tensor, meta = preprocess_2d_image(self.valid_png_path, config=config)
        self.assertEqual(tensor.shape, (1, 128, 128))

    # -------------------------------------------------------------
    # Test 7 — Deterministic Preprocessing
    # -------------------------------------------------------------
    def test_preprocessing_determinism(self):
        config = Imaging2DConfig(target_size=(224, 224))
        t1, _ = preprocess_2d_image(self.valid_png_path, config=config)
        t2, _ = preprocess_2d_image(self.valid_png_path, config=config)

        torch.testing.assert_close(t1, t2)

    # -------------------------------------------------------------
    # Test 8 — Batch Processing & Ordering Preservation
    # -------------------------------------------------------------
    def test_batch_processing_and_ordering(self):
        config = Imaging2DConfig(batch_size=2, encoder_name="lightweight_cnn", embedding_dim=512)
        pipeline = Imaging2DPipeline(config=config)

        images = [self.valid_png_path, self.rgb_png_path, self.valid_png_path]
        sample_ids = ["PAT_001_XRAY", "PAT_002_HIST", "PAT_003_XRAY"]

        result = pipeline.process_batch(images, sample_ids=sample_ids)

        self.assertIsInstance(result, ImageRepresentation)
        self.assertEqual(result.embeddings.shape, (3, 512))
        self.assertEqual(result.sample_ids, sample_ids)
        self.assertEqual(result.embedding_dim, 512)

    # -------------------------------------------------------------
    # Test 9 — Finite Embeddings Guarantee
    # -------------------------------------------------------------
    def test_finite_embeddings_guarantee(self):
        pipeline = Imaging2DPipeline()
        result = pipeline.process_image(self.valid_png_path)
        self.assertTrue(np.isfinite(result.embeddings).all())
        self.assertEqual(result.embeddings.dtype, np.float32)

    # -------------------------------------------------------------
    # Test 10 — Metadata & Patient ID Separation
    # -------------------------------------------------------------
    def test_sample_id_metadata_separation(self):
        pipeline = Imaging2DPipeline()
        result = pipeline.process_image(self.valid_png_path, sample_id="SECRET_PATIENT_999")

        self.assertIn("SECRET_PATIENT_999", result.sample_ids)
        # Verify sample_id is NOT in numerical matrix
        self.assertEqual(result.embeddings.shape, (1, pipeline.config.embedding_dim))

    # -------------------------------------------------------------
    # Test 11 — Encoder Interface Modularity
    # -------------------------------------------------------------
    def test_encoder_interface_modularity(self):
        config = Imaging2DConfig(embedding_dim=256)
        encoder = LightweightMedicalEncoder(config=config)

        batch_tensor = torch.randn(4, 1, 224, 224)
        emb = encoder.encode(batch_tensor)

        self.assertEqual(emb.shape, (4, 256))
        self.assertEqual(encoder.embedding_dim, 256)

    # -------------------------------------------------------------
    # Test 12 — Missing TorchXRayVision Package Diagnostics
    # -------------------------------------------------------------
    def test_missing_torchxrayvision_diagnostics(self):
        config = Imaging2DConfig(encoder_name="torchxrayvision")
        try:
            encoder = TorchXRayVisionEncoder(config=config)
            # If installed, verify it returns an encoder
            self.assertIsNotNone(encoder)
        except ImportError as e:
            self.assertIn("TorchXRayVision package is not installed", str(e))


if __name__ == "__main__":
    unittest.main()
