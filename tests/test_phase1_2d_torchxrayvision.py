"""
Unit tests for TorchXRayVision 2D Medical Imaging Integration in HQD-Net Stage 6.
"""

import hashlib
import tempfile
import unittest
from pathlib import Path
import numpy as np
from PIL import Image
import torch

from classical_preprocessing import (
    ImageRepresentation,
    Imaging2DConfig,
    Imaging2DPipeline,
    TorchXRayVisionEncoder,
    Unified10DProjector,
    UnifiedProjectionConfig,
)


class TestPhase12DTorchXRayVision(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

        # Create synthetic chest X-ray image (224x224 grayscale PNG)
        self.cxr_path = self.temp_path / "synthetic_cxr.png"
        img_arr = (np.random.rand(224, 224) * 255).astype(np.uint8)
        Image.fromarray(img_arr).save(self.cxr_path)

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
    # Test 1 — Encoder Initialization & Model Loading
    # -------------------------------------------------------------
    def test_encoder_initialization(self):
        cfg = Imaging2DConfig(encoder_name="torchxrayvision")
        encoder = TorchXRayVisionEncoder(config=cfg, weights=None)
        self.assertEqual(encoder.embedding_dim, 1024)

    # -------------------------------------------------------------
    # Test 2 — Single Image Embedding Contract (1, 1024)
    # -------------------------------------------------------------
    def test_single_image_embedding(self):
        cfg = Imaging2DConfig(encoder_name="torchxrayvision")
        pipeline = Imaging2DPipeline(config=cfg, encoder=TorchXRayVisionEncoder(config=cfg, weights=None))

        rep = pipeline.process_image(self.cxr_path, sample_id="CXR_001")

        self.assertIsInstance(rep, ImageRepresentation)
        self.assertEqual(rep.embeddings.shape, (1, 1024))
        self.assertEqual(rep.embeddings.dtype, np.float64)
        self.assertTrue(np.isfinite(rep.embeddings).all())

    # -------------------------------------------------------------
    # Test 3 — Batch Image Embedding Contract (N, 1024)
    # -------------------------------------------------------------
    def test_batch_image_embedding(self):
        cfg = Imaging2DConfig(encoder_name="torchxrayvision")
        pipeline = Imaging2DPipeline(config=cfg, encoder=TorchXRayVisionEncoder(config=cfg, weights=None))

        paths = [self.cxr_path, self.cxr_path, self.cxr_path]
        sample_ids = ["CXR_001", "CXR_002", "CXR_003"]

        rep = pipeline.process_batch(paths, sample_ids=sample_ids)

        self.assertEqual(rep.embeddings.shape, (3, 1024))
        self.assertEqual(rep.sample_ids, sample_ids)
        self.assertTrue(np.isfinite(rep.embeddings).all())

    # -------------------------------------------------------------
    # Test 4 — Pretrained Feature Map Normalization Range
    # -------------------------------------------------------------
    def test_intensity_scaling_contract(self):
        encoder = TorchXRayVisionEncoder(weights=None)
        # Pass float tensor in range [0, 1]
        x_unit = torch.rand(2, 1, 224, 224, dtype=torch.float32)
        out = encoder.encode(x_unit)

        self.assertEqual(out.shape, (2, 1024))
        self.assertTrue(np.isfinite(out).all())

    # -------------------------------------------------------------
    # Test 5 — Deterministic Inference
    # -------------------------------------------------------------
    def test_deterministic_inference(self):
        cfg = Imaging2DConfig(encoder_name="torchxrayvision")
        pipeline = Imaging2DPipeline(config=cfg, encoder=TorchXRayVisionEncoder(config=cfg, weights=None))

        rep1 = pipeline.process_image(self.cxr_path, sample_id="CXR_DET")
        rep2 = pipeline.process_image(self.cxr_path, sample_id="CXR_DET")

        np.testing.assert_array_almost_equal(rep1.embeddings, rep2.embeddings)

    # -------------------------------------------------------------
    # Test 6 — Invalid Image Dimension Rejection
    # -------------------------------------------------------------
    def test_invalid_image_dimension_rejection(self):
        encoder = TorchXRayVisionEncoder(weights=None)
        x_3d = torch.rand(1, 224, 224, dtype=torch.float32)

        with self.assertRaises(ValueError):
            encoder.encode(x_3d)

    # -------------------------------------------------------------
    # Test 7 — Stage 8 Unified Projection Compatibility
    # -------------------------------------------------------------
    def test_stage8_unified_projection_compatibility(self):
        cfg_2d = Imaging2DConfig(encoder_name="torchxrayvision")
        pipeline_2d = Imaging2DPipeline(config=cfg_2d, encoder=TorchXRayVisionEncoder(config=cfg_2d, weights=None))

        rep_2d = pipeline_2d.process_image(self.cxr_path, sample_id="CXR_STAGE8")

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(image_2d=rep_2d)
        proj_res = projector.transform(image_2d=rep_2d)

        self.assertEqual(proj_res.representation.shape, (1, 10))
        self.assertEqual(proj_res.representation.dtype, np.float64)
        self.assertTrue(np.isfinite(proj_res.representation).all())

    # -------------------------------------------------------------
    # Test 8 — Immutable Protected Files Verification
    # -------------------------------------------------------------
    def test_protected_files_integrity(self):
        for name, path in self.protected_files.items():
            self.assertTrue(path.exists(), f"Protected artifact {path} is missing!")
            cur_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(self.initial_hashes[name], cur_hash)


if __name__ == "__main__":
    unittest.main()
