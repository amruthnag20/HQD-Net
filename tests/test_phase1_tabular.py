"""
Unit tests for Phase 1 Stage 3 Tabular Preprocessing & Validation.
"""

import unittest
from pathlib import Path
import numpy as np
import pandas as pd

from classical_preprocessing.contracts import RawInputContract
from classical_preprocessing.tabular.pipeline import (
    TabularPreprocessingPipeline,
    TabularPreprocessingResult,
)
from classical_preprocessing.tabular.validator import (
    TabularValidationReport,
    analyze_missing_values,
    validate_tabular_schema,
)


class TestPhase1Tabular(unittest.TestCase):

    # -------------------------------------------------------------
    # 1. Real Dataset CSV Processing Test
    # -------------------------------------------------------------
    def test_process_real_synthetic_csv(self):
        csv_path = "clinical_data_synthetic.csv"
        if not Path(csv_path).exists():
            csv_path = "data/processed/clinical_data_synthetic.csv"
        self.assertTrue(Path(csv_path).exists(), "clinical_data_synthetic.csv must exist")

        pipeline = TabularPreprocessingPipeline()
        result = pipeline.fit_transform(csv_path)

        self.assertIsInstance(result, TabularPreprocessingResult)
        self.assertEqual(result.processed_features.shape, (500, 24))
        self.assertEqual(result.processed_features.dtype, np.float64)
        self.assertTrue(np.isfinite(result.processed_features).all())
        self.assertEqual(len(result.feature_names), 24)

        # Check target separation
        self.assertIsNotNone(result.target)
        self.assertEqual(len(result.target), 500)
        self.assertNotIn("diagnosis", result.feature_names)

        # Check patient_id separation
        self.assertIn("patient_id", result.traceability_metadata)
        self.assertEqual(len(result.traceability_metadata["patient_id"]), 500)
        self.assertNotIn("patient_id", result.feature_names)

    # -------------------------------------------------------------
    # 2. DataFrame Ingestion with Mixed Types
    # -------------------------------------------------------------
    def test_mixed_dataframe_fit_transform(self):
        df = pd.DataFrame({
            "patient_id": ["P1", "P2", "P3", "P4"],
            "age": [45.0, 50.0, 65.0, np.nan],
            "cholesterol": [200.0, 240.0, np.nan, 180.0],
            "smoking_status": ["never", "former", "current", np.nan],
            "diagnosis": [0, 1, 1, 0],
        })

        pipeline = TabularPreprocessingPipeline(
            id_columns=["patient_id"],
            target_column="diagnosis",
        )
        result = pipeline.fit_transform(df)

        # Features: age (1) + cholesterol (1) + smoking_status one-hot (3) = 5
        self.assertEqual(result.processed_features.shape[0], 4)
        self.assertEqual(result.processed_features.dtype, np.float64)
        self.assertTrue(np.isfinite(result.processed_features).all())
        self.assertNotIn("patient_id", result.feature_names)
        self.assertNotIn("diagnosis", result.feature_names)
        self.assertIn("patient_id", result.traceability_metadata)
        self.assertEqual(result.traceability_metadata["patient_id"], ["P1", "P2", "P3", "P4"])

    # -------------------------------------------------------------
    # 3. Fit / Transform Isolation (No Data Leakage)
    # -------------------------------------------------------------
    def test_fit_transform_separation(self):
        train_df = pd.DataFrame({
            "patient_id": ["P1", "P2", "P3"],
            "feature1": [10.0, 20.0, 30.0],
            "feature2": ["A", "B", "A"],
            "target": [0, 1, 0],
        })
        test_df = pd.DataFrame({
            "patient_id": ["P4", "P5"],
            "feature1": [15.0, 25.0],
            "feature2": ["A", "C"],  # "C" is unseen category
            "target": [1, 0],
        })

        pipeline = TabularPreprocessingPipeline()
        pipeline.fit(train_df)

        test_result = pipeline.transform(test_df)
        self.assertEqual(test_result.processed_features.shape[0], 2)
        self.assertTrue(np.isfinite(test_result.processed_features).all())
        self.assertEqual(test_result.traceability_metadata["patient_id"], ["P4", "P5"])

    # -------------------------------------------------------------
    # 4. Patient ID Exclusion Verification
    # -------------------------------------------------------------
    def test_patient_id_exclusion(self):
        df = pd.DataFrame({
            "mrn": ["1001", "1002"],
            "ssn": ["000-00-0001", "000-00-0002"],
            "biomarker": [1.2, 3.4],
        })
        pipeline = TabularPreprocessingPipeline(id_columns=["mrn", "ssn"])
        result = pipeline.fit_transform(df)

        self.assertEqual(result.feature_names, ["biomarker"])
        self.assertIn("mrn", result.traceability_metadata)
        self.assertIn("ssn", result.traceability_metadata)

    # -------------------------------------------------------------
    # 5. Target Exclusion Verification
    # -------------------------------------------------------------
    def test_target_exclusion(self):
        df = pd.DataFrame({
            "feature_a": [1.0, 2.0],
            "feature_b": [3.0, 4.0],
            "outcome": [0, 1],
        })
        pipeline = TabularPreprocessingPipeline(target_column="outcome")
        result = pipeline.fit_transform(df)

        self.assertEqual(sorted(result.feature_names), ["feature_a", "feature_b"])
        np.testing.assert_array_equal(result.target, np.array([0, 1]))

    # -------------------------------------------------------------
    # 6. Schema Validation Tests
    # -------------------------------------------------------------
    def test_schema_validator(self):
        df = pd.DataFrame({
            "col1": [1.0, 2.0, 3.0],
            "col2": [10, 10, 10],  # constant
            "col3": [np.nan, np.nan, np.nan],  # empty
        })
        report = validate_tabular_schema(df)
        self.assertIsInstance(report, TabularValidationReport)
        self.assertEqual(report.row_count, 3)
        self.assertEqual(report.column_count, 3)
        self.assertIn("col3", report.empty_columns)
        self.assertIn("col2", report.constant_columns)

    def test_schema_validator_empty_df(self):
        empty_df = pd.DataFrame()
        with self.assertRaises(ValueError):
            validate_tabular_schema(empty_df)

    def test_schema_validator_duplicate_cols(self):
        df = pd.DataFrame([[1, 2]], columns=["a", "a"])
        report = validate_tabular_schema(df)
        self.assertFalse(report.is_valid)
        self.assertIn("a", report.duplicate_columns)

    # -------------------------------------------------------------
    # 7. Invalid & Non-Tabular Input Tests
    # -------------------------------------------------------------
    def test_invalid_none_input(self):
        pipeline = TabularPreprocessingPipeline()
        with self.assertRaises(ValueError):
            pipeline.fit_transform(None)

    def test_reject_non_tabular_image_input(self):
        pipeline = TabularPreprocessingPipeline()
        with self.assertRaises(ValueError) as ctx:
            pipeline.fit_transform("chest_xray.png")
        self.assertIn("Tabular pipeline only accepts TABULAR routing", str(ctx.exception))

    def test_reject_no_features_df(self):
        df = pd.DataFrame({"patient_id": ["P1", "P2"], "diagnosis": [0, 1]})
        pipeline = TabularPreprocessingPipeline(id_columns=["patient_id"], target_column="diagnosis")
        with self.assertRaises(ValueError) as ctx:
            pipeline.fit_transform(df)
        self.assertIn("No usable feature columns remain", str(ctx.exception))

    # -------------------------------------------------------------
    # 8. RawInputContract Support
    # -------------------------------------------------------------
    def test_raw_input_contract_tabular(self):
        df = pd.DataFrame({
            "patient_id": ["PAT_1", "PAT_2"],
            "feat_1": [0.5, -0.3],
            "diagnosis": [1, 0],
        })
        contract = RawInputContract(
            input_source="in_memory",
            input_type="tabular",
            modality="clinical_tabular",
            dataframe=df,
        )
        pipeline = TabularPreprocessingPipeline()
        result = pipeline.fit_transform(contract)
        self.assertEqual(result.processed_features.shape, (2, 1))
        self.assertEqual(result.feature_names, ["feat_1"])


if __name__ == "__main__":
    unittest.main()
