"""
Comprehensive End-to-End Architecture Verification Suite for HQD-Net.
Validates all 28 architecture stages and 17 development phases.
"""

import hashlib
import json
import os
import pathlib
import sys
import unittest

# Ensure project root is in sys.path
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from classical_preprocessing.cpm import CommonPatientModel
from classical_preprocessing.clinical_intelligence.input_llm import InputMedicalLLM
from classical_preprocessing.candidate_parameters import extract_candidate_parameter_space
from classical_preprocessing.parameter_priority import compute_parameter_priority_scores
from classical_preprocessing.topk_selection import select_topk_parameters
from classical_preprocessing.classical_models import ClassicalAIEngine
from classical_preprocessing.verification import verify_dual_models
from classical_preprocessing.multimodal_routing import MultimodalIngestionRouter
from classical_preprocessing.clinical_intelligence.orchestrator import run_clinical_analysis

from backend.app.feedback_db import FeedbackRecord, save_feedback, get_all_feedback, init_feedback_db
from backend.app.monitoring import calculate_monitoring_metrics
from backend.app.model_registry import get_model_registry


class TestHQDNetArchitecture(unittest.TestCase):

    def test_01_protected_hashes(self):
        """Verify immutable quantum core SHA256 hashes."""
        expected = {
            "quantum_core/hqd_quantum.py": "ab3702865bbe78272d815aedea6072a504214c3052663dded3a011767b362465",
            "quantum_core/qsvm_backend.py": "b4766de27aa18b7f07ab5fa57e9a2a1e3290ee82a1f8db5574bfbb208a1b276e",
            "quantum_core/vqc_model_weights.pth": "73108e0e92480b98da073fbb36d4b80b99391bd7691e72bdccd188c685e9cb60",
            "engine_controller.py": "8cac75bb1f0b6459e1ff14b2e38fe8f516a46c232ce642b96d9a3f6c2e7e046e"
        }
        for file_path, exp_hash in expected.items():
            p = pathlib.Path(file_path)
            self.assertTrue(p.exists(), f"File {file_path} missing")
            actual_hash = hashlib.sha256(p.read_bytes()).hexdigest()
            self.assertEqual(actual_hash, exp_hash, f"Hash mismatch on {file_path}")

    def test_02_common_patient_model(self):
        """Verify structured CPM creation and field preservation."""
        cpm = CommonPatientModel(patient_id="PAT_TEST_01", age=54.0, systolic_bp=138.0)
        cpm_dict = cpm.to_dict()
        self.assertEqual(cpm_dict["patient_id"], "PAT_TEST_01")
        self.assertEqual(cpm_dict["age"], 54.0)
        self.assertEqual(cpm_dict["systolic_bp"], 138.0)
        self.assertIsNone(cpm_dict["diastolic_bp"])

    def test_03_input_medical_llm(self):
        """Verify Input LLM entity normalization and execution status flag."""
        input_llm = InputMedicalLLM()
        base_cpm = CommonPatientModel(patient_id="PAT_TEST_02")
        raw_text = "Patient is a 60yo female presenting with severe chest pain and dyspnea. BP 145/90. Taking aspirin."
        updated_cpm, meta = input_llm.process_raw_text_to_cpm(raw_text, base_cpm)
        
        self.assertIn(meta["execution_status"], ["MEDIPHI_LOCAL_EXECUTED", "MEDIPHI_LOCAL_UNAVAILABLE_FALLBACK_EXECUTED"])
        self.assertEqual(updated_cpm.systolic_bp, 145.0)
        self.assertEqual(updated_cpm.diastolic_bp, 90.0)
        self.assertIn("chest pain", updated_cpm.symptoms)

    def test_04_candidate_parameter_space(self):
        """Verify candidate parameter extraction from CPM."""
        cpm = CommonPatientModel(patient_id="PAT_TEST_03", age=50.0, bmi=28.4, systolic_bp=130.0)
        candidates = extract_candidate_parameter_space(cpm)
        self.assertGreaterEqual(len(candidates), 3)
        names = [c.name for c in candidates]
        self.assertIn("Age", names)
        self.assertIn("Body Mass Index (BMI)", names)

    def test_05_parameter_priority_engine(self):
        """Verify multi-signal parameter priority ranking."""
        cpm = CommonPatientModel(patient_id="PAT_TEST_04", age=50.0, bmi=28.4, systolic_bp=145.0)
        candidates = extract_candidate_parameter_space(cpm)
        ranked = compute_parameter_priority_scores(candidates)
        self.assertEqual(len(ranked), len(candidates))
        self.assertEqual(ranked[0].rank, 1)

    def test_06_topk_selection(self):
        """Verify TOP-K selection output."""
        cpm = CommonPatientModel(patient_id="PAT_TEST_05", age=50.0, bmi=28.4, systolic_bp=145.0)
        candidates = extract_candidate_parameter_space(cpm)
        ranked = compute_parameter_priority_scores(candidates)
        selected, audit = select_topk_parameters(ranked, top_k=5)
        self.assertLessEqual(len(selected), 5)
        self.assertEqual(audit["configured_top_k"], 5)

    def test_07_classical_models_and_xai(self):
        """Verify Random Forest CVD + SVM 10-D classical execution and XAI."""
        engine = ClassicalAIEngine()
        import numpy as np
        raw_12d = np.array([50, 1, 168, 62, 22.0, 120, 80, 1, 1, 0, 0, 1])
        latent_10d = np.zeros(10)
        res = engine.run_classical_inference(raw_12d, latent_10d)
        self.assertTrue(res["comparison_compatible"])
        self.assertIn("primary_risk_score", res)

    def test_08_dual_model_verification(self):
        """Verify dual-model agreement / disagreement verification engine."""
        res_agree = verify_dual_models(0.52, 0.50, threshold=0.15)
        self.assertEqual(res_agree.agreement_status, "AGREEMENT")
        
        res_disagree = verify_dual_models(0.82, 0.50, threshold=0.15)
        self.assertEqual(res_disagree.agreement_status, "DISAGREEMENT")

    def test_09_multimodal_ecg_and_ocr(self):
        """Verify ECG 1D CNN and OCR document routing."""
        router = MultimodalIngestionRouter()
        import numpy as np
        ecg_res = router.process_ecg_input(np.random.randn(100))
        self.assertIn("status", ecg_res)
        
        ocr_res = router.process_ocr_document("Patient cardiology report. Troponin elevated.")
        self.assertEqual(ocr_res["ocr_status"], "PROCESSED")

    def test_10_feedback_db(self):
        """Verify clinician feedback DB insert and query."""
        init_feedback_db()
        rec = FeedbackRecord(
            sample_id="PAT_TEST_FB",
            clinician_decision="AGREE",
            comments="Verified alignment."
        )
        row_id = save_feedback(rec)
        self.assertGreater(row_id, 0)
        all_fb = get_all_feedback()
        self.assertGreaterEqual(len(all_fb), 1)

    def test_11_monitoring_and_retraining(self):
        """Verify real-time monitoring metrics calculation."""
        metrics = calculate_monitoring_metrics()
        self.assertIn("total_feedback_count", metrics)
        self.assertIn("model_drift_status", metrics)

    def test_12_model_registry(self):
        """Verify runtime model registry query."""
        registry = get_model_registry()
        self.assertGreaterEqual(len(registry), 3)

    def test_13_full_end_to_end_runtime(self):
        """Verify full end-to-end clinical analysis pipeline execution."""
        sample_features = [55, 2, 175, 80, 26.1, 140, 90, 2, 1, 0, 0, 1]
        res = run_clinical_analysis(
            raw_features=sample_features,
            tabular_file_path="clinical_data_synthetic.csv",
            document_text="Cardiology consultation note: Patient experiences exertional dyspnea.",
            ecg_input=[0.1] * 100
        )
        self.assertEqual(res.get("status"), "success")
        self.assertIn("cpm", res)
        self.assertIn("candidate_parameter_space", res)
        self.assertIn("parameter_priority_engine", res)
        self.assertIn("topk_selection", res)
        self.assertIn("classical_ai_engine", res)
        self.assertIn("dual_model_verification", res)
        self.assertIn("generative_report", res)


if __name__ == "__main__":
    unittest.main()
