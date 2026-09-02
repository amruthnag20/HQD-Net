"""
Unit tests for Phase 1 Stage 5 Tabular Representation Compression.
"""

import unittest
import numpy as np
import pandas as pd

from classical_preprocessing.compression import (
    CompressionConfig,
    InformationRetentionReport,
    TabularCompressionResult,
    TabularCompressor,
    evaluate_information_retention,
)
from classical_preprocessing.feature_selection import FeatureSelectionConfig, MultiSignalFeatureSelector
from classical_preprocessing.tabular import TabularPreprocessingPipeline


class TestPhase1TabularCompression(unittest.TestCase):

    def setUp(self):
        np.random.seed(42)
        # Create synthetic dataset with 20 features
        self.X_mat = np.random.randn(100, 20)
        self.y_vec = (self.X_mat[:, 0] + self.X_mat[:, 1] > 0).astype(int)
        self.feature_names = [f"feat_{i:02d}" for i in range(20)]

    # -------------------------------------------------------------
    # Test 1 — Basic PCA Compression
    # -------------------------------------------------------------
    def test_basic_pca_compression(self):
        config = CompressionConfig(n_components=5)
        compressor = TabularCompressor(config=config)
        result = compressor.fit_transform(self.X_mat, feature_names=self.feature_names)

        self.assertIsInstance(result, TabularCompressionResult)
        self.assertEqual(result.compressed_features.shape, (100, 5))
        self.assertEqual(result.compressed_features.dtype, np.float64)
        self.assertTrue(np.isfinite(result.compressed_features).all())
        self.assertEqual(len(result.compressed_feature_names), 5)

    # -------------------------------------------------------------
    # Test 2 — Explicit Component Count
    # -------------------------------------------------------------
    def test_explicit_component_count(self):
        for k in [2, 6, 12]:
            config = CompressionConfig(n_components=k)
            compressor = TabularCompressor(config=config)
            res = compressor.fit_transform(self.X_mat)
            self.assertEqual(res.compressed_features.shape[1], k)

    # -------------------------------------------------------------
    # Test 3 — Variance Target Selection
    # -------------------------------------------------------------
    def test_variance_target_selection(self):
        config = CompressionConfig(explained_variance_target=0.85)
        compressor = TabularCompressor(config=config)
        res = compressor.fit_transform(self.X_mat)

        self.assertGreater(res.compressed_features.shape[1], 0)
        self.assertLessEqual(res.compressed_features.shape[1], 20)
        self.assertGreaterEqual(res.cumulative_explained_variance, 0.85)

    # -------------------------------------------------------------
    # Test 4 — Invalid Component Count Errors
    # -------------------------------------------------------------
    def test_invalid_component_count_raises(self):
        # 0 components
        with self.assertRaises(ValueError):
            TabularCompressor(CompressionConfig(n_components=0)).fit(self.X_mat)

        # Negative components
        with self.assertRaises(ValueError):
            TabularCompressor(CompressionConfig(n_components=-3)).fit(self.X_mat)

        # Exceeds available features
        with self.assertRaises(ValueError):
            TabularCompressor(CompressionConfig(n_components=50)).fit(self.X_mat)

    # -------------------------------------------------------------
    # Test 5 — Fit / Transform Isolation
    # -------------------------------------------------------------
    def test_fit_transform_isolation(self):
        X_train = self.X_mat[:70]
        X_test = self.X_mat[70:]

        compressor = TabularCompressor(CompressionConfig(n_components=5))
        compressor.fit(X_train)

        train_res = compressor.transform(X_train)
        test_res = compressor.transform(X_test)

        self.assertEqual(train_res.compressed_features.shape, (70, 5))
        self.assertEqual(test_res.compressed_features.shape, (30, 5))

    # -------------------------------------------------------------
    # Test 6 — Determinism
    # -------------------------------------------------------------
    def test_compressor_determinism(self):
        config = CompressionConfig(n_components=6, random_state=42)
        comp1 = TabularCompressor(config=config).fit(self.X_mat)
        comp2 = TabularCompressor(config=config).fit(self.X_mat)

        res1 = comp1.transform(self.X_mat)
        res2 = comp2.transform(self.X_mat)

        np.testing.assert_array_almost_equal(res1.compressed_features, res2.compressed_features)
        np.testing.assert_array_almost_equal(res1.explained_variance_ratio, res2.explained_variance_ratio)

    # -------------------------------------------------------------
    # Test 7 — Explained Variance Properties
    # -------------------------------------------------------------
    def test_explained_variance_monotonicity(self):
        compressor = TabularCompressor(CompressionConfig(n_components=8)).fit(self.X_mat)
        res = compressor.transform(self.X_mat)

        exp_var = res.explained_variance_ratio
        self.assertEqual(len(exp_var), 8)
        self.assertTrue((exp_var >= 0).all())

        cumsum = np.cumsum(exp_var)
        # Verify monotonically increasing
        self.assertTrue((np.diff(cumsum) >= -1e-12).all())

    # -------------------------------------------------------------
    # Test 8 — Inverse Transform & Reconstruction Error
    # -------------------------------------------------------------
    def test_inverse_transform_reconstruction(self):
        compressor = TabularCompressor(CompressionConfig(n_components=10)).fit(self.X_mat)
        res = compressor.transform(self.X_mat)

        reconstructed = compressor.inverse_transform(res.compressed_features)
        self.assertEqual(reconstructed.shape, self.X_mat.shape)
        self.assertGreaterEqual(res.reconstruction_error, 0.0)

    # -------------------------------------------------------------
    # Test 9 — Invalid Inputs (NaN/Inf)
    # -------------------------------------------------------------
    def test_invalid_input_rejection(self):
        X_bad = self.X_mat.copy()
        X_bad[2, 3] = np.nan
        compressor = TabularCompressor(CompressionConfig(n_components=5))

        with self.assertRaises(ValueError):
            compressor.fit(X_bad)

    # -------------------------------------------------------------
    # Test 10 — Full Integration: Stage 3 -> Stage 4 -> Stage 5
    # -------------------------------------------------------------
    def test_stage3_stage4_stage5_integration(self):
        df = pd.DataFrame({
            "patient_id": [f"P_{i}" for i in range(50)],
            "age": np.random.randn(50),
            "cholesterol": np.random.randn(50),
            "bp": np.random.randn(50),
            "smoking": ["no" if i % 2 == 0 else "yes" for i in range(50)],
            "diagnosis": np.random.choice([0, 1], size=50),
        })

        # Stage 3
        stage3_res = TabularPreprocessingPipeline().fit_transform(df)
        self.assertEqual(stage3_res.processed_features.shape[0], 50)

        # Stage 4
        stage4_res = MultiSignalFeatureSelector(FeatureSelectionConfig(top_k=3)).fit_transform(
            stage3_res.processed_features,
            stage3_res.target,
            feature_names=stage3_res.feature_names,
        )
        self.assertEqual(stage4_res.selected_features.shape, (50, 3))

        # Stage 5
        stage5_res = TabularCompressor(CompressionConfig(n_components=2)).fit_transform(
            stage4_res.selected_features,
            feature_names=stage4_res.selected_feature_names,
        )
        self.assertEqual(stage5_res.compressed_features.shape, (50, 2))

    # -------------------------------------------------------------
    # Test 11 — No Forced 10-D Output
    # -------------------------------------------------------------
    def test_no_forced_10d_output(self):
        # Verify compressor can output 4, 6, or 7 components, not restricted to 10
        for k in [4, 6, 7]:
            compressor = TabularCompressor(CompressionConfig(n_components=k)).fit(self.X_mat)
            res = compressor.transform(self.X_mat)
            self.assertEqual(res.compressed_features.shape[1], k)


if __name__ == "__main__":
    unittest.main()
