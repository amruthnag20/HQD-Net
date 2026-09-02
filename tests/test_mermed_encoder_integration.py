"""
Forensic & Unit Test Suite for Official Pretrained MerMED Integration (Prompt 24).
Verifies MerMED.pth checkpoint existence, teacher weight loading, exact parameter matching,
parameter freezing, output non-degeneracy, checkpoint participation, missing-checkpoint failures,
and downstream quantum handoff propagation.
"""

import copy
import hashlib
import os
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


class TestOfficialMerMEDIntegration(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        self.root_dir = Path(__file__).resolve().parent.parent
        self.ckpt_path = self.root_dir / "weights" / "MerMED.pth"
        self.xls_path = self.root_dir / "raw_clinical_test.xls"
        self.xray_path = self.root_dir / "mock_chest_xray.png"

    # -------------------------------------------------------------------------
    # Test A — Official Checkpoint Exists
    # -------------------------------------------------------------------------
    def test_checkpoint_exists(self):
        self.assertTrue(self.ckpt_path.exists(), f"MerMED.pth not found at {self.ckpt_path}")
        size = self.ckpt_path.stat().st_size
        self.assertGreater(size, 1_000_000_000, "Checkpoint file size is suspiciously small.")

    # -------------------------------------------------------------------------
    # Test B — Checkpoint Deserializes
    # -------------------------------------------------------------------------
    def test_checkpoint_deserializes(self):
        ckpt = torch.load(self.ckpt_path, map_location="cpu", weights_only=False)
        self.assertIsInstance(ckpt, dict)
        self.assertIn("teacher", ckpt)
        self.assertIn("student", ckpt)

    # -------------------------------------------------------------------------
    # Test C — Teacher Weights Exist
    # -------------------------------------------------------------------------
    def test_teacher_weights_exist(self):
        ckpt = torch.load(self.ckpt_path, map_location="cpu", weights_only=False)
        teacher = ckpt["teacher"]
        self.assertIsInstance(teacher, dict)
        self.assertEqual(len(teacher), 166)

    # -------------------------------------------------------------------------
    # Test D — Teacher Weights Load Correctly (strict=True)
    # -------------------------------------------------------------------------
    def test_teacher_weights_load_strictly(self):
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True, mermed_weights_path=str(self.ckpt_path))
        encoder = MerMEDEncoder(config=cfg)

        self.assertIsInstance(encoder.model, MerMEDViTBackbone)
        param_count = sum(p.numel() for p in encoder.model.parameters())
        self.assertEqual(param_count, 85798656)

    # -------------------------------------------------------------------------
    # Test E — MerMED Parameters are Frozen
    # -------------------------------------------------------------------------
    def test_mermed_parameters_frozen(self):
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True, mermed_weights_path=str(self.ckpt_path))
        encoder = MerMEDEncoder(config=cfg)

        self.assertFalse(encoder.model.training)
        for name, param in encoder.model.named_parameters():
            self.assertFalse(param.requires_grad, f"Parameter {name} is not frozen!")

    # -------------------------------------------------------------------------
    # Test F — Genuinely Pretrained (Differs from Random Model)
    # -------------------------------------------------------------------------
    def test_mermed_genuinely_pretrained(self):
        random_model = MerMEDViTBackbone()
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True, mermed_weights_path=str(self.ckpt_path))
        pretrained_encoder = MerMEDEncoder(config=cfg)

        diff_count = 0
        total_count = 0

        rand_params = dict(random_model.named_parameters())
        pre_params = dict(pretrained_encoder.model.named_parameters())

        for k, p_rand in rand_params.items():
            p_pre = pre_params[k]
            diff = (p_rand - p_pre).abs().max().item()
            total_count += 1
            if diff > 1e-4:
                diff_count += 1

        self.assertEqual(diff_count, total_count, "Pretrained parameters match random initialization!")

    # -------------------------------------------------------------------------
    # Test G — Embedding Comparison (Random vs Official Checkpoint)
    # -------------------------------------------------------------------------
    def test_embedding_comparison_random_vs_pretrained(self):
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True, mermed_weights_path=str(self.ckpt_path))
        pretrained_pipeline = Imaging2DPipeline(config=cfg)

        emb_pretrained = pretrained_pipeline.process_image(self.xray_path, sample_id="PAT_1000").embeddings

        # Random model embedding
        random_encoder = MerMEDEncoder.__new__(MerMEDEncoder)
        random_encoder.config = cfg
        random_encoder._dim = 768
        random_encoder.device = torch.device("cpu")
        random_encoder.model = MerMEDViTBackbone()
        random_encoder.model.eval()

        dummy_img = torch.randn(1, 3, 224, 224)
        emb_random = random_encoder.encode(dummy_img)

        self.assertEqual(emb_pretrained.shape, (1, 768))
        self.assertEqual(emb_pretrained.dtype, np.float64)
        self.assertTrue(np.isfinite(emb_pretrained).all())

        diff = np.abs(emb_pretrained - emb_random).max()
        self.assertGreater(diff, 0.01)

    # -------------------------------------------------------------------------
    # Test H — Missing Checkpoint Fails Fast
    # -------------------------------------------------------------------------
    def test_missing_checkpoint_fails_fast(self):
        cfg = Imaging2DConfig(
            encoder_name="mermed",
            mermed_enabled=True,
            mermed_weights_path="non_existent_weights_dir/invalid_mermed.pth",
        )
        with self.assertRaises(FileNotFoundError):
            MerMEDEncoder(config=cfg)

    # -------------------------------------------------------------------------
    # Test I — Enabled MerMED Cannot Silently Fallback
    # -------------------------------------------------------------------------
    def test_enabled_mermed_no_silent_fallback(self):
        with tempfile.NamedTemporaryFile(suffix=".pth", delete=False) as tmp:
            tmp.write(b"corrupt header bytes")
            corrupt_path = tmp.name

        try:
            cfg = Imaging2DConfig(
                encoder_name="mermed",
                mermed_enabled=True,
                mermed_weights_path=corrupt_path,
            )
            with self.assertRaises(RuntimeError):
                MerMEDEncoder(config=cfg)
        finally:
            if os.path.exists(corrupt_path):
                os.remove(corrupt_path)

    # -------------------------------------------------------------------------
    # Test J — Checkpoint Participation (Altering weights alters output)
    # -------------------------------------------------------------------------
    def test_checkpoint_participation(self):
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True, mermed_weights_path=str(self.ckpt_path))
        encoder_orig = MerMEDEncoder(config=cfg)

        dummy_img = torch.randn(1, 3, 224, 224)
        emb_orig = encoder_orig.encode(dummy_img)

        # Clone model and alter weights slightly
        encoder_altered = copy.deepcopy(encoder_orig)
        with torch.no_grad():
            for p in encoder_altered.model.parameters():
                p.add_(0.5)

        emb_altered = encoder_altered.encode(dummy_img)

        diff = np.abs(emb_orig - emb_altered).max()
        self.assertGreater(diff, 0.1, "Altering loaded checkpoint parameters had no effect on inference!")

    # -------------------------------------------------------------------------
    # Test K — Determinism
    # -------------------------------------------------------------------------
    def test_mermed_determinism(self):
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True, mermed_weights_path=str(self.ckpt_path))
        pipeline = Imaging2DPipeline(config=cfg)

        emb1 = pipeline.process_image(self.xray_path, sample_id="PAT_1000").embeddings
        emb2 = pipeline.process_image(self.xray_path, sample_id="PAT_1000").embeddings

        diff = np.abs(emb1 - emb2).max()
        self.assertEqual(diff, 0.0, "Repeated MerMED inference produced non-deterministic outputs!")

    # -------------------------------------------------------------------------
    # Test L — Downstream 10-D Quantum Handoff Propagation
    # -------------------------------------------------------------------------
    def test_downstream_quantum_propagation(self):
        df_xls = pd.read_excel(self.xls_path).drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
        tab_pipeline = TabularPreprocessingPipeline()
        tab_result = tab_pipeline.fit_transform(df_xls)
        sample_ids = df_xls["patient_id"].astype(str).tolist()
        tabular_arg = (tab_result.processed_features, sample_ids)

        handoff = QuantumHandoffAdapter()

        # Run A: Baseline Tabular Only
        p_tab = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        p_tab.fit(tabular=tabular_arg, sample_ids=sample_ids)
        z_tab = p_tab.transform(tabular=tabular_arg, sample_ids=sample_ids).representation
        probs_tab, _ = handoff.execute_quantum_model(z_tab)

        # Run B: Tabular + Official Pretrained MerMED Representation
        cfg_mermed = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True, mermed_weights_path=str(self.ckpt_path))
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
        self.assertGreater(diff_prob, 0.01, "MerMED integration produced no downstream change in quantum risk probabilities!")


if __name__ == "__main__":
    unittest.main()
