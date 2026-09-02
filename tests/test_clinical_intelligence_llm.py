"""
Unit & Integration Test Suite for Phase 3 Evidence-Grounded Clinical Interpretation Layer.

Tests request construction, latent_vector_10d isolation, prompt formatting, mock provider
determinism, risk score preservation, invalid evidence citation rejections, fallback behavior,
and real end-to-end pipeline execution.
"""

import os
import unittest

from classical_preprocessing.clinical_intelligence.contracts import (
    ClinicalReport,
    PostQuantumResult,
    post_quantum_result_from_payload,
)
from classical_preprocessing.clinical_intelligence.evidence import EvidenceBundle
from classical_preprocessing.clinical_intelligence.ingestion import ingest_json_knowledge_base
from classical_preprocessing.clinical_intelligence.llm import (
    ClinicalLLMRequest,
    ClinicalLLMResponse,
    MockLLMProvider,
    generate_clinical_report,
    generate_fallback_clinical_report,
    validate_and_build_report,
)
from classical_preprocessing.clinical_intelligence.prompting import ClinicalPromptBuilder
from classical_preprocessing.clinical_intelligence.query_builder import ClinicalQueryBuilder
from classical_preprocessing.clinical_intelligence.retrieval import MedicalEvidenceRetriever
from classical_preprocessing.pipeline_runner import run_hqd_real_pipeline


class TestClinicalIntelligenceLLM(unittest.TestCase):

    def setUp(self):
        self.kb_file = "knowledge_base/cardiovascular_guidelines_2025.json"
        self.unique_latent_vector = [0.12345, -0.23456, 0.34567, 0.45678, -0.56789, 0.67891, 0.78912, -0.89123, 0.91234, 0.13579]
        self.sample_payload = {
            "status": "success",
            "meta_summary": {
                "system_name": "HQD-Net OS",
                "active_modalities": ["TABULAR", "IMAGE_2D (TorchXRayVision DenseNet-121)"],
                "sample_ids": ["PATIENT_999"],
            },
            "latent_representation": {
                "dimensions": 10,
                "latent_biomarkers_vector": self.unique_latent_vector,
            },
            "diagnostic_prediction": {
                "disease_risk_score": 0.784,
                "risk_percentage": "78.4%",
                "verdict": "High Risk - Multimodal Anomalies",
            },
            "benchmarking_comparison": {
                "quantum_risk_score": 0.784,
                "classical_svm_risk": 0.650,
                "classical_rf_risk": 0.600,
                "quantum_lift_over_svm": "+13.40%",
            },
            "explainability_breakdown": [
                {"biomarker": "Fasting Blood Glucose", "attribution_weight": 0.60, "impact_percentage": "60.00%"},
                {"biomarker": "Cardiac Troponin-T", "attribution_weight": 0.40, "impact_percentage": "40.00%"},
            ],
            "telemetry_logs": ["[1/5] VQC Model Loaded"],
        }
        self.result = post_quantum_result_from_payload(self.sample_payload)

        if os.path.exists(self.kb_file):
            chunks = ingest_json_knowledge_base(self.kb_file)
            retriever = MedicalEvidenceRetriever(chunks)
            self.evidence_bundle = retriever.retrieve_evidence(self.result, top_k=2)
        else:
            q = ClinicalQueryBuilder.build_query(self.result)
            self.evidence_bundle = EvidenceBundle(query=q, items=(), total_retrieved=0)

    # -------------------------------------------------------------------------
    # 1. Request Construction & Field Verification
    # -------------------------------------------------------------------------
    def test_request_construction(self):
        request = ClinicalLLMRequest(
            sample_id=self.result.sample_id,
            quantum_prediction=self.result.quantum_prediction,
            classical_prediction=self.result.classical_prediction,
            model_comparison=self.result.model_comparison,
            explainability=self.result.explainability,
            evidence_bundle=self.evidence_bundle,
        )

        self.assertEqual(request.sample_id, "PATIENT_999")
        self.assertEqual(request.quantum_prediction.risk_score, 0.784)
        self.assertEqual(request.classical_prediction.svm_risk, 0.650)
        self.assertEqual(len(request.explainability), 2)

    # -------------------------------------------------------------------------
    # 2. STRICT ISOLATION: Latent Vector 10D & Telemetry Excluded
    # -------------------------------------------------------------------------
    def test_latent_isolation(self):
        request = ClinicalLLMRequest(
            sample_id=self.result.sample_id,
            quantum_prediction=self.result.quantum_prediction,
            classical_prediction=self.result.classical_prediction,
            model_comparison=self.result.model_comparison,
            explainability=self.result.explainability,
            evidence_bundle=self.evidence_bundle,
        )

        # Confirm request object has no latent_vector_10d attribute
        self.assertFalse(hasattr(request, "latent_vector_10d"))
        self.assertFalse(hasattr(request, "telemetry_logs"))

        # Confirm prompt generated from request excludes latent float values
        prompt = ClinicalPromptBuilder.build_prompt(self.result, self.evidence_bundle)
        for val in self.unique_latent_vector:
            self.assertNotIn(str(val), prompt)
        self.assertNotIn("VQC Model Loaded", prompt)

    # -------------------------------------------------------------------------
    # 3. Prompt Formatting
    # -------------------------------------------------------------------------
    def test_prompt_construction(self):
        prompt = ClinicalPromptBuilder.build_prompt(self.result, self.evidence_bundle)

        self.assertIn("SYSTEM ROLE & SAFETY RULES", prompt)
        self.assertIn("0.7840", prompt)
        self.assertIn("Fasting Blood Glucose", prompt)
        self.assertIn("--- RETRIEVED MEDICAL EVIDENCE ---", prompt)

    # -------------------------------------------------------------------------
    # 4. Mock Provider Determinism & Report Output
    # -------------------------------------------------------------------------
    def test_mock_provider_determinism(self):
        provider = MockLLMProvider()
        request = ClinicalLLMRequest(
            sample_id=self.result.sample_id,
            quantum_prediction=self.result.quantum_prediction,
            classical_prediction=self.result.classical_prediction,
            model_comparison=self.result.model_comparison,
            explainability=self.result.explainability,
            evidence_bundle=self.evidence_bundle,
        )

        resp1 = provider.generate(request)
        resp2 = provider.generate(request)

        self.assertEqual(resp1.raw_text, resp2.raw_text)
        self.assertEqual(resp1.provider_name, "MockLLMProvider")
        self.assertIn("0.7840", resp1.raw_text)

    # -------------------------------------------------------------------------
    # 5. Risk Score Preservation
    # -------------------------------------------------------------------------
    def test_risk_preservation(self):
        report = generate_clinical_report(self.result, self.evidence_bundle, llm=MockLLMProvider())

        self.assertIsInstance(report, ClinicalReport)
        self.assertIn("0.7840", report.diagnostic_summary)
        self.assertIn("0.7840", report.risk_assessment_interpretation)

    # -------------------------------------------------------------------------
    # 6. Safety Validation: Invalid Evidence Citation Rejection
    # -------------------------------------------------------------------------
    def test_invalid_evidence_id_rejection(self):
        request = ClinicalLLMRequest(
            sample_id=self.result.sample_id,
            quantum_prediction=self.result.quantum_prediction,
            classical_prediction=self.result.classical_prediction,
            model_comparison=self.result.model_comparison,
            explainability=self.result.explainability,
            evidence_bundle=self.evidence_bundle,
        )

        # Invalid response citing [E99] when max evidence count is <= 2
        invalid_dict = {
            "diagnostic_summary": "Summary citing [E99]",
            "risk_assessment_interpretation": "Interpretation citing [E99]",
            "primary_biomarker_analysis": [],
            "clinical_recommendations": [],
        }

        with self.assertRaises(ValueError):
            validate_and_build_report(request, invalid_dict)

    # -------------------------------------------------------------------------
    # 7. Provider Failure Fallback
    # -------------------------------------------------------------------------
    class FailingLLMProvider(MockLLMProvider):
        def generate(self, request: ClinicalLLMRequest) -> ClinicalLLMResponse:
            raise RuntimeError("Connection timed out")

    def test_provider_failure_fallback(self):
        report = generate_clinical_report(self.result, self.evidence_bundle, llm=self.FailingLLMProvider())

        self.assertIsInstance(report, ClinicalReport)
        self.assertIn("unavailable", report.diagnostic_summary)
        self.assertIn("0.7840", report.diagnostic_summary)

    # -------------------------------------------------------------------------
    # 8. Empty Evidence Resilience
    # -------------------------------------------------------------------------
    def test_empty_evidence_handling(self):
        q = ClinicalQueryBuilder.build_query(self.result)
        empty_bundle = EvidenceBundle(query=q, items=(), total_retrieved=0)
        report = generate_clinical_report(self.result, empty_bundle, llm=MockLLMProvider())

        self.assertIsInstance(report, ClinicalReport)
        self.assertIn("No supporting evidence was retrieved", report.risk_assessment_interpretation)

    # -------------------------------------------------------------------------
    # 9. Real End-to-End Pipeline Execution (No LLM API / Offline Mock)
    # -------------------------------------------------------------------------
    def test_real_pipeline_end_to_end(self):
        csv_path = "clinical_data_real.csv"
        if not os.path.exists(csv_path) or not os.path.exists(self.kb_file):
            self.skipTest("Real dataset or KB file missing for E2E LLM test.")

        # 1. Run pipeline -> payload
        payload = run_hqd_real_pipeline(tabular_input=csv_path, backend_choice="VQC")
        # 2. Convert payload -> PostQuantumResult contract
        post_q_result = post_quantum_result_from_payload(payload)
        # 3. Retrieve evidence -> EvidenceBundle
        chunks = ingest_json_knowledge_base(self.kb_file)
        retrieval_engine = MedicalEvidenceRetriever(chunks)
        evidence_bundle = retrieval_engine.retrieve_evidence(post_q_result, top_k=2)
        # 4. Generate ClinicalReport
        report = generate_clinical_report(post_q_result, evidence_bundle, llm=MockLLMProvider())

        self.assertIsInstance(report, ClinicalReport)
        self.assertEqual(report.sample_id, post_q_result.sample_id)
        self.assertTrue(len(report.diagnostic_summary) > 0)
        self.assertTrue(len(report.risk_assessment_interpretation) > 0)
        self.assertIn("attending licensed medical practitioner", report.limitations_and_disclaimer)


if __name__ == "__main__":
    unittest.main()
