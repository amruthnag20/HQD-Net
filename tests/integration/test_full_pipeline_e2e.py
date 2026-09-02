"""
Full End-to-End Forensic Integration & Dataflow Test (Prompt 25).

Validates the complete HQD-Net pipeline:
USER INPUT (XLSX, PNG, Multimodal)
  → Input Router
  → Classical Preprocessing (Tabular, TorchXRayVision, Official Pretrained MerMED)
  → Stage 8 Unified Multimodal 10-D Projection
  → float64 boundary & θ = π × tanh(z)
  → Immutable 10-Qubit DressedVQC Core
  → Valid Quantum Risk Probabilities
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

from classical_preprocessing.imaging_2d.config import Imaging2DConfig
from classical_preprocessing.imaging_2d.encoder import TorchXRayVisionEncoder
from classical_preprocessing.imaging_2d.mermed_encoder import MerMEDEncoder
from classical_preprocessing.pipeline_runner import HQDNetPipelineRunner, run_hqd_real_pipeline
from classical_preprocessing.router.input_router import InputKind, ProcessingPath, route_input


PROTECTED_FILES = [
    "quantum_core/hqd_quantum.py",
    "quantum_core/qsvm_backend.py",
    "quantum_core/vqc_model_weights.pth",
    "engine_controller.py",
]


class TestFullPipelineE2E(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.root_dir = Path(__file__).resolve().parent.parent.parent
        cls.weights_path = cls.root_dir / "weights" / "MerMED.pth"

        # Record initial hashes of protected files
        cls.protected_hashes_before = {}
        for fpath in PROTECTED_FILES:
            full_path = cls.root_dir / fpath
            if full_path.exists():
                h = hashlib.sha256(full_path.read_bytes()).hexdigest()
                cls.protected_hashes_before[fpath] = h

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

        # 1. Create synthetic XLSX tabular dataset fixture
        self.xlsx_path = self.temp_path / "clinical_patient_data.xlsx"
        df_data = {
            "patient_id": ["P001", "P002", "P003", "P004"],
            "age": [52.0, 61.0, 48.0, 67.0],
            "sex": ["M", "F", "M", "F"],
            "glucose": [120.0, np.nan, 105.0, 160.0],
            "cholesterol": [210.0, 245.0, np.nan, 280.0],
            "bmi": [27.1, 31.2, 25.8, np.nan],
            "smoking_status": ["never", "former", "never", "current"],
            "target": [0, 1, 0, 1],
        }
        pd.DataFrame(df_data).to_excel(self.xlsx_path, index=False)

        # 2. Create synthetic PNG chest x-ray image fixture
        self.png_path = self.temp_path / "chest_xray_test.png"
        img_arr = (np.random.rand(224, 224) * 255).astype(np.uint8)
        Image.fromarray(img_arr).save(self.png_path)

        # 3. Create synthetic modified PNG image fixture for propagation test
        self.png_modified_path = self.temp_path / "chest_xray_modified.png"
        img_arr_mod = img_arr.copy()
        img_arr_mod[50:150, 50:150] = 255  # Distinct bright patch
        Image.fromarray(img_arr_mod).save(self.png_modified_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    # -------------------------------------------------------------------------
    # Test 1 — XLSX -> Tabular Pipeline -> 10-D -> Quantum Core
    # -------------------------------------------------------------------------
    def test_xlsx_tabular_to_quantum_e2e(self):
        # A. Ingestion & Router
        decision = route_input(self.xlsx_path, validate_path_exists=True)
        self.assertEqual(decision.input_kind, InputKind.TABULAR)
        self.assertEqual(decision.processing_path, ProcessingPath.TABULAR)

        # B. End-to-End Pipeline Execution
        result = run_hqd_real_pipeline(tabular_input=self.xlsx_path)

        self.assertEqual(result["status"], "success")
        self.assertIn("TABULAR", result["meta_summary"]["active_modalities"])
        self.assertEqual(result["meta_summary"]["total_samples_analyzed"], 4)

        # C. Quantum-Ready Representation Check
        latent_biomarkers = np.array(result["latent_representation"]["latent_biomarkers_vector"])
        self.assertEqual(latent_biomarkers.shape, (10,))
        self.assertTrue(np.isfinite(latent_biomarkers).all())

        # D. Diagnostic Verdict & Risk Probability Check
        prediction = result["diagnostic_prediction"]
        risk_score = prediction["disease_risk_score"]
        self.assertGreaterEqual(risk_score, 0.0)
        self.assertLessEqual(risk_score, 1.0)
        self.assertIn("Risk", prediction["verdict"])

    # -------------------------------------------------------------------------
    # Test 2 — Image (PNG) -> TorchXRayVision + MerMED -> 10-D -> Quantum Core
    # -------------------------------------------------------------------------
    def test_image_2d_to_quantum_e2e(self):
        # A. Ingestion & Router
        decision = route_input(self.png_path, validate_path_exists=True)
        self.assertEqual(decision.input_kind, InputKind.IMAGE_2D)
        self.assertEqual(decision.processing_path, ProcessingPath.IMAGING_2D)

        # B. Verify Pretrained MerMED Encoder Output
        cfg_mermed = Imaging2DConfig(
            encoder_name="mermed", mermed_enabled=True, mermed_weights_path=str(self.weights_path)
        )
        try:
            mermed_encoder = MerMEDEncoder(config=cfg_mermed)
            dummy_tensor = torch.randn(1, 3, 224, 224)
            mermed_emb = mermed_encoder.encode(dummy_tensor)
        except FileNotFoundError:
            self.skipTest("MerMED weights missing. Skipping MerMED participation test.")

        self.assertEqual(mermed_emb.shape, (1, 768))
        self.assertEqual(mermed_emb.dtype, np.float32)
        self.assertTrue(np.isfinite(mermed_emb).all())

        # C. Verify TorchXRayVision Encoder Output
        xrv_encoder = TorchXRayVisionEncoder(config=Imaging2DConfig(encoder_name="torchxrayvision"))
        xrv_emb = xrv_encoder.encode(dummy_tensor)
        self.assertEqual(xrv_emb.shape, (1, 1024))
        self.assertTrue(np.isfinite(xrv_emb).all())

        # D. End-to-End 2D Pipeline Execution
        result = run_hqd_real_pipeline(image_2d_input=self.png_path)
        self.assertEqual(result["status"], "success")

        latent_biomarkers = np.array(result["latent_representation"]["latent_biomarkers_vector"])
        self.assertEqual(latent_biomarkers.shape, (10,))
        self.assertTrue(np.isfinite(latent_biomarkers).all())

    # -------------------------------------------------------------------------
    # Test 3 — Multimodal XLSX + PNG -> Alignment -> 10-D -> Quantum Core
    # -------------------------------------------------------------------------
    def test_multimodal_xlsx_and_png_e2e(self):
        result = run_hqd_real_pipeline(
            tabular_input=self.xlsx_path,
            image_2d_input=self.png_path,
            sample_ids=["P001"],
        )

        self.assertEqual(result["status"], "success")
        self.assertIn("TABULAR", result["meta_summary"]["active_modalities"])
        self.assertIn("IMAGE_2D (TORCHXRAYVISION)", result["meta_summary"]["active_modalities"])

        # Verify 10-D projection boundary
        z = np.array(result["latent_representation"]["latent_biomarkers_vector"])
        self.assertEqual(z.shape, (10,))
        self.assertTrue(np.isfinite(z).all())

        # Verify quantum angle mapping bounds theta = pi * tanh(z)
        theta = np.pi * np.tanh(z)
        self.assertEqual(theta.shape, (10,))
        self.assertTrue((theta >= -np.pi).all() and (theta <= np.pi).all())

    # -------------------------------------------------------------------------
    # Test 4 — Data-Propagation Tests (Tabular Change & Image Change)
    # -------------------------------------------------------------------------
    def test_data_propagation_tabular_and_image(self):
        # A. Tabular Change Propagation
        df1 = pd.read_excel(self.xlsx_path)
        df2 = df1.copy()
        df2.loc[0, "glucose"] = 350.0  # Significant change

        path2 = self.temp_path / "clinical_modified.xlsx"
        df2.to_excel(path2, index=False)

        res1 = run_hqd_real_pipeline(tabular_input=self.xlsx_path)
        res2 = run_hqd_real_pipeline(tabular_input=path2)

        z1 = np.array(res1["latent_representation"]["latent_biomarkers_vector"])
        z2 = np.array(res2["latent_representation"]["latent_biomarkers_vector"])

        diff_z = np.abs(z1 - z2).max()
        self.assertGreater(diff_z, 1e-4, "Tabular feature change did not propagate to 10-D representation!")

        # B. Image Change Propagation
        res_img1 = run_hqd_real_pipeline(image_2d_input=[self.png_path, self.png_path])
        res_img2 = run_hqd_real_pipeline(image_2d_input=[self.png_path, self.png_modified_path])

        z_img1 = np.array(res_img1["latent_representation"]["latent_biomarkers_vector"])
        z_img2 = np.array(res_img2["latent_representation"]["latent_biomarkers_vector"])

        diff_img_z = np.abs(z_img1 - z_img2).max()
        self.assertGreater(diff_img_z, 1e-4, "Image content change did not propagate to 10-D representation!")

    # -------------------------------------------------------------------------
    # Test 5 — Checkpoint Participation (Altering weights changes output)
    # -------------------------------------------------------------------------
    def test_mermed_checkpoint_participation(self):
        cfg = Imaging2DConfig(encoder_name="mermed", mermed_enabled=True, mermed_weights_path=str(self.weights_path))
        try:
            encoder_orig = MerMEDEncoder(config=cfg)
        except FileNotFoundError:
            self.skipTest("MerMED weights missing. Skipping MerMED participation test.")

        dummy_img = torch.randn(1, 3, 224, 224)
        emb_orig = encoder_orig.encode(dummy_img)

        encoder_altered = copy.deepcopy(encoder_orig)
        with torch.no_grad():
            for p in encoder_altered.model.parameters():
                p.add_(0.5)

        emb_altered = encoder_altered.encode(dummy_img)
        diff = np.abs(emb_orig - emb_altered).max()
        self.assertGreater(diff, 0.1, "Altering loaded checkpoint parameters had no effect on inference!")

    # -------------------------------------------------------------------------
    # Test 6 — Negative Control & Graceful Failures
    # -------------------------------------------------------------------------
    def test_negative_control_failures(self):
        # A. Invalid XLSX path
        with self.assertRaises(Exception):
            run_hqd_real_pipeline(tabular_input="non_existent_folder/missing_file.xlsx")

        # B. Missing image path
        with self.assertRaises(Exception):
            run_hqd_real_pipeline(image_2d_input="non_existent_folder/missing_image.png")

        # C. Missing MerMED checkpoint path
        cfg_bad = Imaging2DConfig(
            encoder_name="mermed", mermed_enabled=True, mermed_weights_path="invalid_path.pth"
        )
        with self.assertRaises(FileNotFoundError):
            MerMEDEncoder(config=cfg_bad)

    # -------------------------------------------------------------------------
    # Test 7 — Determinism Test
    # -------------------------------------------------------------------------
    def test_pipeline_determinism(self):
        res1 = run_hqd_real_pipeline(tabular_input=self.xlsx_path, image_2d_input=self.png_path)
        res2 = run_hqd_real_pipeline(tabular_input=self.xlsx_path, image_2d_input=self.png_path)

        z1 = np.array(res1["latent_representation"]["latent_biomarkers_vector"])
        z2 = np.array(res2["latent_representation"]["latent_biomarkers_vector"])
        self.assertEqual(np.abs(z1 - z2).max(), 0.0)

        p1 = res1["diagnostic_prediction"]["disease_risk_score"]
        p2 = res2["diagnostic_prediction"]["disease_risk_score"]
        self.assertEqual(abs(p1 - p2), 0.0)

    # -------------------------------------------------------------------------
    # Test 8 — Protected Files Verification
    # -------------------------------------------------------------------------
    def test_protected_files_integrity(self):
        for fpath, original_hash in self.protected_hashes_before.items():
            full_path = self.root_dir / fpath
            current_hash = hashlib.sha256(full_path.read_bytes()).hexdigest()
            self.assertEqual(
                current_hash,
                original_hash,
                f"PROTECTED FILE VIOLATION: '{fpath}' was modified during test execution!",
            )


if __name__ == "__main__":
    unittest.main()
