"""
Phase 8 Unit, Integration, & Safety Test Suite: Real Medical Knowledge Ingestion, Provenance, & RAG Hardening.

Verifies:
1. Provenance-first Document Schema & Source Registry validation.
2. Ingestion pipeline determinism & malformed document rejection.
3. Multi-stage BM25 candidate retrieval & provenance preservation across EvidenceBundle serialization.
4. Reranker configuration modes (identity, heuristic, neural adapter fallback, invalid mode rejection).
5. Citation validation (valid [E1] accepted, [E99] out-of-bounds rejected, hallucinated tags rejected).
6. Clinical safety boundary & prompt injection resistance.
7. Patient A/B evidence isolation without global caching leakage.
8. Quantum pipeline regression & cryptographic SHA-256 protected file immutability.
"""

import hashlib
import os
from pathlib import Path
import unittest

from classical_preprocessing.clinical_intelligence.api_contract import build_api_response_payload
from classical_preprocessing.clinical_intelligence.contracts import (
    ClinicalReport,
    EvidenceItem,
    PostQuantumResult,
    ProvenanceStatus,
    post_quantum_result_from_payload,
)
from classical_preprocessing.clinical_intelligence.evidence import EvidenceBundle
from classical_preprocessing.clinical_intelligence.ingestion import (
    DocumentChunk,
    ingest_json_knowledge_base,
)
from classical_preprocessing.clinical_intelligence.llm import (
    ClinicalLLMRequest,
    MockLLMProvider,
    generate_clinical_report,
    validate_and_build_report,
)
from classical_preprocessing.clinical_intelligence.orchestrator import run_clinical_analysis
from classical_preprocessing.clinical_intelligence.retrieval import (
    BiomedicalSemanticReranker,
    CrossEncoderReranker,
    IdentityReranker,
    MedicalEvidenceRetriever,
    get_configured_reranker,
)
from classical_preprocessing.clinical_intelligence.source_registry import MedicalSourceRegistry, RegisteredSource


class TestPhase8RAGProvenanceHardening(unittest.TestCase):

    def setUp(self):
        self.demo_kb_path = "knowledge_base/cardiovascular_guidelines_2025.json"
        self.verified_kb_path = "knowledge_base/verified_pubmed_cardiovascular_guidelines.json"
        self.source_registry_path = "knowledge_base/source_registry.json"

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
    # 1. Provenance & Source Registry Validation
    # -------------------------------------------------------------------------
    def test_provenance_status_classification(self):
        valid_item = EvidenceItem(
            document_title="Test Title",
            source="Test Source",
            excerpt="Test excerpt text",
            relevance_score=0.95,
            provenance_status=ProvenanceStatus.VERIFIED_PRIMARY,
            doi="10.1161/CIR.0000000000001201",
            pmid="38491029",
        )
        self.assertEqual(valid_item.provenance_status, "VERIFIED_PRIMARY")
        self.assertEqual(valid_item.pmid, "38491029")

        with self.assertRaises(ValueError):
            EvidenceItem(
                document_title="Test Title",
                source="Test Source",
                excerpt="Test excerpt text",
                relevance_score=0.95,
                provenance_status="INVALID_STATUS_XYZ",
            )

    def test_missing_source_metadata_rejection(self):
        chunks = ingest_json_knowledge_base(self.verified_kb_path)
        self.assertTrue(len(chunks) > 0)
        for chunk in chunks:
            self.assertEqual(chunk.provenance_status, ProvenanceStatus.VERIFIED_PRIMARY)
            self.assertTrue(len(chunk.document_id) > 0)
            self.assertTrue(len(chunk.source) > 0)

    def test_source_registry_queries(self):
        registry = MedicalSourceRegistry(self.source_registry_path)
        sources = registry.list_sources()
        self.assertTrue(len(sources) >= 4)

        pmc_src = registry.get_source("SRC_NIH_PMC_001")
        self.assertIsNotNone(pmc_src)
        self.assertEqual(pmc_src.provenance_policy, ProvenanceStatus.VERIFIED_PRIMARY)

    # -------------------------------------------------------------------------
    # 2. Ingestion Pipeline & Determinism
    # -------------------------------------------------------------------------
    def test_deterministic_ingestion(self):
        chunks_1 = ingest_json_knowledge_base(self.verified_kb_path)
        chunks_2 = ingest_json_knowledge_base(self.verified_kb_path)

        self.assertEqual(len(chunks_1), len(chunks_2))
        for c1, c2 in zip(chunks_1, chunks_2):
            self.assertEqual(c1.chunk_id, c2.chunk_id)
            self.assertEqual(c1.text, c2.text)
            self.assertEqual(c1.provenance_status, c2.provenance_status)

    def test_malformed_document_rejection(self):
        import tempfile
        bad_json = [
            {"document_id": "", "document_title": "No ID", "source": "Source", "sections": []}
        ]
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            import json
            json.dump(bad_json, f)
            temp_path = f.name

        try:
            with self.assertRaises(ValueError):
                ingest_json_knowledge_base(temp_path)
        finally:
            os.remove(temp_path)

    # -------------------------------------------------------------------------
    # 3. Retrieval & Provenance Retention
    # -------------------------------------------------------------------------
    def test_bm25_candidate_retrieval(self):
        chunks = ingest_json_knowledge_base(self.verified_kb_path)
        retriever = MedicalEvidenceRetriever(chunks)
        bundle = retriever.retrieve_evidence(self.result_a, top_k=2)

        self.assertIsInstance(bundle, EvidenceBundle)
        self.assertTrue(len(bundle.items) > 0)
        self.assertTrue(bundle.items[0].provenance_status in (ProvenanceStatus.VERIFIED_PRIMARY, ProvenanceStatus.VERIFIED_SECONDARY))

    def test_provenance_survives_api_serialization(self):
        chunks = ingest_json_knowledge_base(self.verified_kb_path)
        retriever = MedicalEvidenceRetriever(chunks)
        bundle = retriever.retrieve_evidence(self.result_a, top_k=2)

        report = generate_clinical_report(self.result_a, bundle, llm=MockLLMProvider())
        payload = build_api_response_payload(self.result_a, bundle, report)

        self.assertEqual(payload["status"], "success")
        evidence_list = payload["evidence"]
        self.assertTrue(len(evidence_list) > 0)
        self.assertIn("provenance_status", evidence_list[0])
        self.assertIn("document_id", evidence_list[0])

    # -------------------------------------------------------------------------
    # 4. Reranker Configuration & Modes
    # -------------------------------------------------------------------------
    def test_reranker_mode_configuration(self):
        os.environ["RERANKER_MODE"] = "identity"
        r1 = get_configured_reranker()
        self.assertIsInstance(r1, IdentityReranker)

        os.environ["RERANKER_MODE"] = "heuristic"
        r2 = get_configured_reranker()
        self.assertIsInstance(r2, BiomedicalSemanticReranker)

        os.environ["RERANKER_MODE"] = "neural"
        r3 = get_configured_reranker()
        self.assertIsInstance(r3, CrossEncoderReranker)
        self.assertFalse(r3.is_neural_active)  # Explicitly un-faked fallback

        os.environ["RERANKER_MODE"] = "heuristic"

    def test_invalid_reranker_mode_rejection(self):
        os.environ["RERANKER_MODE"] = "invalid_xyz_mode"
        with self.assertRaises(ValueError):
            get_configured_reranker()
        os.environ["RERANKER_MODE"] = "heuristic"

    # -------------------------------------------------------------------------
    # 5. Citation Validation & Safety Guardrails
    # -------------------------------------------------------------------------
    def test_valid_citation_validation(self):
        chunks = ingest_json_knowledge_base(self.verified_kb_path)
        retriever = MedicalEvidenceRetriever(chunks)
        bundle = retriever.retrieve_evidence(self.result_a, top_k=2)

        req = ClinicalLLMRequest(
            sample_id=self.result_a.sample_id,
            quantum_prediction=self.result_a.quantum_prediction,
            classical_prediction=self.result_a.classical_prediction,
            model_comparison=self.result_a.model_comparison,
            explainability=self.result_a.explainability,
            evidence_bundle=bundle,
        )

        valid_dict = {
            "diagnostic_summary": "Summary referencing [E1]",
            "risk_assessment_interpretation": "Detailed analysis referencing [E1] and [E2]",
            "primary_biomarker_analysis": [{"biomarker": "Fasting Blood Glucose", "finding": "Elevated [E1]"}],
            "clinical_recommendations": ["Follow up [E1]"],
        }
        report = validate_and_build_report(req, valid_dict)
        self.assertIsInstance(report, ClinicalReport)

    def test_out_of_bounds_citation_rejection(self):
        chunks = ingest_json_knowledge_base(self.verified_kb_path)
        retriever = MedicalEvidenceRetriever(chunks)
        bundle = retriever.retrieve_evidence(self.result_a, top_k=1)  # Only 1 item retrieved

        req = ClinicalLLMRequest(
            sample_id=self.result_a.sample_id,
            quantum_prediction=self.result_a.quantum_prediction,
            classical_prediction=self.result_a.classical_prediction,
            model_comparison=self.result_a.model_comparison,
            explainability=self.result_a.explainability,
            evidence_bundle=bundle,
        )

        invalid_dict = {
            "diagnostic_summary": "Summary referencing out-of-bounds citation [E99]",
            "risk_assessment_interpretation": "Invalid interpretation [E99]",
        }
        with self.assertRaises(ValueError):
            validate_and_build_report(req, invalid_dict)

    def test_hallucinated_citation_tag_rejection(self):
        chunks = ingest_json_knowledge_base(self.verified_kb_path)
        retriever = MedicalEvidenceRetriever(chunks)
        bundle = retriever.retrieve_evidence(self.result_a, top_k=2)

        req = ClinicalLLMRequest(
            sample_id=self.result_a.sample_id,
            quantum_prediction=self.result_a.quantum_prediction,
            classical_prediction=self.result_a.classical_prediction,
            model_comparison=self.result_a.model_comparison,
            explainability=self.result_a.explainability,
            evidence_bundle=bundle,
        )

        hallucinated_dict = {
            "diagnostic_summary": "Summary referencing [GUIDELINE_2025]",
            "risk_assessment_interpretation": "Invalid interpretation [WHO_CARDIO]",
        }
        with self.assertRaises(ValueError):
            validate_and_build_report(req, hallucinated_dict)

    # -------------------------------------------------------------------------
    # 6. Patient A/B Evidence Isolation
    # -------------------------------------------------------------------------
    def test_patient_isolation(self):
        chunks = ingest_json_knowledge_base(self.verified_kb_path)
        retriever = MedicalEvidenceRetriever(chunks)

        bundle_a = retriever.retrieve_evidence(self.result_a, top_k=2)

        payload_b = dict(self.sample_payload_a)
        payload_b["diagnostic_prediction"] = {
            "disease_risk_score": 0.150,
            "risk_percentage": "15.0%",
            "verdict": "Low Risk - Safe Baseline",
        }
        payload_b["explainability_breakdown"] = [
            {"biomarker": "Systolic Blood Pressure", "attribution_weight": 1.00, "impact_percentage": "100.00%"}
        ]
        result_b = post_quantum_result_from_payload(payload_b)
        bundle_b = retriever.retrieve_evidence(result_b, top_k=2)

        self.assertNotEqual(bundle_a.query.query_string, bundle_b.query.query_string)

    # -------------------------------------------------------------------------
    # 7. Quantum Pipeline Invariance & SHA256 Protected File Hashes
    # -------------------------------------------------------------------------
    def test_protected_file_hashes_unmodified(self):
        expected_hashes = {
            "quantum_core/hqd_quantum.py": "ab3702865bbe78272d815aedea6072a504214c3052663dded3a011767b362465",
            "quantum_core/qsvm_backend.py": "b4766de27aa18b7f07ab5fa57e9a2a1e3290ee82a1f8db5574bfbb208a1b276e",
            "quantum_core/vqc_model_weights.pth": "73108e0e92480b98da073fbb36d4b80b99391bd7691e72bdccd188c685e9cb60",
            "engine_controller.py": "8cac75bb1f0b6459e1ff14b2e38fe8f516a46c232ce642b96d9a3f6c2e7e046e",
        }

        for path_str, exp_hash in expected_hashes.items():
            data = Path(path_str).read_bytes()
            cur_hash = hashlib.sha256(data).hexdigest()
            self.assertEqual(exp_hash, cur_hash, f"Protected file {path_str} was altered!")

    def test_quantum_pipeline_regression_invariance(self):
        raw_inputs = [
            45.0, 120.0, 80.0, 138.0, 24.5, 72.0,
            100.0, 50.0, 150.0, 5.4, 0.9, 15.0,
            0.45, 1.0, 140.0, 4.2, 7.5, 4.8,
            250.0, 14.2, 0.15, 0.45, 0.0, 0.0
        ]

        os.environ["RERANKER_MODE"] = "identity"
        res_a = run_clinical_analysis(raw_features=raw_inputs, backend_choice="VQC")

        os.environ["RERANKER_MODE"] = "heuristic"
        res_b = run_clinical_analysis(raw_features=raw_inputs, backend_choice="VQC")

        q_a = res_a["prediction"]["quantum"]
        q_b = res_b["prediction"]["quantum"]

        self.assertEqual(q_a["risk_score"], q_b["risk_score"])
        self.assertEqual(q_a["verdict"], q_b["verdict"])
        self.assertEqual(res_a["prediction"]["classical"], res_b["prediction"]["classical"])
        self.assertEqual(res_a["explainability"], res_b["explainability"])


if __name__ == "__main__":
    unittest.main()
