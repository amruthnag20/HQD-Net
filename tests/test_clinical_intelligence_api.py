"""
Unit & Integration Test Suite for Phase 4 Backend/API Integration & Data Contract.

Tests API response serialization, risk score preservation, QuXAI attribution preservation,
evidence provenance retention, error payload safety, and frontend gateway execution.
"""

import json
import os
import unittest

from classical_preprocessing.clinical_intelligence.api_contract import (
    build_api_error_payload,
    build_api_response_payload,
)
from classical_preprocessing.clinical_intelligence.contracts import post_quantum_result_from_payload
from classical_preprocessing.clinical_intelligence.evidence import EvidenceBundle
from classical_preprocessing.clinical_intelligence.ingestion import ingest_json_knowledge_base
from classical_preprocessing.clinical_intelligence.llm import (
    MockLLMProvider,
    generate_clinical_report,
)
from classical_preprocessing.clinical_intelligence.orchestrator import run_clinical_analysis
from classical_preprocessing.clinical_intelligence.query_builder import ClinicalQueryBuilder
from classical_preprocessing.clinical_intelligence.retrieval import MedicalEvidenceRetriever
from frontend.app import query_classical_controller


class TestClinicalIntelligenceAPI(unittest.TestCase):

    def setUp(self):
        self.kb_file = "knowledge_base/cardiovascular_guidelines_2025.json"
        self.sample_payload = {
            "status": "success",
            "meta_summary": {
                "system_name": "HQD-Net OS",
                "active_modalities": ["TABULAR", "IMAGE_2D (TorchXRayVision DenseNet-121)"],
                "sample_ids": ["PATIENT_777"],
            },
            "latent_representation": {
                "dimensions": 10,
                "latent_biomarkers_vector": [0.1, -0.2, 0.3, 0.4, -0.5, 0.6, 0.7, -0.8, 0.9, 0.0],
            },
            "diagnostic_prediction": {
                "disease_risk_score": 0.784,
                "risk_percentage": "78.4%",
                "verdict": "High Risk - Multimodal Cardiac Anomalies",
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
            self.evidence = retriever.retrieve_evidence(self.result, top_k=2)
        else:
            q = ClinicalQueryBuilder.build_query(self.result)
            self.evidence = EvidenceBundle(query=q, items=(), total_retrieved=0)

        self.report = generate_clinical_report(self.result, self.evidence, llm=MockLLMProvider())

    # -------------------------------------------------------------------------
    # 1. API Response Serialization & JSON Compatibility
    # -------------------------------------------------------------------------
    def test_api_serialization(self):
        payload = build_api_response_payload(self.result, self.evidence, self.report)

        self.assertEqual(payload["status"], "success")
        self.assertEqual(payload["sample_id"], "PATIENT_777")
        self.assertIn("prediction", payload)

        # JSON Serialization Test
        json_str = json.dumps(payload)
        reconstructed = json.loads(json_str)
        self.assertEqual(reconstructed["sample_id"], "PATIENT_777")

    # -------------------------------------------------------------------------
    # 2. Risk Score & QuXAI Attribution Preservation
    # -------------------------------------------------------------------------
    def test_risk_and_quxai_preservation(self):
        payload = build_api_response_payload(self.result, self.evidence, self.report)

        q_pred = payload["prediction"]["quantum"]
        self.assertEqual(q_pred["risk_score"], 0.784)

        explainability = payload["explainability"]
        self.assertEqual(len(explainability), 2)
        self.assertEqual(explainability[0]["biomarker"], "Fasting Blood Glucose")
        self.assertEqual(explainability[0]["attribution_weight"], 0.60)

    # -------------------------------------------------------------------------
    # 3. Evidence Provenance Retention
    # -------------------------------------------------------------------------
    def test_evidence_provenance(self):
        payload = build_api_response_payload(self.result, self.evidence, self.report)

        evidence_items = payload["evidence"]
        self.assertEqual(len(evidence_items), len(self.evidence.items))

        if evidence_items:
            first_item = evidence_items[0]
            self.assertEqual(first_item["id"], "E1")
            self.assertTrue(len(first_item["document_title"]) > 0)
            self.assertTrue(len(first_item["source"]) > 0)
            self.assertGreaterEqual(first_item["relevance_score"], 0.0)

    # -------------------------------------------------------------------------
    # 4. Error Payload Safety
    # -------------------------------------------------------------------------
    def test_error_payload_safety(self):
        err_payload = build_api_error_payload("TEST_ERROR", "Pipeline execution failed.")

        self.assertEqual(err_payload["status"], "error")
        self.assertEqual(err_payload["error"]["code"], "TEST_ERROR")
        self.assertNotIn("traceback", json.dumps(err_payload))

    # -------------------------------------------------------------------------
    # 5. Frontend Gateway Integration Execution
    # -------------------------------------------------------------------------
    def test_frontend_gateway_execution(self):
        raw_features = [45.0] + [0.0] * 23
        payload = query_classical_controller(raw_features=raw_features, backend_choice="VQC")

        self.assertIn(payload["status"], ["success", "error"])
        self.assertIn("diagnostic_prediction", payload)
        self.assertIn("explainability_breakdown", payload)


if __name__ == "__main__":
    unittest.main()
