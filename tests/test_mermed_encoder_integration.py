"""
Focused Unit & Integration Test Suite for MerMED Pretrained Encoder Integration (Prompt 22).
Verifies model architecture loading, inference, determinism, missing modality presence masks,
patient alignment, downstream 10-D propagation, quantum handoff propagation, and strict failure contracts.
"""

import tempfile
import unittest
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image
import torch

from classical_preprocessing.imaging_2d import (
    Imaging2DConfig,
    Imaging2DPipeline,
    MerMEDEncoder,
    MerMEDViTBackbone,
    get_medical_encoder,
)
from classical_preprocessing.quantum_handoff.adapter import QuantumHandoffAdapter
from classical_preprocessing.tabular.pipeline import TabularPreprocessingPipeline
from classical_preprocessing.unified_projection.projector import Unified10DProjector, UnifiedProjectionConfig
from classical_preprocessing.unified_projection.task_adapter import TaskConditioningAdapter, TaskContext


class TestMerMEDEncoderIntegration(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        self.root_dir = Path(__file__).resolve().parent.parent
        self.xls_path = self.root_dir / "raw_clinical_test.xls"
        self.xray_path = self.root_dir / "mock_chest_xray.png"

    # -------------------------------------------------------------------------
    # Test 1 — Model Loading
    # -------------------------------------------------------------------------
    def test_mermed_model_loading(self):
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True)
        encoder = get_medical_encoder(cfg)

        self.assertIsInstance(encoder, MerMEDEncoder)
        self.assertEqual(encoder.embedding_dim, 768)
        self.assertIsInstance(encoder.model, MerMEDViTBackbone)
        self.assertFalse(encoder.model.training)

        param_count = sum(p.numel() for p in encoder.model.parameters())
        self.assertEqual(param_count, 85798656)  # ViT-B/16 parameter count

    # -------------------------------------------------------------------------
    # Test 2 — Real Inference
    # -------------------------------------------------------------------------
    def test_mermed_real_inference(self):
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True)
        pipeline = Imaging2DPipeline(config=cfg)

        img_rep = pipeline.process_image(self.xray_path, sample_id="PAT_1000")

        self.assertEqual(img_rep.embeddings.shape, (1, 768))
        self.assertEqual(img_rep.embeddings.dtype, np.float64)
        self.assertTrue(np.isfinite(img_rep.embeddings).all())
        self.assertFalse((img_rep.embeddings == 0.0).all())

    # -------------------------------------------------------------------------
    # Test 3 — Non-Degenerate Embedding
    # -------------------------------------------------------------------------
    def test_mermed_non_degenerate_embedding(self):
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True)
        pipeline = Imaging2DPipeline(config=cfg)

        img_rep1 = pipeline.process_image(self.xray_path, sample_id="PAT_1000")
        emb1 = img_rep1.embeddings

        # Modify image intensity
        with tempfile.TemporaryDirectory() as tmpdir:
            mod_path = Path(tmpdir) / "mod_xray.png"
            img_arr = np.array(Image.open(self.xray_path))
            img_arr = np.clip(img_arr.astype(np.int16) + 60, 0, 255).astype(np.uint8)
            Image.fromarray(img_arr).save(mod_path)

            img_rep2 = pipeline.process_image(mod_path, sample_id="PAT_1000")
            emb2 = img_rep2.embeddings

            diff = np.abs(emb1 - emb2).max()
            self.assertGreater(diff, 1e-3)
            self.assertGreater(np.std(emb1), 0.001)

    # -------------------------------------------------------------------------
    # Test 4 — Determinism
    # -------------------------------------------------------------------------
    def test_mermed_determinism(self):
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True)
        pipeline = Imaging2DPipeline(config=cfg)

        emb1 = pipeline.process_image(self.xray_path, sample_id="PAT_1000").embeddings
        emb2 = pipeline.process_image(self.xray_path, sample_id="PAT_1000").embeddings

        diff = np.abs(emb1 - emb2).max()
        self.assertEqual(diff, 0.0)

    # -------------------------------------------------------------------------
    # Test 5 — Existing Pipeline Preservation (mermed_enabled=False)
    # -------------------------------------------------------------------------
    def test_existing_pipeline_preservation(self):
        cfg_default = Imaging2DConfig(encoder_name="torchxrayvision", mermed_enabled=False)
        self.assertFalse(cfg_default.mermed_enabled)

        pipeline = Imaging2DPipeline(config=cfg_default)
        img_rep = pipeline.process_image(self.xray_path, sample_id="PAT_1000")

        # TorchXRayVision embedding dimension remains 1024
        self.assertEqual(img_rep.embedding_dim, 1024)
        self.assertEqual(img_rep.embeddings.shape, (1, 1024))

    # -------------------------------------------------------------------------
    # Test 6 — MerMED Enabled Additive Representation
    # -------------------------------------------------------------------------
    def test_mermed_enabled_additive_path(self):
        cfg_mermed = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True)
        pipeline_mermed = Imaging2DPipeline(config=cfg_mermed)
        rep_mermed = pipeline_mermed.process_image(self.xray_path, sample_id="PAT_1000")

        task_adapter = TaskConditioningAdapter(in_features=768, out_features=768)
        task_context = TaskContext(task_id="PULMONARY_DISEASE", disease_target=1)
        adapted_mermed = task_adapter(rep_mermed.embeddings, task_context=task_context)

        self.assertEqual(adapted_mermed.shape, (1, 768))
        self.assertEqual(adapted_mermed.dtype, np.float64)

    # -------------------------------------------------------------------------
    # Test 7 — Missing Modality Behavior
    # -------------------------------------------------------------------------
    def test_mermed_missing_modality(self):
        df_xls = pd.read_excel(self.xls_path).drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        tab_pipeline = TabularPreprocessingPipeline()
        tab_result = tab_pipeline.fit_transform(df_xls)
        sample_ids = df_xls["patient_id"].astype(str).tolist()
        tabular_arg = (tab_result.processed_features, sample_ids)

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=tabular_arg, sample_ids=sample_ids)
        rep_tab = projector.transform(tabular=tabular_arg, sample_ids=sample_ids)

        self.assertTrue((rep_tab.modality_presence[0] == np.array([True, False, False])).all())

    # -------------------------------------------------------------------------
    # Test 8 — Patient Alignment with MerMED
    # -------------------------------------------------------------------------
    def test_patient_alignment_with_mermed(self):
        df_xls = pd.read_excel(self.xls_path).drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        tab_pipeline = TabularPreprocessingPipeline()
        tab_result = tab_pipeline.fit_transform(df_xls)
        sample_ids = df_xls["patient_id"].astype(str).tolist()

        cfg_mermed = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True)
        pipeline_mermed = Imaging2DPipeline(config=cfg_mermed)
        rep_mermed = pipeline_mermed.process_image(self.xray_path, sample_id="PAT_1000")

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        tabular_arg = (tab_result.processed_features, sample_ids)
        projector.fit(tabular=tabular_arg, image_2d=rep_mermed, sample_ids=sample_ids)

        # Original transform
        unified_orig = projector.transform(tabular=tabular_arg, image_2d=rep_mermed, sample_ids=sample_ids)

        # Shuffled tabular rows
        perm = np.random.permutation(len(sample_ids))
        shuffled_features = tab_result.processed_features[perm]
        shuffled_ids = [sample_ids[i] for i in perm]
        shuffled_arg = (shuffled_features, shuffled_ids)

        unified_shuffled = projector.transform(tabular=shuffled_arg, image_2d=rep_mermed, sample_ids=shuffled_ids)

        idx_orig = sample_ids.index("PAT_1000")
        idx_shuf = shuffled_ids.index("PAT_1000")

        vec_orig = unified_orig.representation[idx_orig]
        vec_shuf = unified_shuffled.representation[idx_shuf]

        diff = np.abs(vec_orig - vec_shuf).max()
        self.assertLess(diff, 1e-5)

    # -------------------------------------------------------------------------
    # Test 9 — Downstream 10-D Propagation
    # -------------------------------------------------------------------------
    def test_mermed_downstream_10d_propagation(self):
        df_xls = pd.read_excel(self.xls_path).drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        tab_pipeline = TabularPreprocessingPipeline()
        tab_result = tab_pipeline.fit_transform(df_xls)
        sample_ids = df_xls["patient_id"].astype(str).tolist()
        tabular_arg = (tab_result.processed_features, sample_ids)

        # Tabular only
        p_tab = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        p_tab.fit(tabular=tabular_arg, sample_ids=sample_ids)
        z_tab = p_tab.transform(tabular=tabular_arg, sample_ids=sample_ids).representation

        # Tabular + MerMED representation
        cfg_mermed = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True)
        pipeline_mermed = Imaging2DPipeline(config=cfg_mermed)
        rep_mermed = pipeline_mermed.process_image(self.xray_path, sample_id="PAT_1000")

        p_mm = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        p_mm.fit(tabular=tabular_arg, image_2d=rep_mermed, sample_ids=sample_ids)
        z_mm = p_mm.transform(tabular=tabular_arg, image_2d=rep_mermed, sample_ids=sample_ids).representation

        idx = sample_ids.index("PAT_1000")
        v_tab = z_tab[idx]
        v_mm = z_mm[idx]

        max_diff = np.abs(v_tab - v_mm).max()
        self.assertGreater(max_diff, 0.01)

    # -------------------------------------------------------------------------
    # Test 10 — Quantum Propagation
    # -------------------------------------------------------------------------
    def test_quantum_propagation_with_mermed(self):
        df_xls = pd.read_excel(self.xls_path).drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        tab_pipeline = TabularPreprocessingPipeline()
        tab_result = tab_pipeline.fit_transform(df_xls)
        sample_ids = df_xls["patient_id"].astype(str).tolist()
        tabular_arg = (tab_result.processed_features, sample_ids)

        handoff = QuantumHandoffAdapter()

        # Run A: Tabular Only
        p_tab = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        p_tab.fit(tabular=tabular_arg, sample_ids=sample_ids)
        z_tab = p_tab.transform(tabular=tabular_arg, sample_ids=sample_ids).representation
        probs_tab, _ = handoff.execute_quantum_model(z_tab)

        # Run B: Tabular + MerMED
        cfg_mermed = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True)
        pipeline_mermed = Imaging2DPipeline(config=cfg_mermed)
        rep_mermed = pipeline_mermed.process_image(self.xray_path, sample_id="PAT_1000")

        p_mm = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        p_mm.fit(tabular=tabular_arg, image_2d=rep_mermed, sample_ids=sample_ids)
        z_mm = p_mm.transform(tabular=tabular_arg, image_2d=rep_mermed, sample_ids=sample_ids).representation
        probs_mm, _ = handoff.execute_quantum_model(z_mm)

        idx = sample_ids.index("PAT_1000")
        prob_tab_pat = probs_tab[idx].cpu().numpy()
        prob_mm_pat = probs_mm[idx].cpu().numpy()

        diff_prob = np.abs(prob_tab_pat - prob_mm_pat).max()
        self.assertGreater(diff_prob, 0.01)

    # -------------------------------------------------------------------------
    # Test 11 — No Fake Fallback on Failure
    # -------------------------------------------------------------------------
    def test_no_fake_fallback_on_failure(self):
        # Point mermed_weights_path to non-existent file
        cfg = Imaging2DConfig(
            encoder_name="mermed",
            mermed_enabled=True,
            mermed_weights_path="non_existent_mermed_weights.pth",
        )

        with self.assertRaises(FileNotFoundError):
            MerMEDEncoder(config=cfg, weights_path="non_existent_mermed_weights.pth")


if __name__ == "__main__":
    unittest.main()
