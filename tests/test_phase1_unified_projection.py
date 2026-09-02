"""
Unit tests for Phase 1 Stage 8 Unified Multimodal 10-D Projection.
"""

import tempfile
import unittest
from pathlib import Path
import numpy as np
import torch

from classical_preprocessing.imaging_2d import ImageRepresentation
from classical_preprocessing.imaging_3d import VolumeRepresentation
from classical_preprocessing.tabular import TabularPreprocessingResult
from classical_preprocessing.unified_projection import (
    AlignedMultimodalBatch,
    ProjectionEvaluationReport,
    Unified10DProjector,
    UnifiedProjectionConfig,
    UnifiedRepresentation,
    align_multimodal_inputs,
    evaluate_10d_projection,
)


class TestPhase1UnifiedProjection(unittest.TestCase):

    def setUp(self):
        np.random.seed(42)
        torch.manual_seed(42)

        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

        self.n_samples = 20
        self.sample_ids = [f"PAT_{i:04d}" for i in range(self.n_samples)]

        # Synthetic tabular data (N=20, D=10)
        self.tab_matrix = np.random.randn(self.n_samples, 10).astype(np.float64)

        # Synthetic 2D image representations (N=20, D=512)
        self.img2d_matrix = np.random.randn(self.n_samples, 512).astype(np.float64)
        self.img2d_rep = ImageRepresentation(
            embeddings=self.img2d_matrix,
            sample_ids=self.sample_ids,
            embedding_dim=512,
        )

        # Synthetic 3D volume representations (N=20, D=512)
        self.img3d_matrix = np.random.randn(self.n_samples, 512).astype(np.float64)
        self.img3d_rep = VolumeRepresentation(
            embeddings=self.img3d_matrix,
            sample_ids=self.sample_ids,
            embedding_dim=512,
        )

        # Synthetic target labels
        self.y_cls = np.random.randint(0, 2, size=self.n_samples)

    def tearDown(self):
        self.temp_dir.cleanup()

    # -------------------------------------------------------------
    # Test 1 — Tabular-Only Input
    # -------------------------------------------------------------
    def test_tabular_only_projection(self):
        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=(self.tab_matrix, self.sample_ids))

        res = projector.transform(tabular=(self.tab_matrix, self.sample_ids))
        self.assertIsInstance(res, UnifiedRepresentation)
        self.assertEqual(res.representation.shape, (self.n_samples, 10))
        self.assertEqual(res.representation.dtype, np.float64)

    # -------------------------------------------------------------
    # Test 2 — Tabular + 2D Input
    # -------------------------------------------------------------
    def test_tabular_and_2d_fusion(self):
        projector = Unified10DProjector()
        projector.fit(
            tabular=(self.tab_matrix, self.sample_ids),
            image_2d=self.img2d_rep,
            y=self.y_cls,
        )

        res = projector.transform(
            tabular=(self.tab_matrix, self.sample_ids),
            image_2d=self.img2d_rep,
        )
        self.assertEqual(res.representation.shape, (self.n_samples, 10))

    # -------------------------------------------------------------
    # Test 3 — Tabular + 3D Input
    # -------------------------------------------------------------
    def test_tabular_and_3d_fusion(self):
        projector = Unified10DProjector()
        projector.fit(
            tabular=(self.tab_matrix, self.sample_ids),
            image_3d=self.img3d_rep,
            y=self.y_cls,
        )

        res = projector.transform(
            tabular=(self.tab_matrix, self.sample_ids),
            image_3d=self.img3d_rep,
        )
        self.assertEqual(res.representation.shape, (self.n_samples, 10))

    # -------------------------------------------------------------
    # Test 4 — All Modalities (Tabular + 2D + 3D)
    # -------------------------------------------------------------
    def test_all_modalities_fusion(self):
        projector = Unified10DProjector()
        projector.fit(
            tabular=(self.tab_matrix, self.sample_ids),
            image_2d=self.img2d_rep,
            image_3d=self.img3d_rep,
            y=self.y_cls,
        )

        res = projector.transform(
            tabular=(self.tab_matrix, self.sample_ids),
            image_2d=self.img2d_rep,
            image_3d=self.img3d_rep,
        )
        self.assertEqual(res.representation.shape, (self.n_samples, 10))

    # -------------------------------------------------------------
    # Test 5 — Missing Modality Handling
    # -------------------------------------------------------------
    def test_missing_modality_presence_mask(self):
        batch = align_multimodal_inputs(tabular=(self.tab_matrix, self.sample_ids))
        self.assertEqual(batch.presence_mask.shape, (self.n_samples, 3))
        self.assertTrue(batch.presence_mask[:, 0].all())
        self.assertFalse(batch.presence_mask[:, 1].any())
        self.assertFalse(batch.presence_mask[:, 2].any())

    # -------------------------------------------------------------
    # Test 6 — Partial Multimodal Batch
    # -------------------------------------------------------------
    def test_partial_multimodal_batch(self):
        # Samples 0..9 have 2D images, 10..19 have 3D volumes
        sub_2d = ImageRepresentation(
            embeddings=self.img2d_matrix[:10],
            sample_ids=self.sample_ids[:10],
            embedding_dim=512,
        )
        sub_3d = VolumeRepresentation(
            embeddings=self.img3d_matrix[10:],
            sample_ids=self.sample_ids[10:],
            embedding_dim=512,
        )

        projector = Unified10DProjector()
        projector.fit(
            tabular=(self.tab_matrix, self.sample_ids),
            image_2d=sub_2d,
            image_3d=sub_3d,
            y=self.y_cls,
        )

        res = projector.transform(
            tabular=(self.tab_matrix, self.sample_ids),
            image_2d=sub_2d,
            image_3d=sub_3d,
        )

        self.assertEqual(res.representation.shape, (self.n_samples, 10))
        self.assertTrue(res.modality_presence[0, 1])  # Sample 0 has 2D image
        self.assertFalse(res.modality_presence[0, 2]) # Sample 0 missing 3D
        self.assertFalse(res.modality_presence[15, 1])# Sample 15 missing 2D
        self.assertTrue(res.modality_presence[15, 2]) # Sample 15 has 3D

    # -------------------------------------------------------------
    # Test 7 — Sample Alignment (Order Independence)
    # -------------------------------------------------------------
    def test_sample_alignment_shuffle(self):
        shuffled_idx = np.random.permutation(self.n_samples)
        shuffled_ids = [self.sample_ids[i] for i in shuffled_idx]
        shuffled_img2d = ImageRepresentation(
            embeddings=self.img2d_matrix[shuffled_idx],
            sample_ids=shuffled_ids,
            embedding_dim=512,
        )

        batch = align_multimodal_inputs(
            tabular=(self.tab_matrix, self.sample_ids),
            image_2d=shuffled_img2d,
            sample_ids=self.sample_ids,
        )

        self.assertEqual(batch.sample_ids, self.sample_ids)
        np.testing.assert_array_almost_equal(batch.image_2d[0], self.img2d_matrix[0])

    # -------------------------------------------------------------
    # Test 8 — Duplicate Sample IDs Rejection
    # -------------------------------------------------------------
    def test_duplicate_sample_ids_rejection(self):
        dup_ids = ["PAT_0001", "PAT_0001"]
        dup_matrix = np.random.randn(2, 5)

        with self.assertRaises(ValueError) as ctx:
            align_multimodal_inputs(tabular=(dup_matrix, dup_ids))
        self.assertIn("Duplicate sample IDs", str(ctx.exception))

    # -------------------------------------------------------------
    # Test 9 — Dimension Validation
    # -------------------------------------------------------------
    def test_unfitted_transform_rejection(self):
        projector = Unified10DProjector()
        with self.assertRaises(ValueError) as ctx:
            projector.transform(tabular=(self.tab_matrix, self.sample_ids))
        self.assertIn("not fitted", str(ctx.exception))

    # -------------------------------------------------------------
    # Test 10 — Finite Output Guarantee
    # -------------------------------------------------------------
    def test_finite_output_guarantee(self):
        projector = Unified10DProjector()
        projector.fit(tabular=(self.tab_matrix, self.sample_ids), y=self.y_cls)
        res = projector.transform(tabular=(self.tab_matrix, self.sample_ids))

        self.assertTrue(np.isfinite(res.representation).all())
        self.assertEqual(res.representation.dtype, np.float64)

    # -------------------------------------------------------------
    # Test 11 — Exactly 10 Dimensions Enforced
    # -------------------------------------------------------------
    def test_exactly_10_dimensions_enforced(self):
        projector = Unified10DProjector()
        projector.fit(tabular=(self.tab_matrix, self.sample_ids), y=self.y_cls)
        res = projector.transform(tabular=(self.tab_matrix, self.sample_ids))

        self.assertEqual(res.representation.shape[1], 10)

    # -------------------------------------------------------------
    # Test 12 — Fit / Transform Separation
    # -------------------------------------------------------------
    def test_fit_transform_separation(self):
        projector = Unified10DProjector(config=UnifiedProjectionConfig(random_state=42))
        projector.fit(tabular=(self.tab_matrix, self.sample_ids), y=self.y_cls)

        # Freeze weights reference
        weight_before = projector.model.fusion_mlp[3].weight.clone()

        # Call transform multiple times
        res1 = projector.transform(tabular=(self.tab_matrix, self.sample_ids))
        res2 = projector.transform(tabular=(self.tab_matrix, self.sample_ids))

        weight_after = projector.model.fusion_mlp[3].weight.clone()

        torch.testing.assert_close(weight_before, weight_after)
        np.testing.assert_array_equal(res1.representation, res2.representation)

    # -------------------------------------------------------------
    # Test 13 — Deterministic Projection Execution
    # -------------------------------------------------------------
    def test_projection_determinism(self):
        cfg1 = UnifiedProjectionConfig(random_state=42)
        p1 = Unified10DProjector(config=cfg1)
        p1.fit(tabular=(self.tab_matrix, self.sample_ids), y=self.y_cls)
        res1 = p1.transform(tabular=(self.tab_matrix, self.sample_ids))

        cfg2 = UnifiedProjectionConfig(random_state=42)
        p2 = Unified10DProjector(config=cfg2)
        p2.fit(tabular=(self.tab_matrix, self.sample_ids), y=self.y_cls)
        res2 = p2.transform(tabular=(self.tab_matrix, self.sample_ids))

        np.testing.assert_array_almost_equal(res1.representation, res2.representation)

    # -------------------------------------------------------------
    # Test 14 — Model Save / Load Serialization
    # -------------------------------------------------------------
    def test_save_load_serialization(self):
        save_file = self.temp_path / "projector_model.pt"

        p_orig = Unified10DProjector()
        p_orig.fit(tabular=(self.tab_matrix, self.sample_ids), image_2d=self.img2d_rep, y=self.y_cls)
        res_orig = p_orig.transform(tabular=(self.tab_matrix, self.sample_ids), image_2d=self.img2d_rep)

        p_orig.save(save_file)
        p_loaded = Unified10DProjector.load(save_file)

        res_loaded = p_loaded.transform(tabular=(self.tab_matrix, self.sample_ids), image_2d=self.img2d_rep)

        np.testing.assert_array_almost_equal(res_orig.representation, res_loaded.representation)

    # -------------------------------------------------------------
    # Test 15 — Metadata Separation Guarantee
    # -------------------------------------------------------------
    def test_sample_id_metadata_separation(self):
        projector = Unified10DProjector()
        projector.fit(tabular=(self.tab_matrix, self.sample_ids), y=self.y_cls)
        res = projector.transform(tabular=(self.tab_matrix, self.sample_ids))

        self.assertEqual(res.sample_ids, self.sample_ids)
        self.assertEqual(res.representation.shape, (self.n_samples, 10))

    # -------------------------------------------------------------
    # Test 16 — Small Dimension Padding / Expansion Safety
    # -------------------------------------------------------------
    def test_small_dimension_expansion(self):
        small_tab = np.random.randn(5, 3).astype(np.float64)  # 3 features < 10
        small_ids = [f"PAT_{i:04d}" for i in range(5)]

        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=(small_tab, small_ids))
        res = projector.transform(tabular=(small_tab, small_ids))

        self.assertEqual(res.representation.shape, (5, 10))

    # -------------------------------------------------------------
    # Test 17 — No-Target Unsupervised Fallback
    # -------------------------------------------------------------
    def test_unsupervised_pca_fallback(self):
        projector = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
        projector.fit(tabular=(self.tab_matrix, self.sample_ids), y=None)
        res = projector.transform(tabular=(self.tab_matrix, self.sample_ids))

        self.assertEqual(res.representation.shape, (self.n_samples, 10))
        self.assertEqual(res.metadata["projection_method"], "unsupervised_pca")


if __name__ == "__main__":
    unittest.main()
