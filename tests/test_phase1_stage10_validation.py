"""
Phase 1 Stage 10 Comprehensive End-to-End Validation & Readiness Check.
"""

import hashlib
import math
import tempfile
import unittest
from pathlib import Path
import nibabel as nib
import numpy as np
from PIL import Image
import torch

from classical_preprocessing import (
    Imaging2DPipeline,
    Imaging3DConfig,
    Imaging3DPipeline,
    InputRouter,
    MultiSignalFeatureSelector,
    ProcessingPath,
    QuantumHandoffAdapter,
    TabularCompressionResult,
    TabularCompressor,
    TabularPreprocessingPipeline,
    Unified10DProjector,
    UnifiedProjectionConfig,
)


class TestPhase1Stage10Validation(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

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

        # Create synthetic 2D image file (224x224 grayscale PNG)
        self.img2d_path = self.temp_path / "sample_xray.png"
        img_arr = (np.random.rand(224, 224) * 255).astype(np.uint8)
        Image.fromarray(img_arr).save(self.img2d_path)

        # Create synthetic 3D NIfTI volume file (32x32x32)
        self.img3d_path = self.temp_path / "sample_brain.nii.gz"
        vol_arr = np.random.randn(32, 32, 32).astype(np.float32)
        nii_img = nib.Nifti1Image(vol_arr, affine=np.eye(4))
        nib.save(nii_img, self.img3d_path)

    def tearDown(self):
        # Enforce protected file immutability check
        for name, path in self.protected_files.items():
            if path.exists() and name in self.initial_hashes:
                current_hash = hashlib.sha256(path.read_bytes()).hexdigest()
                self.assertEqual(
                    self.initial_hashes[name],
                    current_hash,
                    f"CRITICAL REGRESSION: Protected artifact {path} was modified!",
                )
        self.temp_dir.cleanup()

    # -------------------------------------------------------------
    # Test 1 — End-to-End Tabular Pipeline (Real CSV Data)
    # -------------------------------------------------------------
    def test_e2e_tabular_pipeline_with_real_csv(self):
        csv_path = Path("clinical_data_synthetic.csv")
        if not csv_path.exists():
            csv_path = Path("data/processed/clinical_data_synthetic.csv")
        self.assertTrue(csv_path.exists(), "clinical_data_synthetic.csv must exist in repository root or data/processed.")

        # Step 2: Router Dispatch
        router = InputRouter()
        decision = router.route(csv_path)
        self.assertEqual(decision.processing_path, ProcessingPath.TABULAR)

        # Step 3: Tabular Ingestion & Preprocessing
        tab_pipeline = TabularPreprocessingPipeline()
        tab_res = tab_pipeline.fit_transform(csv_path)
        self.assertGreater(tab_res.processed_features.shape[1], 0)

        # Step 4: Multi-Signal Feature Selection
        selector = MultiSignalFeatureSelector()
        sel_res = selector.fit_transform(tab_res.processed_features, y=tab_res.target)
        self.assertGreater(sel_res.selected_features.shape[1], 0)

        # Step 5: Tabular Compression
        compressor = TabularCompressor()
        comp_res = compressor.fit_transform(sel_res.selected_features, feature_names=sel_res.selected_feature_names)
        self.assertIsInstance(comp_res, TabularCompressionResult)

        # Step 8: Unified 10-D Projection
        projector = Unified10DProjector()
        projector.fit(tabular=comp_res.compressed_features, y=tab_res.target)
        proj_res = projector.transform(tabular=comp_res.compressed_features)

        self.assertEqual(proj_res.representation.shape, (len(tab_res.processed_features), 10))
        self.assertEqual(proj_res.representation.dtype, np.float64)

        # Step 9: Quantum Handoff & Immutable VQC Execution
        handoff = QuantumHandoffAdapter()
        probs, theta = handoff.execute_quantum_model(proj_res.representation)

        self.assertEqual(probs.shape, (len(tab_res.processed_features), 2))
        self.assertEqual(theta.shape, (len(tab_res.processed_features), 10))
        self.assertEqual(theta.dtype, torch.float64)
        self.assertTrue((theta >= -math.pi).all() and (theta <= math.pi).all())
        self.assertTrue(torch.isfinite(probs).all())

    # -------------------------------------------------------------
    # Test 2 — End-to-End Multimodal Pipeline (Tabular + 2D + 3D)
    # -------------------------------------------------------------
    def test_e2e_multimodal_fusion_pipeline(self):
        sample_ids = ["PAT_0001"]

        # Stage 3: Tabular branch
        tab_matrix = np.random.randn(1, 10).astype(np.float64)

        # Stage 6: 2D Imaging branch
        pipeline_2d = Imaging2DPipeline()
        rep_2d = pipeline_2d.process_image(self.img2d_path, sample_id=sample_ids[0])
        self.assertEqual(rep_2d.embeddings.shape, (1, 768))

        # Stage 7: 3D Imaging branch
        cfg_3d = Imaging3DConfig(modality="MRI")
        pipeline_3d = Imaging3DPipeline(config=cfg_3d)
        rep_3d = pipeline_3d.process_volume(self.img3d_path, sample_id=sample_ids[0])
        self.assertEqual(rep_3d.embeddings.shape, (1, 512))

        # Stage 8: Unified 10-D Projection
        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(
            tabular=(tab_matrix, sample_ids),
            image_2d=rep_2d,
            image_3d=rep_3d,
        )
        proj_res = projector.transform(
            tabular=(tab_matrix, sample_ids),
            image_2d=rep_2d,
            image_3d=rep_3d,
        )

        self.assertEqual(proj_res.representation.shape, (1, 10))

        # Stage 9: Quantum Handoff & Immutable VQC Execution
        handoff = QuantumHandoffAdapter()
        probs, theta = handoff.execute_quantum_model(proj_res.representation)

        self.assertEqual(probs.shape, (1, 2))
        self.assertEqual(theta.shape, (1, 10))
        self.assertEqual(theta.dtype, torch.float64)
        self.assertTrue((theta >= -math.pi).all() and (theta <= math.pi).all())
        self.assertTrue(torch.isfinite(probs).all())

    # -------------------------------------------------------------
    # Test 3 — Data Leakage & Train / Test Isolation Verification
    # -------------------------------------------------------------
    def test_data_leakage_and_train_test_isolation(self):
        csv_path = Path("clinical_data_synthetic.csv")
        if not csv_path.exists():
            csv_path = Path("data/processed/clinical_data_synthetic.csv")
        tab_pipeline = TabularPreprocessingPipeline()
        tab_res = tab_pipeline.fit_transform(csv_path)

        n_tot = tab_res.processed_features.shape[0]
        id_key = list(tab_res.traceability_metadata.keys())[0] if tab_res.traceability_metadata else None
        sample_ids = tab_res.traceability_metadata[id_key] if id_key else [f"PAT_{i:04d}" for i in range(n_tot)]

        n_tr = int(n_tot * 0.7)

        # Split tabular data
        matrix_tr = tab_res.processed_features[:n_tr]
        matrix_te = tab_res.processed_features[n_tr:]

        ids_tr = sample_ids[:n_tr]
        ids_te = sample_ids[n_tr:]

        y_tr = tab_res.target[:n_tr]

        # Fit Stage 8 Projector on training set ONLY
        projector = Unified10DProjector()
        projector.fit(tabular=(matrix_tr, ids_tr), y=y_tr)

        weight_tr_snapshot = projector.model.fusion_mlp[3].weight.clone()

        # Transform holdout test set WITHOUT refitting
        test_proj = projector.transform(tabular=(matrix_te, ids_te))
        weight_te_snapshot = projector.model.fusion_mlp[3].weight.clone()

        # Verify weights were not modified during inference
        torch.testing.assert_close(weight_tr_snapshot, weight_te_snapshot)
        self.assertEqual(test_proj.representation.shape, (len(ids_te), 10))

    # -------------------------------------------------------------
    # Test 4 — End-to-End Pipeline Determinism
    # -------------------------------------------------------------
    def test_e2e_pipeline_determinism(self):
        sample_ids = ["PAT_0001"]
        tab_matrix = np.random.randn(1, 10).astype(np.float64)

        pipeline_2d = Imaging2DPipeline()
        rep_2d = pipeline_2d.process_image(self.img2d_path, sample_id=sample_ids[0])

        # Run Pass 1
        p1 = Unified10DProjector(config=UnifiedProjectionConfig(random_state=42, projection_method="unsupervised_pca"))
        p1.fit(tabular=(tab_matrix, sample_ids), image_2d=rep_2d)
        res1 = p1.transform(tabular=(tab_matrix, sample_ids), image_2d=rep_2d)

        handoff1 = QuantumHandoffAdapter()
        probs1, theta1 = handoff1.execute_quantum_model(res1.representation)

        # Run Pass 2
        p2 = Unified10DProjector(config=UnifiedProjectionConfig(random_state=42, projection_method="unsupervised_pca"))
        p2.fit(tabular=(tab_matrix, sample_ids), image_2d=rep_2d)
        res2 = p2.transform(tabular=(tab_matrix, sample_ids), image_2d=rep_2d)

        handoff2 = QuantumHandoffAdapter()
        probs2, theta2 = handoff2.execute_quantum_model(res2.representation)

        np.testing.assert_array_almost_equal(res1.representation, res2.representation)
        torch.testing.assert_close(theta1, theta2)
        torch.testing.assert_close(probs1, probs2)

    # -------------------------------------------------------------
    # Test 5 — Protected File Integrity Verification
    # -------------------------------------------------------------
    def test_protected_files_integrity(self):
        for name, path in self.protected_files.items():
            self.assertTrue(path.exists(), f"Protected artifact {path} is missing!")
            cur_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(self.initial_hashes[name], cur_hash)


if __name__ == "__main__":
    unittest.main()
