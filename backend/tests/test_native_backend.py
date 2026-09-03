"""
Comprehensive Unit & Integration Test Suite for Phase 3B.2.
Tests native-domain VQC verification pipeline across all 20 required points:
1. Native CSV loads correctly.
2. Dataset has 500 rows.
3. 24 biomarker columns exist.
4. Diagnosis exists.
5. Original Random Forest selector executes.
6. Exactly 10 features are selected.
7. Feature ordering is deterministic across runs.
8. StandardScaler is deterministic across runs.
9. Input shape is (N,10).
10. Checkpoint loads successfully.
11. Checkpoint has expected tensor shapes.
12. DressedVQC accepts the 10-D input.
13. Output shape is (N,2).
14. Probabilities are finite.
15. Probabilities sum to approximately 1.0.
16. API returns HTTP 200 for valid row.
17. Invalid row index is rejected with HTTP 400.
18. Unknown dataset is rejected with HTTP 400.
19. Current 5-feature clinical schema is rejected as native VQC input.
20. No mock fallback exists in production quantum service.
"""

from pathlib import Path
import sys
import unittest
import numpy as np
import pandas as pd
import torch
from fastapi.testclient import TestClient

# Ensure repo root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.main import app, get_quantum_service
from backend.app.quantum.native_preprocessing import (
    NATIVE_DATASET_FILENAME,
    reproduce_native_preprocessing,
)
from backend.app.quantum.service import NativeQuantumService
from quantum_core.hqd_quantum import DressedVQC


class TestNativeQuantumBackend(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.project_root = PROJECT_ROOT
        cls.dataset_path = cls.project_root / NATIVE_DATASET_FILENAME
        cls.checkpoint_path = cls.project_root / "quantum_core" / "vqc_model_weights.pth"
        cls.service = NativeQuantumService(cls.project_root)
        cls.client = TestClient(app)

    # -------------------------------------------------------------------------
    # Test 1-4: Dataset Integrity
    # -------------------------------------------------------------------------
    def test_01_native_csv_loads_correctly(self):
        self.assertTrue(self.dataset_path.exists(), f"Dataset missing: {self.dataset_path}")
        df = pd.read_csv(self.dataset_path)
        self.assertIsInstance(df, pd.DataFrame)

    def test_02_dataset_has_500_rows(self):
        df = pd.read_csv(self.dataset_path)
        self.assertEqual(len(df), 500)

    def test_03_twenty_four_biomarkers_exist(self):
        df = pd.read_csv(self.dataset_path)
        biomarker_cols = [c for c in df.columns if c.startswith("biomarker_")]
        self.assertEqual(len(biomarker_cols), 24)
        for i in range(24):
            self.assertIn(f"biomarker_{i:02d}", df.columns)

    def test_04_diagnosis_exists(self):
        df = pd.read_csv(self.dataset_path)
        self.assertIn("diagnosis", df.columns)
        unique_labels = set(df["diagnosis"].unique())
        self.assertEqual(unique_labels, {0, 1})

    # -------------------------------------------------------------------------
    # Test 5-8: Feature Selection and Scaling Reproducibility
    # -------------------------------------------------------------------------
    def test_05_rf_selector_executes(self):
        artifacts = reproduce_native_preprocessing(self.dataset_path)
        self.assertIsNotNone(artifacts)
        self.assertEqual(len(artifacts.feature_importances), 10)

    def test_06_exactly_10_features_selected(self):
        artifacts = reproduce_native_preprocessing(self.dataset_path)
        self.assertEqual(len(artifacts.selected_feature_names), 10)
        self.assertEqual(len(artifacts.selected_indices), 10)

    def test_07_feature_ordering_is_deterministic(self):
        run1 = reproduce_native_preprocessing(self.dataset_path)
        run2 = reproduce_native_preprocessing(self.dataset_path)
        self.assertEqual(run1.selected_feature_names, run2.selected_feature_names)
        self.assertEqual(run1.selected_indices, run2.selected_indices)
        np.testing.assert_allclose(run1.feature_importances, run2.feature_importances)

    def test_08_standard_scaler_is_deterministic(self):
        run1 = reproduce_native_preprocessing(self.dataset_path)
        run2 = reproduce_native_preprocessing(self.dataset_path)
        np.testing.assert_allclose(run1.scaler_means, run2.scaler_means)
        np.testing.assert_allclose(run1.scaler_scales, run2.scaler_scales)
        np.testing.assert_allclose(run1.X_scaled, run2.X_scaled)

    # -------------------------------------------------------------------------
    # Test 9: Input Shape
    # -------------------------------------------------------------------------
    def test_09_input_shape_is_n_by_10(self):
        artifacts = self.service.artifacts
        self.assertEqual(artifacts.X_scaled.shape, (500, 10))

    # -------------------------------------------------------------------------
    # Test 10-11: Checkpoint Integrity and Tensor Shapes
    # -------------------------------------------------------------------------
    def test_10_checkpoint_loads_cleanly(self):
        self.assertTrue(self.checkpoint_path.exists())
        state_dict = torch.load(str(self.checkpoint_path), map_location="cpu", weights_only=True)
        self.assertIsInstance(state_dict, dict)

    def test_11_checkpoint_has_expected_tensor_shapes(self):
        state_dict = torch.load(str(self.checkpoint_path), map_location="cpu", weights_only=True)
        expected = {
            "q_layer.weights": (2, 10, 3),
            "post_processing.0.weight": (16, 10),
            "post_processing.0.bias": (16,),
            "post_processing.2.weight": (2, 16),
            "post_processing.2.bias": (2,),
        }
        for k, shape in expected.items():
            self.assertIn(k, state_dict)
            self.assertEqual(tuple(state_dict[k].shape), shape)

    # -------------------------------------------------------------------------
    # Test 12-15: Quantum Inference Correctness
    # -------------------------------------------------------------------------
    def test_12_dressed_vqc_accepts_10d_input(self):
        model = self.service.model
        x = torch.zeros((1, 10), dtype=torch.float64)
        with torch.no_grad():
            out = model(x)
        self.assertEqual(out.shape, (1, 2))

    def test_13_output_shape_is_batch_by_2(self):
        model = self.service.model
        x = torch.randn((3, 10), dtype=torch.float64)
        with torch.no_grad():
            out = model(x)
        self.assertEqual(out.shape, (3, 2))

    def test_14_probabilities_are_finite(self):
        model = self.service.model
        x = torch.tensor(self.service.artifacts.X_scaled[:5], dtype=torch.float64)
        with torch.no_grad():
            out = model(x)
        self.assertTrue(torch.isfinite(out).all().item())
        self.assertTrue((out >= 0.0).all().item())
        self.assertTrue((out <= 1.0).all().item())

    def test_15_probabilities_sum_to_one(self):
        model = self.service.model
        x = torch.tensor(self.service.artifacts.X_scaled[:5], dtype=torch.float64)
        with torch.no_grad():
            out = model(x)
        sums = out.sum(dim=1).numpy()
        np.testing.assert_allclose(sums, 1.0, atol=1e-5)

    # -------------------------------------------------------------------------
    # Test 16-19: API Endpoint Validation & Rejection
    # -------------------------------------------------------------------------
    def test_16_api_returns_200_for_valid_row(self):
        resp = self.client.post("/api/quantum/predict", json={
            "dataset": "clinical_data_synthetic.csv",
            "row_index": 0,
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "complete")
        self.assertEqual(data["model"]["name"], "DressedVQC")
        self.assertEqual(data["input"]["patient_id"], "PAT_1000")
        self.assertEqual(data["input"]["feature_count"], 10)
        self.assertIn("Normal", data["prediction"]["probabilities"])
        self.assertIn("High Risk", data["prediction"]["probabilities"])
        prob_sum = sum(data["prediction"]["probabilities"].values())
        self.assertAlmostEqual(prob_sum, 1.0, places=4)

    def test_17_invalid_row_index_rejected_with_400(self):
        resp = self.client.post("/api/quantum/predict", json={
            "dataset": "clinical_data_synthetic.csv",
            "row_index": 9999,
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("out of bounds", resp.json()["detail"])

    def test_18_unknown_dataset_rejected_with_400(self):
        resp = self.client.post("/api/quantum/predict", json={
            "dataset": "unauthorized_clinical_file.csv",
            "row_index": 0,
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Unsupported dataset", resp.json()["detail"])

    def test_19_clinical_demo_schema_explicitly_rejected(self):
        resp = self.client.post("/api/quantum/predict", json={
            "dataset": "sample_clinical_dataset.csv",
            "row_index": 0,
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Unsupported dataset", resp.json()["detail"])

    # -------------------------------------------------------------------------
    # Test 20: No Mock Fallback Verification
    # -------------------------------------------------------------------------
    def test_20_no_mock_fallback_in_quantum_service(self):
        # Verify the service uses PennyLane TorchLayer, not MockQNode
        import pennylane as qml
        from pennylane.qnn import TorchLayer
        self.assertIsInstance(self.service.model.q_layer, TorchLayer)
        # Verify no MockQNode exists in module
        self.assertFalse(hasattr(self.service.model, "mock_node"))
        self.assertFalse(hasattr(self.service.model, "fc"))  # engine_controller's mock head


if __name__ == "__main__":
    unittest.main()
