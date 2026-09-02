import unittest
from pathlib import Path
import numpy as np

from classical_preprocessing.pipeline_runner import run_hqd_real_pipeline

class TestMerMEDLivePlumbing(unittest.TestCase):
    def setUp(self):
        self.root_dir = Path(__file__).resolve().parent.parent.parent
        self.xray_path = self.root_dir / "mock_chest_xray.png"
        self.weights_path = self.root_dir / "weights" / "MerMED.pth"
        # 24 features to match the pipeline expected input length
        self.tabular_input = np.random.rand(1, 24).tolist()

    def test_torchxrayvision_default_live_pipeline(self):
        """Prove that the original TorchXRayVision path still works."""
        payload = run_hqd_real_pipeline(
            tabular_input=self.tabular_input,
            image_2d_input=str(self.xray_path),
            encoder_2d="torchxrayvision"
        )
        self.assertEqual(payload.get("status"), "success")
        self.assertEqual(payload["latent_representation"]["dimensions"], 10)
        logs = payload.get("telemetry_logs", [])
        self.assertTrue(any("TORCHXRAYVISION" in log.upper() for log in logs), "Logs should indicate TorchXRayVision was used.")

    def test_mermed_live_pipeline(self):
        """Prove that the MerMED path can be dynamically activated."""
        if not self.weights_path.exists():
            self.skipTest("MerMED weights missing. Skipping live plumbing test.")

        payload = run_hqd_real_pipeline(
            tabular_input=self.tabular_input,
            image_2d_input=str(self.xray_path),
            encoder_2d="mermed"
        )
        self.assertEqual(payload.get("status"), "success")
        # Assert dimensionality
        self.assertEqual(payload["latent_representation"]["dimensions"], 10)
        self.assertEqual(len(payload["latent_representation"]["latent_biomarkers_vector"]), 10)
        
        # Verify the logs explicitly state MerMED was used and returned a 768-D embedding prior to fusion
        logs = payload.get("telemetry_logs", [])
        mermed_log_found = any("MERMED" in log.upper() for log in logs)
        self.assertTrue(mermed_log_found, "Logs should explicitly indicate MerMED was used.")
        
        dim_768_log_found = any("768-D EMBEDDING" in log.upper() for log in logs)
        self.assertTrue(dim_768_log_found, "Logs should trace the 768-D MerMED embedding dimension.")

if __name__ == "__main__":
    unittest.main()
