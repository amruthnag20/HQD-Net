"""
Forensic Validation Suite for Real Preprocessor -> Quantum Pipeline (Prompt 18).
Performs technical validation of the HQD-Net pipeline from raw input files
(including legacy .xls), real TorchXRayVision DenseNet-121 model execution,
Stage 8 10-D multimodal fusion, Stage 9 quantum handoff, and the frozen VQC.
"""

import hashlib
import tempfile
import unittest
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image
import torch

from classical_preprocessing import (
    InputRouter,
    InputKind,
    ProcessingPath,
    TabularPreprocessingPipeline,
    Imaging2DConfig,
    Imaging2DPipeline,
    TorchXRayVisionEncoder,
    Unified10DProjector,
    UnifiedProjectionConfig,
    QuantumHandoffAdapter,
)


class TestForensicPreprocessorQuantumValidation(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        self.root_dir = Path(__file__).resolve().parent.parent
        self.xls_path = self.root_dir / "raw_clinical_test.xls"
        self.csv_path = self.root_dir / "raw_clinical_test.csv"
        self.xray_path = self.root_dir / "mock_chest_xray.png"

        self.protected_files = {
            "hqd_quantum": self.root_dir / "quantum_core" / "hqd_quantum.py",
            "qsvm_backend": self.root_dir / "quantum_core" / "qsvm_backend.py",
            "vqc_weights": self.root_dir / "quantum_core" / "vqc_model_weights.pth",
        }
        self.initial_hashes = {
            name: hashlib.sha256(path.read_bytes()).hexdigest()
            for name, path in self.protected_files.items()
            if path.exists()
        }

    def tearDown(self):
        for name, path in self.protected_files.items():
            if path.exists() and name in self.initial_hashes:
                cur_hash = hashlib.sha256(path.read_bytes()).hexdigest()
                self.assertEqual(
                    self.initial_hashes[name],
                    cur_hash,
                    f"Protected artifact {path} was modified during test!",
                )

    # -------------------------------------------------------------------------
    # 1. Prove Actual .xls File Path Execution
    # -------------------------------------------------------------------------
    def test_actual_xls_end_to_end(self):
        self.assertTrue(self.xls_path.exists(), f"Required {self.xls_path} asset is missing!")

        # Step 1: Input Router
        router = InputRouter()
        decision = router.route(self.xls_path)
        self.assertEqual(decision.input_kind, InputKind.TABULAR)
        self.assertEqual(decision.processing_path, ProcessingPath.TABULAR)
        self.assertEqual(decision.extension, ".xls")

        # Step 2: Tabular Preprocessing directly from .xls
        df_xls_raw = pd.read_excel(self.xls_path)
        df_xls = df_xls_raw.drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        orig_shape = df_xls.shape

        tab_pipeline = TabularPreprocessingPipeline()
        tab_result = tab_pipeline.fit_transform(df_xls)
        post_cleaning_shape = tab_result.processed_features.shape

        self.assertEqual(post_cleaning_shape[0], 50)
        self.assertEqual(post_cleaning_shape[1], 25)
        self.assertTrue(np.isfinite(tab_result.processed_features).all())

        # Step 3: Stage 8 Projection
        sample_ids = df_xls["patient_id"].astype(str).tolist()
        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        tabular_arg = (tab_result.processed_features, sample_ids)
        projector.fit(tabular=tabular_arg, sample_ids=sample_ids)
        unified_rep = projector.transform(tabular=tabular_arg, sample_ids=sample_ids)
        stage8_shape = unified_rep.representation.shape

        self.assertEqual(stage8_shape, (50, 10))
        self.assertEqual(unified_rep.representation.dtype, np.float64)

        # Step 4: Stage 9 Quantum Handoff
        handoff = QuantumHandoffAdapter()
        angles = handoff.prepare_quantum_input(unified_rep.representation)
        quantum_angle_shape = angles.shape

        self.assertEqual(quantum_angle_shape, torch.Size([50, 10]))
        self.assertEqual(angles.dtype, torch.float64)
        self.assertTrue(((angles >= -np.pi) & (angles <= np.pi)).all().item())

        # Step 5: Frozen VQC Execution
        probs, _ = handoff.execute_quantum_model(unified_rep.representation)
        vqc_output_shape = probs.shape

        self.assertEqual(vqc_output_shape, torch.Size([50, 2]))
        self.assertTrue(np.allclose(probs.cpu().numpy().sum(axis=1), 1.0, atol=1e-4))

    # -------------------------------------------------------------------------
    # 2. Prove TorchXRayVision Uses Real Pretrained Weights
    # -------------------------------------------------------------------------
    def test_xray_uses_real_torchxrayvision_weights(self):
        cfg = Imaging2DConfig(encoder_name="torchxrayvision")
        encoder = TorchXRayVisionEncoder(config=cfg, weights="densenet121-res224-all")

        self.assertEqual(encoder.weights_name, "densenet121-res224-all")
        self.assertEqual(encoder.embedding_dim, 1024)

        # Parameter inspection
        params = list(encoder.model.parameters())
        param_count = sum(p.numel() for p in params)
        self.assertEqual(param_count, 6966034)

        # Confirm non-zero, non-trivial pretrained weights
        sample_param = params[0].detach().cpu().numpy()
        self.assertFalse((sample_param == 0.0).all())
        self.assertTrue(np.std(sample_param) > 1e-4)

        # Confirm eval mode
        self.assertFalse(encoder.model.training)

    # -------------------------------------------------------------------------
    # 3. Prove X-Ray Embedding Is Real & Non-Degenerate
    # -------------------------------------------------------------------------
    def test_xray_embedding_is_non_degenerate(self):
        self.assertTrue(self.xray_path.exists())

        cfg = Imaging2DConfig(encoder_name="torchxrayvision")
        encoder = TorchXRayVisionEncoder(config=cfg)
        pipeline = Imaging2DPipeline(config=cfg, encoder=encoder)

        img_rep = pipeline.process_image(self.xray_path, sample_id="PAT_1000")
        emb = img_rep.embeddings

        self.assertEqual(emb.shape, (1, 1024))
        self.assertEqual(emb.dtype, np.float32)
        self.assertTrue(np.isfinite(emb).all())
        self.assertFalse((emb == 0.0).all())

        # Non-trivial variance across 1024 dimensions
        std_dev = np.std(emb)
        self.assertGreater(std_dev, 0.01)

        # Sensitivity check: modified image yields different embedding
        with tempfile.TemporaryDirectory() as tmpdir:
            mod_path = Path(tmpdir) / "mod_xray.png"
            img_arr = np.array(Image.open(self.xray_path))
            img_arr = np.clip(img_arr.astype(np.int16) + 50, 0, 255).astype(np.uint8)
            Image.fromarray(img_arr).save(mod_path)

            img_rep2 = pipeline.process_image(mod_path, sample_id="PAT_1000")
            emb2 = img_rep2.embeddings

            diff = np.abs(emb - emb2).max()
            self.assertGreater(diff, 1e-3)

    # -------------------------------------------------------------------------
    # 4. Prove Explicit Multimodal ID Alignment & Row Shuffle Invariance
    # -------------------------------------------------------------------------
    def test_multimodal_alignment_survives_row_shuffle(self):
        df_xls = pd.read_excel(self.xls_path).drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        tab_pipeline = TabularPreprocessingPipeline()
        tab_result = tab_pipeline.fit_transform(df_xls)
        sample_ids = df_xls["patient_id"].astype(str).tolist()

        cfg_2d = Imaging2DConfig(encoder_name="torchxrayvision")
        pipeline_2d = Imaging2DPipeline(config=cfg_2d)
        img_rep = pipeline_2d.process_image(self.xray_path, sample_id="PAT_1000")

        # Projector fit/transform
        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        tabular_arg = (tab_result.processed_features, sample_ids)
        projector.fit(tabular=tabular_arg, image_2d=img_rep, sample_ids=sample_ids)

        unified_orig = projector.transform(tabular=tabular_arg, image_2d=img_rep, sample_ids=sample_ids)

        # Shuffle tabular rows
        perm = np.random.permutation(len(sample_ids))
        shuffled_features = tab_result.processed_features[perm]
        shuffled_ids = [sample_ids[i] for i in perm]
        shuffled_arg = (shuffled_features, shuffled_ids)

        unified_shuffled = projector.transform(tabular=shuffled_arg, image_2d=img_rep, sample_ids=shuffled_ids)

        # Map patient PAT_1000 index in both
        idx_orig = sample_ids.index("PAT_1000")
        idx_shuf = shuffled_ids.index("PAT_1000")

        vec_orig = unified_orig.representation[idx_orig]
        vec_shuf = unified_shuffled.representation[idx_shuf]

        diff = np.abs(vec_orig - vec_shuf).max()
        self.assertLess(diff, 1e-5)

    # -------------------------------------------------------------------------
    # 5. Prove Presence Mask Is Correct
    # -------------------------------------------------------------------------
    def test_presence_mask_is_correct(self):
        df_xls = pd.read_excel(self.xls_path).drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        tab_pipeline = TabularPreprocessingPipeline()
        tab_result = tab_pipeline.fit_transform(df_xls)
        sample_ids = df_xls["patient_id"].astype(str).tolist()
        tabular_arg = (tab_result.processed_features, sample_ids)

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))

        # Tabular only
        projector.fit(tabular=tabular_arg, sample_ids=sample_ids)
        rep_tab = projector.transform(tabular=tabular_arg, sample_ids=sample_ids)
        self.assertTrue((rep_tab.modality_presence[0] == np.array([True, False, False])).all())

        # Tabular + 2D X-Ray
        cfg_2d = Imaging2DConfig(encoder_name="torchxrayvision")
        pipeline_2d = Imaging2DPipeline(config=cfg_2d)
        img_rep = pipeline_2d.process_image(self.xray_path, sample_id="PAT_1000")

        projector_mm = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector_mm.fit(tabular=tabular_arg, image_2d=img_rep, sample_ids=sample_ids)
        rep_mm = projector_mm.transform(tabular=tabular_arg, image_2d=img_rep, sample_ids=sample_ids)

        self.assertTrue((rep_mm.modality_presence[0] == np.array([True, True, False])).all())
        self.assertTrue((rep_mm.modality_presence[1] == np.array([True, False, False])).all())

    # -------------------------------------------------------------------------
    # 6. Prove X-Ray Actually Changes Stage 8 Representation
    # -------------------------------------------------------------------------
    def test_xray_changes_stage8_representation(self):
        df_xls = pd.read_excel(self.xls_path).drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        tab_pipeline = TabularPreprocessingPipeline()
        tab_result = tab_pipeline.fit_transform(df_xls)
        sample_ids = df_xls["patient_id"].astype(str).tolist()
        tabular_arg = (tab_result.processed_features, sample_ids)

        # Run A: Tabular Only
        p_tab = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        p_tab.fit(tabular=tabular_arg, sample_ids=sample_ids)
        z_tab = p_tab.transform(tabular=tabular_arg, sample_ids=sample_ids).representation

        # Run B: Multimodal (Tabular + X-Ray on PAT_1000)
        pipeline_2d = Imaging2DPipeline(config=Imaging2DConfig(encoder_name="torchxrayvision"))
        img_rep = pipeline_2d.process_image(self.xray_path, sample_id="PAT_1000")

        p_mm = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        p_mm.fit(tabular=tabular_arg, image_2d=img_rep, sample_ids=sample_ids)
        z_mm = p_mm.transform(tabular=tabular_arg, image_2d=img_rep, sample_ids=sample_ids).representation

        idx = sample_ids.index("PAT_1000")
        v_tab = z_tab[idx]
        v_mm = z_mm[idx]

        max_diff = np.abs(v_tab - v_mm).max()
        l2_diff = np.linalg.norm(v_tab - v_mm)

        self.assertGreater(max_diff, 0.01)
        self.assertGreater(l2_diff, 0.05)

    # -------------------------------------------------------------------------
    # 7. Prove Stage 8 Change Propagates to Quantum Model Output
    # -------------------------------------------------------------------------
    def test_stage8_change_propagates_to_quantum(self):
        df_xls = pd.read_excel(self.xls_path).drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        tab_pipeline = TabularPreprocessingPipeline()
        tab_result = tab_pipeline.fit_transform(df_xls)
        sample_ids = df_xls["patient_id"].astype(str).tolist()
        tabular_arg = (tab_result.processed_features, sample_ids)

        # Tabular only Stage 8 & Quantum
        p_tab = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        p_tab.fit(tabular=tabular_arg, sample_ids=sample_ids)
        z_tab = p_tab.transform(tabular=tabular_arg, sample_ids=sample_ids).representation

        handoff = QuantumHandoffAdapter()
        probs_tab, _ = handoff.execute_quantum_model(z_tab)

        # Multimodal Stage 8 & Quantum
        pipeline_2d = Imaging2DPipeline(config=Imaging2DConfig(encoder_name="torchxrayvision"))
        img_rep = pipeline_2d.process_image(self.xray_path, sample_id="PAT_1000")

        p_mm = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        p_mm.fit(tabular=tabular_arg, image_2d=img_rep, sample_ids=sample_ids)
        z_mm = p_mm.transform(tabular=tabular_arg, image_2d=img_rep, sample_ids=sample_ids).representation

        probs_mm, _ = handoff.execute_quantum_model(z_mm)

        idx = sample_ids.index("PAT_1000")
        prob_tab_pat = probs_tab[idx].cpu().numpy()
        prob_mm_pat = probs_mm[idx].cpu().numpy()

        diff_prob = np.abs(prob_tab_pat - prob_mm_pat).max()
        self.assertGreater(diff_prob, 0.001)

    # -------------------------------------------------------------------------
    # 8. Verify Quantum Model Is Frozen & In Eval Mode
    # -------------------------------------------------------------------------
    def test_quantum_model_is_frozen(self):
        handoff = QuantumHandoffAdapter()
        model = handoff.quantum_model

        # Verify model is in evaluation mode
        self.assertFalse(model.training)

        # Verify parameters are immutable during inference
        initial_params = [p.clone().detach() for p in model.parameters()]
        dummy_z = np.zeros((2, 10), dtype=np.float64)

        # Run inference
        probs, _ = handoff.execute_quantum_model(dummy_z)

        # Verify parameter values are unchanged
        for p_init, p_curr in zip(initial_params, model.parameters()):
            self.assertTrue(torch.equal(p_init, p_curr.detach()))

    # -------------------------------------------------------------------------
    # 9. Determinism Test
    # -------------------------------------------------------------------------
    def test_full_pipeline_is_deterministic(self):
        df_xls = pd.read_excel(self.xls_path).drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        tab_pipeline = TabularPreprocessingPipeline()
        sample_ids = df_xls["patient_id"].astype(str).tolist()

        pipeline_2d = Imaging2DPipeline(config=Imaging2DConfig(encoder_name="torchxrayvision"))
        img_rep = pipeline_2d.process_image(self.xray_path, sample_id="PAT_1000")
        handoff = QuantumHandoffAdapter()

        # Run 1
        res1 = tab_pipeline.fit_transform(df_xls)
        p1 = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        t1 = (res1.processed_features, sample_ids)
        p1.fit(tabular=t1, image_2d=img_rep, sample_ids=sample_ids)
        z1 = p1.transform(tabular=t1, image_2d=img_rep, sample_ids=sample_ids).representation
        probs1, _ = handoff.execute_quantum_model(z1)

        # Run 2
        res2 = tab_pipeline.fit_transform(df_xls)
        p2 = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        t2 = (res2.processed_features, sample_ids)
        p2.fit(tabular=t2, image_2d=img_rep, sample_ids=sample_ids)
        z2 = p2.transform(tabular=t2, image_2d=img_rep, sample_ids=sample_ids).representation
        probs2, _ = handoff.execute_quantum_model(z2)

        self.assertEqual(np.abs(res1.processed_features - res2.processed_features).max(), 0.0)
        self.assertEqual(np.abs(z1 - z2).max(), 0.0)
        self.assertEqual(np.abs(probs1.cpu().numpy() - probs2.cpu().numpy()).max(), 0.0)

    # -------------------------------------------------------------------------
    # 10. Verify Invalid Inputs Fail Without Fallback
    # -------------------------------------------------------------------------
    def test_invalid_inputs_fail_without_fallback(self):
        router = InputRouter()

        # Unsupported extension
        with self.assertRaises(Exception):
            router.route("corrupted_file.invalid_ext")

        # Corrupt image preprocessing
        with tempfile.TemporaryDirectory() as tmpdir:
            bad_img = Path(tmpdir) / "corrupt.png"
            bad_img.write_bytes(b"NOT_AN_IMAGE_HEADER")
            pipeline_2d = Imaging2DPipeline(config=Imaging2DConfig(encoder_name="torchxrayvision"))
            with self.assertRaises(Exception):
                pipeline_2d.process_image(bad_img, sample_id="TEST")


if __name__ == "__main__":
    unittest.main()
