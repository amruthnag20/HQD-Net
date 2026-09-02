"""
Comprehensive Integration Tests for HQD-Net Frontend <-> Real Backend Boundary (Prompt 16).
Verifies end-to-end execution from frontend input gateway through real classical encoders,
Stage 8 multimodal projection, Stage 9 quantum handoff, and the frozen quantum core.
"""

import hashlib
import tempfile
import unittest
from pathlib import Path
import nibabel as nib
import numpy as np
import pandas as pd
from PIL import Image
import torch

from classical_preprocessing.pipeline_runner import HQDNetPipelineRunner, run_hqd_real_pipeline
from frontend.app import query_classical_controller


class TestPhase1FrontendBackendIntegration(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)

        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

        # 1. Create synthetic tabular CSV file
        self.csv_path = self.temp_path / "patient_records.csv"
        df = pd.DataFrame(
            np.random.randn(4, 24),
            columns=[f"feature_{i+1}" for i in range(24)],
        )
        df["sample_id"] = [f"PATIENT_{i+1:03d}" for i in range(4)]
        df.to_csv(self.csv_path, index=False)

        # 2. Create synthetic 2D CXR image file
        self.cxr_path = self.temp_path / "cxr_scan.png"
        cxr_arr = (np.random.rand(224, 224) * 255).astype(np.uint8)
        Image.fromarray(cxr_arr).save(self.cxr_path)

        # 3. Create synthetic 3D MRI volume file
        self.mri_path = self.temp_path / "mri_volume.nii.gz"
        mri_arr = np.random.randn(32, 32, 32).astype(np.float32)
        nii_img = nib.Nifti1Image(mri_arr, affine=np.eye(4))
        nib.save(nii_img, str(self.mri_path))

        # Hashes of protected files
        self.protected_files = {
            "hqd_quantum": Path("quantum_core/hqd_quantum.py"),
            "qsvm_backend": Path("quantum_core/qsvm_backend.py"),
            "vqc_weights": Path("quantum_core/vqc_model_weights.pth"),
            "engine_controller": Path("engine_controller.py"),
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
                    f"Protected artifact {path} was modified during test execution!",
                )
        self.temp_dir.cleanup()

    # -------------------------------------------------------------------------
    # Test A — Tabular Input Execution (CSV -> Backend -> Quantum -> Result)
    # -------------------------------------------------------------------------
    def test_tabular_csv_end_to_end(self):
        payload = query_classical_controller(tabular_file_path=self.csv_path, backend_choice="VQC")

        self.assertEqual(payload["status"], "success")
        self.assertIn("TABULAR", payload["meta_summary"]["active_modalities"])
        self.assertEqual(payload["latent_representation"]["dimensions"], 10)
        self.assertIn("risk_percentage", payload["diagnostic_prediction"])
        self.assertIn("verdict", payload["diagnostic_prediction"])
        self.assertTrue(len(payload["explainability_breakdown"]) > 0)
        self.assertIn("generative_report", payload)

    # -------------------------------------------------------------------------
    # Test B — 2D Image Input Execution (X-Ray -> TorchXRayVision -> Quantum -> Result)
    # -------------------------------------------------------------------------
    def test_2d_xray_end_to_end(self):
        payload = query_classical_controller(image_2d_path=self.cxr_path, backend_choice="VQC")

        self.assertEqual(payload["status"], "success")
        self.assertTrue(
            any("TorchXRayVision" in m for m in payload["meta_summary"]["active_modalities"])
        )
        self.assertEqual(payload["latent_representation"]["dimensions"], 10)
        self.assertIn("risk_percentage", payload["diagnostic_prediction"])

    # -------------------------------------------------------------------------
    # Test C — 3D Image Input Execution (NIfTI -> MONAI -> MedicalNet -> Quantum -> Result)
    # -------------------------------------------------------------------------
    def test_3d_mri_end_to_end(self):
        payload = query_classical_controller(image_3d_path=self.mri_path, backend_choice="VQC")

        self.assertEqual(payload["status"], "success")
        self.assertTrue(
            any("MedicalNet" in m for m in payload["meta_summary"]["active_modalities"])
        )
        self.assertEqual(payload["latent_representation"]["dimensions"], 10)
        self.assertIn("risk_percentage", payload["diagnostic_prediction"])

    # -------------------------------------------------------------------------
    # Test D — Multimodal Input Execution (Tabular + X-Ray + 3D MRI)
    # -------------------------------------------------------------------------
    def test_multimodal_end_to_end(self):
        payload = query_classical_controller(
            raw_features=list(np.random.rand(24)),
            tabular_file_path=self.csv_path,
            image_2d_path=self.cxr_path,
            image_3d_path=self.mri_path,
            backend_choice="VQC",
        )

        self.assertEqual(payload["status"], "success")
        active = payload["meta_summary"]["active_modalities"]
        self.assertEqual(len(active), 3)
        self.assertTrue(any("TABULAR" in m for m in active))
        self.assertTrue(any("TorchXRayVision" in m for m in active))
        self.assertTrue(any("MedicalNet" in m for m in active))
        self.assertEqual(payload["latent_representation"]["dimensions"], 10)

    # -------------------------------------------------------------------------
    # Test E — Missing Modality Execution (Tabular + 2D without 3D)
    # -------------------------------------------------------------------------
    def test_missing_3d_modality_end_to_end(self):
        payload = query_classical_controller(
            tabular_file_path=self.csv_path,
            image_2d_path=self.cxr_path,
            image_3d_path=None,
            backend_choice="VQC",
        )

        self.assertEqual(payload["status"], "success")
        active = payload["meta_summary"]["active_modalities"]
        self.assertEqual(len(active), 2)
        self.assertFalse(any("MedicalNet" in m for m in active))

    # -------------------------------------------------------------------------
    # Test F — Invalid Input Error Handling
    # -------------------------------------------------------------
    def test_invalid_input_error_handling(self):
        bad_path = self.temp_path / "corrupted.txt"
        bad_path.write_text("invalid content")

        payload = query_classical_controller(tabular_file_path=bad_path, backend_choice="VQC")
        self.assertEqual(payload["status"], "error")
        self.assertIn("error_message", payload)

    # -------------------------------------------------------------------------
    # Test G — Real Pretrained Model Execution Verification
    # -------------------------------------------------------------------------
    def test_real_pretrained_encoders_active(self):
        runner = HQDNetPipelineRunner()

        pipeline_2d = runner._get_2d_pipeline()
        self.assertEqual(pipeline_2d.encoder.embedding_dim, 1024)

        pipeline_3d = runner._get_3d_pipeline()
        self.assertEqual(pipeline_3d.encoder.embedding_dim, 512)
        self.assertEqual(pipeline_3d.encoder.matched_param_count, 72)

    # -------------------------------------------------------------------------
    # Test H — Protected Files Integrity Check
    # -------------------------------------------------------------------------
    def test_protected_files_integrity(self):
        for name, path in self.protected_files.items():
            self.assertTrue(path.exists(), f"Protected file {path} is missing!")
            cur_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(
                self.initial_hashes[name],
                cur_hash,
                f"Protected file {path} was altered!",
            )


if __name__ == "__main__":
    unittest.main()
