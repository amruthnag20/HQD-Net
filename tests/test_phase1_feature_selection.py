"""
Unit tests for Phase 1 Stage 4 Multi-Signal Feature Selection.
"""

import unittest
from pathlib import Path
import numpy as np
import pandas as pd

from classical_preprocessing.feature_selection import (
    FeatureSelectionConfig,
    MultiSignalFeatureSelector,
    MultiSignalSelectionResult,
    group_feature_scores,
)
from classical_preprocessing.tabular import TabularPreprocessingPipeline


class TestPhase1FeatureSelection(unittest.TestCase):

    def setUp(self):
        np.random.seed(42)
        self.X_class = np.random.randn(100, 15)
        # Add strong predictive signal to features 0 and 1
        self.y_class = (self.X_class[:, 0] + self.X_class[:, 1] > 0).astype(int)
        self.feature_names_15 = [f"biomarker_{i:02d}" for i in range(15)]

    # -------------------------------------------------------------
    # Test 1 — Basic Classification & Top-K Selection
    # -------------------------------------------------------------
    def test_basic_classification_selection(self):
        config = FeatureSelectionConfig(top_k=5, random_state=42)
        selector = MultiSignalFeatureSelector(config=config)
        result = selector.fit_transform(self.X_class, self.y_class, feature_names=self.feature_names_15)

        self.assertIsInstance(result, MultiSignalSelectionResult)
        self.assertEqual(result.selected_features.shape, (100, 5))
        self.assertEqual(len(result.selected_feature_names), 5)
        self.assertEqual(len(result.selected_indices), 5)
        self.assertTrue(np.isfinite(result.selected_features).all())

        # Verify ranking dataframe structure
        ranking_df = result.ranking_dataframe
        self.assertEqual(len(ranking_df), 15)
        for col in ["feature", "mi_score", "l1_score", "rf_score", "mi_rank", "l1_rank", "rf_rank", "aggregate_score", "final_rank", "selected"]:
            self.assertIn(col, ranking_df.columns)

    # -------------------------------------------------------------
    # Test 2 — Determinism (Fit Twice)
    # -------------------------------------------------------------
    def test_selector_determinism(self):
        config = FeatureSelectionConfig(top_k=5, random_state=42)
        selector1 = MultiSignalFeatureSelector(config=config).fit(self.X_class, self.y_class, feature_names=self.feature_names_15)
        selector2 = MultiSignalFeatureSelector(config=config).fit(self.X_class, self.y_class, feature_names=self.feature_names_15)

        np.testing.assert_array_equal(selector1.selected_indices_, selector2.selected_indices_)
        pd.testing.assert_frame_equal(selector1.ranking_dataframe_, selector2.ranking_dataframe_)

    # -------------------------------------------------------------
    # Test 3 — Fit / Transform Isolation
    # -------------------------------------------------------------
    def test_fit_transform_isolation(self):
        X_train = self.X_class[:70]
        y_train = self.y_class[:70]
        X_val = self.X_class[70:85]
        X_test = self.X_class[85:]

        config = FeatureSelectionConfig(top_k=4, random_state=42)
        selector = MultiSignalFeatureSelector(config=config).fit(X_train, y_train, feature_names=self.feature_names_15)

        res_train = selector.transform(X_train)
        res_val = selector.transform(X_val)
        res_test = selector.transform(X_test)

        self.assertEqual(res_train.selected_features.shape, (70, 4))
        self.assertEqual(res_val.selected_features.shape, (15, 4))
        self.assertEqual(res_test.selected_features.shape, (15, 4))
        self.assertEqual(res_train.selected_feature_names, res_val.selected_feature_names)
        self.assertEqual(res_train.selected_feature_names, res_test.selected_feature_names)

    # -------------------------------------------------------------
    # Test 4 — No Target Leakage
    # -------------------------------------------------------------
    def test_no_target_leakage(self):
        # Target column is handled by Stage 3, but selector must fit only on feature columns
        df = pd.DataFrame(self.X_class, columns=self.feature_names_15)
        df["target"] = self.y_class

        # Pass X without target
        X_only = df.drop(columns=["target"])
        config = FeatureSelectionConfig(top_k=5, random_state=42)
        selector = MultiSignalFeatureSelector(config=config)
        result = selector.fit_transform(X_only, df["target"])

        self.assertNotIn("target", result.selected_feature_names)

    # -------------------------------------------------------------
    # Test 5 — Identifier Exclusion
    # -------------------------------------------------------------
    def test_identifier_exclusion(self):
        df = pd.DataFrame(self.X_class, columns=self.feature_names_15)
        df["patient_id"] = [f"PAT_{i}" for i in range(100)]
        df["diagnosis"] = self.y_class

        prep_pipeline = TabularPreprocessingPipeline()
        stage3_res = prep_pipeline.fit_transform(df)

        selector = MultiSignalFeatureSelector(FeatureSelectionConfig(top_k=5))
        result = selector.fit_transform(stage3_res.processed_features, stage3_res.target, feature_names=stage3_res.feature_names)

        self.assertNotIn("patient_id", result.selected_feature_names)

    # -------------------------------------------------------------
    # Test 6 — Grouped Categorical Features & Provenance
    # -------------------------------------------------------------
    def test_grouped_categorical_provenance(self):
        feature_names = ["age", "blood_pressure", "sex_F", "sex_M", "smoker_no", "smoker_yes"]
        scores = np.array([0.8, 0.6, 0.4, 0.2, 0.1, 0.9])
        numeric_cols = ["age", "blood_pressure"]
        cat_cols = ["sex", "smoker"]

        grouped_names, grouped_scores, source_map = group_feature_scores(
            feature_names=feature_names,
            transformed_scores=scores,
            numeric_cols=numeric_cols,
            cat_cols=cat_cols,
            aggregation_method="max",
        )

        self.assertIn("age", grouped_names)
        self.assertIn("sex", grouped_names)
        self.assertIn("smoker", grouped_names)
        self.assertEqual(source_map["sex"], ["sex_F", "sex_M"])
        self.assertEqual(source_map["smoker"], ["smoker_no", "smoker_yes"])
        # max score for smoker should be 0.9
        smoker_idx = grouped_names.index("smoker")
        self.assertAlmostEqual(grouped_scores[smoker_idx], 0.9)

    # -------------------------------------------------------------
    # Test 7 — Missing Target Error
    # -------------------------------------------------------------
    def test_missing_target_raises(self):
        selector = MultiSignalFeatureSelector()
        with self.assertRaises(ValueError):
            selector.fit(self.X_class, y=None)

    # -------------------------------------------------------------
    # Test 8 — Invalid Numeric Input (NaN/Inf)
    # -------------------------------------------------------------
    def test_invalid_nan_inf_raises(self):
        X_bad = self.X_class.copy()
        X_bad[0, 0] = np.nan
        selector = MultiSignalFeatureSelector()
        with self.assertRaises(ValueError):
            selector.fit(X_bad, self.y_class)

    # -------------------------------------------------------------
    # Test 9 — Invalid Top-K (0 or negative)
    # -------------------------------------------------------------
    def test_invalid_top_k_raises(self):
        for bad_k in [0, -5]:
            selector = MultiSignalFeatureSelector(FeatureSelectionConfig(top_k=bad_k))
            with self.assertRaises(ValueError):
                selector.fit(self.X_class, self.y_class)

    # -------------------------------------------------------------
    # Test 10 — Top-K Larger Than Available Features
    # -------------------------------------------------------------
    def test_top_k_larger_than_available(self):
        selector = MultiSignalFeatureSelector(FeatureSelectionConfig(top_k=50))
        with self.assertRaises(ValueError) as ctx:
            selector.fit(self.X_class, self.y_class, feature_names=self.feature_names_15)
        self.assertIn("greater than available feature count", str(ctx.exception))

    # -------------------------------------------------------------
    # Test 11 — Multiclass Target Support
    # -------------------------------------------------------------
    def test_multiclass_target(self):
        y_multi = np.random.choice([0, 1, 2], size=100)
        config = FeatureSelectionConfig(top_k=4, random_state=42)
        selector = MultiSignalFeatureSelector(config=config)
        result = selector.fit_transform(self.X_class, y_multi, feature_names=self.feature_names_15)

        self.assertEqual(result.selected_features.shape, (100, 4))
        self.assertTrue(np.isfinite(result.selected_features).all())

    # -------------------------------------------------------------
    # Test 12 — Continuous Regression Target Support
    # -------------------------------------------------------------
    def test_continuous_regression_target(self):
        y_reg = self.X_class[:, 0] * 2.5 - self.X_class[:, 1] * 1.2 + np.random.randn(100) * 0.1
        config = FeatureSelectionConfig(top_k=4, task_type="regression", random_state=42)
        selector = MultiSignalFeatureSelector(config=config)
        result = selector.fit_transform(self.X_class, y_reg, feature_names=self.feature_names_15)

        self.assertEqual(result.selected_features.shape, (100, 4))
        self.assertTrue(np.isfinite(result.selected_features).all())


if __name__ == "__main__":
    unittest.main()
