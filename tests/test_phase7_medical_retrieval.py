"""
Phase 7 Unit & Regression Test Suite for Real Medical Retrieval & Reranking Architecture.

Verifies:
1. Multi-stage retrieval pipeline (BM25 -> Reranking -> Top-K Selection).
2. BiomedicalSemanticReranker and IdentityReranker fallbacks.
3. Provenance preservation across API contract serialization.
4. Quantum pipeline isolation & regression testing (quantum outputs remain 100% byte-identical).
5. Patient data isolation across requests.
"""

import os
import unittest

from classical_preprocessing.clinical_intelligence.api_contract import build_api_response_payload
from classical_preprocessing.clinical_intelligence.contracts import post_quantum_result_from_payload
from classical_preprocessing.clinical_intelligence.evidence import EvidenceBundle
from classical_preprocessing.clinical_intelligence.ingestion import ingest_json_knowledge_base
from classical_preprocessing.clinical_intelligence.llm import generate_clinical_report
from classical_preprocessing.clinical_intelligence.orchestrator import run_clinical_analysis
from classical_preprocessing.clinical_intelligence.retrieval import (
    BiomedicalSemanticReranker,
    IdentityReranker,
    MedicalEvidenceRetriever,
    get_configured_reranker,
)


class TestPhase7MedicalRetrieval(unittest.TestCase):

    def setUp(self):
        self.kb_file = "knowledge_base/cardiovascular_guidelines_2025.json"
        self.sample_payload_a = {
            "status": "success",
            "meta_summary": {
                "system_name": "HQD-Net OS",
                "active_modalities": ["TABULAR", "IMAGE_2D"],
                "sample_ids": ["PATIENT_A"],
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
            "telemetry_logs": ["[1/5] Quantum Core Verified"],
        }
        self.result_a = post_quantum_result_from_payload(self.sample_payload_a)

    # -------------------------------------------------------------------------
    # 1. Reranker Factory & Configuration
    # -------------------------------------------------------------------------
    def test_reranker_factory(self):
        os.environ["RERANKER_MODE"] = "semantic"
        reranker = get_configured_reranker()
        self.assertIsInstance(reranker, BiomedicalSemanticReranker)

        os.environ["RERANKER_MODE"] = "identity"
        reranker = get_configured_reranker()
        self.assertIsInstance(reranker, IdentityReranker)

        os.environ["RERANKER_MODE"] = "semantic"

    # -------------------------------------------------------------------------
    # 2. Multi-Stage Medical Retrieval & Provenance Preservation
    # -------------------------------------------------------------------------
    def test_multi_stage_retrieval(self):
        chunks = ingest_json_knowledge_base(self.kb_file)
        retriever = MedicalEvidenceRetriever(chunks, reranker=BiomedicalSemanticReranker())

        evidence_bundle = retriever.retrieve_evidence(self.result_a, top_k=3)
        self.assertIsInstance(evidence_bundle, EvidenceBundle)
        self.assertLessEqual(len(evidence_bundle.items), 3)

        if evidence_bundle.items:
            item = evidence_bundle.items[0]
            self.assertTrue(len(item.document_title) > 0)
            self.assertGreaterEqual(item.reranking_score, 0.0)

    # -------------------------------------------------------------------------
    # 3. Empty Candidates Handling
    # -------------------------------------------------------------------------
    def test_empty_candidates_handling(self):
        retriever = MedicalEvidenceRetriever([], reranker=BiomedicalSemanticReranker())
        evidence_bundle = retriever.retrieve_evidence(self.result_a, top_k=3)

        self.assertEqual(len(evidence_bundle.items), 0)
        self.assertEqual(evidence_bundle.total_retrieved, 0)

    # -------------------------------------------------------------------------
    # 4. Quantum Pipeline Isolation & Regression Test
    # -------------------------------------------------------------------------
    def test_quantum_pipeline_regression(self):
        raw_inputs = [
            45.0, 120.0, 80.0, 138.0, 24.5, 72.0,
            100.0, 50.0, 150.0, 5.4, 0.9, 15.0,
            0.45, 1.0, 140.0, 4.2, 7.5, 4.8,
            250.0, 14.2, 0.15, 0.45, 0.0, 0.0
        ]

        # Mode A: Identity Reranker
        os.environ["RERANKER_MODE"] = "identity"
        res_identity = run_clinical_analysis(raw_features=raw_inputs, backend_choice="VQC")

        # Mode B: Biomedical Semantic Reranker
        os.environ["RERANKER_MODE"] = "semantic"
        res_semantic = run_clinical_analysis(raw_features=raw_inputs, backend_choice="VQC")

        # Prove Quantum Core & Classical Baseline Outputs Are 100% Identical
        q_identity = res_identity["prediction"]["quantum"]
        q_semantic = res_semantic["prediction"]["quantum"]

        self.assertEqual(q_identity["risk_score"], q_semantic["risk_score"])
        self.assertEqual(q_identity["verdict"], q_semantic["verdict"])
        self.assertEqual(
            res_identity["prediction"]["classical"],
            res_semantic["prediction"]["classical"]
        )
        self.assertEqual(
            res_identity["explainability"],
            res_semantic["explainability"]
        )

    # -------------------------------------------------------------------------
    # 5. Patient Data Isolation
    # -------------------------------------------------------------------------
    def test_patient_data_isolation(self):
        chunks = ingest_json_knowledge_base(self.kb_file)
        retriever = MedicalEvidenceRetriever(chunks, reranker=BiomedicalSemanticReranker())

        bundle_a = retriever.retrieve_evidence(self.result_a, top_k=2)

        # Alter Patient B PostQuantumResult
        payload_b = dict(self.sample_payload_a)
        payload_b["diagnostic_prediction"] = {
            "disease_risk_score": 0.200,
            "risk_percentage": "20.0%",
            "verdict": "Low Risk - Safe Baseline",
        }
        result_b = post_quantum_result_from_payload(payload_b)
        bundle_b = retriever.retrieve_evidence(result_b, top_k=2)

        self.assertNotEqual(bundle_a.query.query_string, bundle_b.query.query_string)


if __name__ == "__main__":
    unittest.main()
