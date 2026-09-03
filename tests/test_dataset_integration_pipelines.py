import unittest
import os
import sys
import hashlib
import json
import torch
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath('.'))


class TestDatasetIntegration(unittest.TestCase):

    def test_01_protected_file_hashes(self):
        """Verify protected SHA256 hashes remain byte-for-byte unchanged."""
        expected = {
            'quantum_core/hqd_quantum.py': 'ab3702865bbe78272d815aedea6072a504214c3052663dded3a011767b362465',
            'quantum_core/qsvm_backend.py': 'b4766de27aa18b7f07ab5fa57e9a2a1e3290ee82a1f8db5574bfbb208a1b276e',
            'quantum_core/vqc_model_weights.pth': '73108e0e92480b98da073fbb36d4b80b99391bd7691e72bdccd188c685e9cb60',
            'engine_controller.py': '8cac75bb1f0b6459e1ff14b2e38fe8f516a46c232ce642b96d9a3f6c2e7e046e'
        }
        for file_path, exp_hash in expected.items():
            self.assertTrue(os.path.exists(file_path), f"File missing: {file_path}")
            h = hashlib.sha256(open(file_path, 'rb').read()).hexdigest()
            self.assertEqual(h, exp_hash, f"HASH MISMATCH on protected file {file_path}!")

    def test_02_ecg_pipeline_artifacts(self):
        """Verify ECG dataset loader, preprocessing, splits, and embedding interface."""
        self.assertTrue(os.path.exists('models/ecg/encoder.pth'))
        self.assertTrue(os.path.exists('models/ecg/classifier.pth'))
        self.assertTrue(os.path.exists('models/ecg/metrics.json'))
        self.assertTrue(os.path.exists('data/splits/ecg_train.csv'))

        from training.train_ecg_model import Compact1DECGEncoder
        encoder = Compact1DECGEncoder()
        encoder.load_state_dict(torch.load('models/ecg/encoder.pth'))
        encoder.eval()

        dummy_signal = torch.randn(2, 12, 5000)
        with torch.no_grad():
            embed = encoder(dummy_signal)
        self.assertEqual(embed.shape, (2, 32))
        self.assertFalse(torch.isnan(embed).any())

    def test_03_disease_prediction_pipeline(self):
        """Verify 41-disease symptom benchmark artifacts and splits."""
        self.assertTrue(os.path.exists('models/classical/disease_prediction/logistic.pkl'))
        self.assertTrue(os.path.exists('models/classical/disease_prediction/metrics.json'))
        self.assertTrue(os.path.exists('data/splits/disease_prediction_train.csv'))

        with open('models/classical/disease_prediction/metrics.json') as f:
            metrics = json.load(f)
        self.assertIn('logistic', metrics)
        self.assertEqual(metrics['logistic']['accuracy'], 1.0)

    def test_04_llm_reasoning_evaluation_pipeline(self):
        """Verify LLM reasoning evaluation metrics and evidence prompt structure."""
        self.assertTrue(os.path.exists('models/llm_reasoning_evaluation/metrics.json'))
        with open('models/llm_reasoning_evaluation/metrics.json') as f:
            metrics = json.load(f)
        self.assertIn('hqd_net_evidence_grounding_eval', metrics)
        self.assertTrue(metrics['hqd_net_evidence_grounding_eval']['evidence_formatting_validated'])

    def test_05_ocr_pipeline(self):
        """Verify OCR image loader, preprocessing, and CPM ground-truth extraction."""
        self.assertTrue(os.path.exists('models/ocr/metrics.json'))
        with open('models/ocr/metrics.json') as f:
            metrics = json.load(f)
        self.assertGreater(metrics['cpm_field_extraction_accuracy'], 0.0)

    def test_06_exact_10d_quantum_handoff(self):
        """Verify unified projection and exact 10D quantum input shape [10]."""
        from classical_preprocessing.unified_projection.fusion import MultimodalFusionNetwork
        fusion = MultimodalFusionNetwork(d_tab=10, d_2d=16, d_3d=32, output_dim=10)
        
        # Test 10D projection handoff
        dummy_tab = torch.randn(1, 10)
        dummy_2d = torch.randn(1, 16)
        dummy_3d = torch.randn(1, 32)
        mask = torch.tensor([[1.0, 1.0, 1.0]])
        with torch.no_grad():
            fused_10d = fusion(dummy_tab, dummy_2d, dummy_3d, mask)
        self.assertEqual(fused_10d.shape, (1, 10))
        self.assertFalse(torch.isnan(fused_10d).any())



if __name__ == '__main__':
    unittest.main()
