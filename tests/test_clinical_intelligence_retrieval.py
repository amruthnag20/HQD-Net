"""
Unit & Integration Test Suite for Phase 2 Medical Knowledge Base & Evidence Retrieval.

Tests document ingestion, chunking determinism, query construction, latent_vector_10d isolation,
BM25 retrieval accuracy, top-k enforcement, empty knowledge base resilience, and real pipeline integration.
"""

import os
import unittest
from classical_preprocessing.clinical_intelligence.contracts import (
    ExplainabilityAttribution,
    PostQuantumResult,
    post_quantum_result_from_payload,
)
from classical_preprocessing.clinical_intelligence.evidence import EvidenceBundle
from classical_preprocessing.clinical_intelligence.ingestion import (
    DocumentChunk,
    ingest_json_knowledge_base,
)
from classical_preprocessing.clinical_intelligence.query_builder import (
    ClinicalQuery,
    ClinicalQueryBuilder,
)
from classical_preprocessing.clinical_intelligence.retrieval import (
    BM25LexicalRetriever,
    IdentityReranker,
    MedicalEvidenceRetriever,
)
from classical_preprocessing.pipeline_runner import run_hqd_real_pipeline


class TestClinicalIntelligenceRetrieval(unittest.TestCase):

    def setUp(self):
        self.kb_file = "knowledge_base/cardiovascular_guidelines_2025.json"
        self.sample_payload = {
            "status": "success",
            "meta_summary": {
                "system_name": "HQD-Net OS",
                "active_modalities": ["TABULAR", "IMAGE_2D (TorchXRayVision DenseNet-121)"],
                "sample_ids": ["PATIENT_888"],
            },
            "latent_representation": {
                "dimensions": 10,
                "latent_biomarkers_vector": [0.12, -0.34, 0.56, 0.78, -0.90, 0.11, 0.22, -0.33, 0.44, 0.55],
            },
            "diagnostic_prediction": {
                "disease_risk_score": 0.82,
                "risk_percentage": "82.0%",
                "verdict": "High Risk - Multimodal Cardiac Anomalies",
            },
            "benchmarking_comparison": {
                "quantum_risk_score": 0.82,
                "classical_svm_risk": 0.61,
                "classical_rf_risk": 0.58,
                "quantum_lift_over_svm": "+21.00%",
            },
            "explainability_breakdown": [
                {"biomarker": "Fasting Blood Glucose", "attribution_weight": 0.55, "impact_percentage": "55.00%"},
                {"biomarker": "Cardiac Troponin-T", "attribution_weight": 0.45, "impact_percentage": "45.00%"},
            ],
            "telemetry_logs": ["[1/5] Quantum Handshake Established"],
        }
        self.result = post_quantum_result_from_payload(self.sample_payload)

    # -------------------------------------------------------------------------
    # 1. Document Ingestion & Provenance Preservation
    # -------------------------------------------------------------------------
    def test_document_ingestion(self):
        if not os.path.exists(self.kb_file):
            self.skipTest(f"Knowledge base file {self.kb_file} not found.")

        chunks = ingest_json_knowledge_base(self.kb_file)
        self.assertGreater(len(chunks), 0)

        for chunk in chunks:
            self.assertIsInstance(chunk, DocumentChunk)
            self.assertTrue(len(chunk.chunk_id) > 0)
            self.assertTrue(len(chunk.document_id) > 0)
            self.assertTrue(len(chunk.document_title) > 0)
            self.assertTrue(len(chunk.source) > 0)
            self.assertTrue(len(chunk.text) > 0)
            if chunk.page is not None:
                self.assertGreater(chunk.page, 0)

    # -------------------------------------------------------------------------
    # 2. Chunking Determinism
    # -------------------------------------------------------------------------
    def test_ingestion_determinism(self):
        if not os.path.exists(self.kb_file):
            self.skipTest(f"Knowledge base file {self.kb_file} not found.")

        chunks1 = ingest_json_knowledge_base(self.kb_file)
        chunks2 = ingest_json_knowledge_base(self.kb_file)

        self.assertEqual(len(chunks1), len(chunks2))
        for c1, c2 in zip(chunks1, chunks2):
            self.assertEqual(c1.chunk_id, c2.chunk_id)
            self.assertEqual(c1.text, c2.text)
            self.assertEqual(c1.section, c2.section)

    # -------------------------------------------------------------------------
    # 3. Query Construction Determinism
    # -------------------------------------------------------------------------
    def test_query_construction(self):
        query1 = ClinicalQueryBuilder.build_query(self.result)
        query2 = ClinicalQueryBuilder.build_query(self.result)

        self.assertEqual(query1.query_string, query2.query_string)
        self.assertEqual(query1.risk_level, "High Risk")
        self.assertEqual(query1.key_biomarkers, ("Fasting Blood Glucose", "Cardiac Troponin-T"))

    # -------------------------------------------------------------------------
    # 4. STRICT ISOLATION: Latent Vector 10D & Telemetry NOT in Query
    # -------------------------------------------------------------------------
    def test_latent_isolation(self):
        query = ClinicalQueryBuilder.build_query(self.result)

        # Check raw float representation of latent vector is NOT in query string
        for val in self.result.latent_vector_10d:
            self.assertNotIn(str(val), query.query_string)

        # Check telemetry logs are NOT in query string
        self.assertNotIn("Quantum Handshake", query.query_string)

    # -------------------------------------------------------------------------
    # 5. BM25 Retrieval & Top-K Respect
    # -------------------------------------------------------------------------
    def test_retrieval_demonstration_evidence(self):
        if not os.path.exists(self.kb_file):
            self.skipTest(f"Knowledge base file {self.kb_file} not found.")

        chunks = ingest_json_knowledge_base(self.kb_file)
        engine = MedicalEvidenceRetriever(chunks)
        bundle = engine.retrieve_evidence(self.result, top_k=2)

        self.assertIsInstance(bundle, EvidenceBundle)
        self.assertLessEqual(len(bundle.items), 2)
        self.assertGreater(len(bundle.items), 0)

        # Check provenance fields on retrieved evidence items
        top_item = bundle.items[0]
        self.assertTrue(len(top_item.document_title) > 0)
        self.assertTrue(len(top_item.source) > 0)
        self.assertTrue(len(top_item.excerpt) > 0)
        self.assertTrue(0.0 <= top_item.relevance_score <= 1.0)

    # -------------------------------------------------------------------------
    # 6. Empty Knowledge Base Resilience
    # -------------------------------------------------------------------------
    def test_empty_knowledge_base(self):
        engine = MedicalEvidenceRetriever(chunks=[])
        bundle = engine.retrieve_evidence(self.result, top_k=5)

        self.assertIsInstance(bundle, EvidenceBundle)
        self.assertEqual(len(bundle.items), 0)
        self.assertEqual(bundle.total_retrieved, 0)

    # -------------------------------------------------------------------------
    # 7. Missing Metadata Preservation
    # -------------------------------------------------------------------------
    def test_missing_metadata(self):
        chunk_minimal = DocumentChunk(
            chunk_id="CHUNK_MIN_001",
            document_id="DOC_MIN",
            document_title="Minimal Doc",
            source="Minimal Source",
            text="Minimal clinical text regarding blood glucose and troponin.",
        )
        engine = MedicalEvidenceRetriever(chunks=[chunk_minimal])
        bundle = engine.retrieve_evidence(self.result, top_k=1)

        self.assertEqual(len(bundle.items), 1)
        item = bundle.items[0]
        self.assertIsNone(item.page)
        self.assertIsNone(item.section)
        self.assertIsNone(item.publication_year)

    # -------------------------------------------------------------------------
    # 8. Baseline Reranker Interface Preservation
    # -------------------------------------------------------------------------
    def test_reranker_interface(self):
        if not os.path.exists(self.kb_file):
            self.skipTest(f"Knowledge base file {self.kb_file} not found.")

        chunks = ingest_json_knowledge_base(self.kb_file)
        retriever = BM25LexicalRetriever(chunks)
        reranker = IdentityReranker()
        query = ClinicalQueryBuilder.build_query(self.result)

        candidates = retriever.retrieve(query, top_k=3)
        reranked = reranker.rerank(query, candidates)

        self.assertEqual(len(candidates), len(reranked))
        for (c_chunk, c_score), (r_chunk, r_score, rr_score) in zip(candidates, reranked):
            self.assertEqual(c_chunk.chunk_id, r_chunk.chunk_id)
            self.assertEqual(c_score, r_score)
            self.assertEqual(r_score, rr_score)

    # -------------------------------------------------------------------------
    # 9. Real End-to-End Pipeline Integration Test (No LLM / No Frontend)
    # -------------------------------------------------------------------------
    def test_real_pipeline_end_to_end_retrieval(self):
        csv_path = "clinical_data_real.csv"
        if not os.path.exists(csv_path) or not os.path.exists(self.kb_file):
            self.skipTest("Required dataset or KB file missing for E2E retrieval test.")

        # 1. Run pipeline
        payload = run_hqd_real_pipeline(tabular_input=csv_path, backend_choice="VQC")
        # 2. Convert to contract
        post_q_result = post_quantum_result_from_payload(payload)
        # 3. Build query
        query = ClinicalQueryBuilder.build_query(post_q_result)
        # 4. Ingest KB & Retrieve evidence
        chunks = ingest_json_knowledge_base(self.kb_file)
        retrieval_engine = MedicalEvidenceRetriever(chunks)
        evidence_bundle = retrieval_engine.retrieve_evidence(post_q_result, top_k=3)

        self.assertIsInstance(evidence_bundle, EvidenceBundle)
        self.assertGreater(len(evidence_bundle.items), 0)
        self.assertIsInstance(evidence_bundle.query, ClinicalQuery)


if __name__ == "__main__":
    unittest.main()
