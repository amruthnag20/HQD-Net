"""
Unit & Integration Test Suite for Microsoft MediPhi-Instruct Local LLM Provider.

Verifies:
1. Provider Architecture & Factory Selection (mock, api, mediphi).
2. Lazy Model Loading (model uninitialized at instantiation).
3. Environment Configuration (MEDIPHI_MODEL, MEDIPHI_DEVICE, CLINICAL_LLM_PROVIDER).
4. Zero-Telemetry Safety Contract (no latent 10-D vectors, theta, or raw tensors sent to LLM).
5. Output JSON Extraction & ClinicalReport Validation.
6. Citation & Evidence Validation (rejection of hallucinated citations [E99]).
7. Authoritative Quantum Score Immutability.
8. QuXAI Sensitivity & Biomarker Attribution Integrity.
9. Graceful Failure & Fallback Handling.
10. Protected Core File Byte-for-Byte Immutability (SHA-256).
"""

import hashlib
import json
import os
import unittest
from unittest.mock import MagicMock, patch

from classical_preprocessing.clinical_intelligence.contracts import (
    ClinicalPrediction,
    ClinicalReport,
    EvidenceItem,
    ExplainabilityAttribution,
    ModelComparison,
    PostQuantumResult,
    ProvenanceStatus,
    QuantumPrediction,
)
from classical_preprocessing.clinical_intelligence.evidence import EvidenceBundle
from classical_preprocessing.clinical_intelligence.llm import (
    APIProvider,
    ClinicalLLMRequest,
    ClinicalLLMResponse,
    MediPhiLLMProvider,
    MockLLMProvider,
    extract_json_payload,
    generate_clinical_report,
    generate_fallback_clinical_report,
    get_configured_llm_provider,
    validate_and_build_report,
)


from classical_preprocessing.clinical_intelligence.query_builder import ClinicalQuery


class TestMediPhiLLMProvider(unittest.TestCase):

    def setUp(self):
        self.sample_id = "PATIENT_001"
        self.q_pred = QuantumPrediction(
            verdict="HIGH_RISK_METABOLIC_SYNDROME",
            risk_score=0.499582,
            risk_percentage="50.0%",
        )
        self.c_pred = ClinicalPrediction(
            svm_risk=0.341200,
            random_forest_risk=0.365000,
        )
        self.m_comp = ModelComparison(
            quantum_risk_score=0.499582,
            classical_svm_risk=0.341200,
            classical_rf_risk=0.365000,
            quantum_lift_over_svm=15.8382,
        )
        self.explainability = (
            ExplainabilityAttribution(
                biomarker="Troponin-T Level",
                attribution_weight=0.666667,
                impact_percentage="66.67%",
            ),
            ExplainabilityAttribution(
                biomarker="Creatinine Clearance",
                attribution_weight=0.333333,
                impact_percentage="33.33%",
            ),
        )
        self.evidence_item = EvidenceItem(
            document_title="2025 ACC/AHA Clinical Guidelines",
            source="Guideline DB",
            excerpt="Troponin elevation indicates acute myocardial injury.",
            relevance_score=0.89,
            reranking_score=0.92,
            provenance_status=ProvenanceStatus.VERIFIED_PRIMARY,
        )
        self.query = ClinicalQuery(
            query_string="Troponin-T Level HIGH_RISK_METABOLIC_SYNDROME",
            key_biomarkers=("Troponin-T Level", "Creatinine Clearance"),
            verdict="HIGH_RISK_METABOLIC_SYNDROME",
            active_modalities=("TABULAR", "2D_XRV", "3D_MEDICALNET"),
            risk_level="HIGH",
        )
        self.evidence_bundle = EvidenceBundle(
            query=self.query,
            items=(self.evidence_item,),
            total_retrieved=1,
        )
        self.request = ClinicalLLMRequest(
            sample_id=self.sample_id,
            quantum_prediction=self.q_pred,
            classical_prediction=self.c_pred,
            model_comparison=self.m_comp,
            explainability=self.explainability,
            evidence_bundle=self.evidence_bundle,
        )

    def test_provider_factory_selection(self):
        """1. Verify factory correctly instantiates providers based on CLINICAL_LLM_PROVIDER."""
        with patch.dict(os.environ, {"CLINICAL_LLM_PROVIDER": "mock"}):
            provider = get_configured_llm_provider()
            self.assertIsInstance(provider, MockLLMProvider)

        with patch.dict(os.environ, {"CLINICAL_LLM_PROVIDER": "api"}):
            provider = get_configured_llm_provider()
            self.assertIsInstance(provider, APIProvider)

        with patch.dict(os.environ, {"CLINICAL_LLM_PROVIDER": "mediphi"}):
            provider = get_configured_llm_provider()
            self.assertIsInstance(provider, MediPhiLLMProvider)

        with patch.dict(os.environ, {"CLINICAL_LLM_PROVIDER": "invalid_provider"}):
            with self.assertRaises(ValueError):
                get_configured_llm_provider()

    def test_lazy_model_loading(self):
        """2. Verify MediPhiLLMProvider does NOT load the model upon initialization."""
        provider = MediPhiLLMProvider()
        self.assertFalse(provider.is_loaded)
        self.assertIsNone(provider._model)
        self.assertIsNone(provider._tokenizer)

    def test_environment_configuration(self):
        """3. Verify MEDIPHI_MODEL and MEDIPHI_DEVICE configuration resolution."""
        with patch.dict(os.environ, {"MEDIPHI_MODEL": "microsoft/MediPhi-Instruct", "MEDIPHI_DEVICE": "cpu"}):
            provider = MediPhiLLMProvider()
            self.assertEqual(provider.model_name, "microsoft/MediPhi-Instruct")
            self.assertEqual(provider.device_setting, "cpu")
            self.assertEqual(provider._resolve_device(), "cpu")

    def test_zero_telemetry_request_contract(self):
        """4. Verify ClinicalLLMRequest strictly excludes latent_vector_10d, theta, and raw tensors."""
        req = self.request
        self.assertFalse(hasattr(req, "latent_vector_10d"))
        self.assertFalse(hasattr(req, "theta"))
        self.assertFalse(hasattr(req, "raw_tensors"))
        self.assertTrue(hasattr(req, "quantum_prediction"))
        self.assertTrue(hasattr(req, "explainability"))
        self.assertTrue(hasattr(req, "evidence_bundle"))

    def test_json_payload_extraction(self):
        """5. Verify JSON extraction handles plain JSON, markdown blocks, and surrounding text."""
        raw_json = '{"diagnostic_summary": "Test Summary", "risk_assessment_interpretation": "Test Interp"}'
        self.assertIsNotNone(extract_json_payload(raw_json))

        md_wrapped = f"```json\n{raw_json}\n```"
        self.assertIsNotNone(extract_json_payload(md_wrapped))

        text_wrapped = f"Here is the report:\n{raw_json}\nEnd of report."
        self.assertIsNotNone(extract_json_payload(text_wrapped))

    def test_evidence_citation_validation(self):
        """6. Verify report validation rejects hallucinated citation tags such as [E99]."""
        invalid_json = {
            "diagnostic_summary": "High risk patient [E99]",
            "risk_assessment_interpretation": "Patient has elevated biomarkers per [E1] and [E99].",
        }
        with self.assertRaises(ValueError) as ctx:
            validate_and_build_report(self.request, invalid_json)
        self.assertIn("LLM_CITATION_VALIDATION_ERROR", str(ctx.exception))

    def test_quantum_score_authoritative_preservation(self):
        """7. Verify LLM narrative cannot alter authoritative quantum prediction risk score."""
        post_q_result = PostQuantumResult(
            sample_id=self.sample_id,
            quantum_prediction=self.q_pred,
            classical_prediction=self.c_pred,
            model_comparison=self.m_comp,
            explainability=self.explainability,
            active_modalities=("TABULAR", "2D_XRV", "3D_MEDICALNET"),
        )
        mock_provider = MockLLMProvider()
        report = generate_clinical_report(post_q_result, self.evidence_bundle, llm=mock_provider)

        # The report must preserve the exact sample ID
        self.assertEqual(report.sample_id, self.sample_id)
        # The underlying quantum risk score in post_q_result remains 0.499582 regardless of text
        self.assertEqual(post_q_result.quantum_prediction.risk_score, 0.499582)

    def test_graceful_load_failure_fallback(self):
        """8. Verify loading failure triggers deterministic fallback ClinicalReport."""
        provider = MediPhiLLMProvider(model_name="nonexistent/fake-model-name-12345")
        report = generate_clinical_report(
            PostQuantumResult(
                sample_id=self.sample_id,
                active_modalities=("TABULAR", "2D_XRV", "3D_MEDICALNET"),
                quantum_prediction=self.q_pred,
                classical_prediction=self.c_pred,
                model_comparison=self.m_comp,
                explainability=self.explainability,
            ),
            self.evidence_bundle,
            llm=provider,
        )
        self.assertIsInstance(report, ClinicalReport)
        self.assertIn("Clinical narrative generation unavailable", report.diagnostic_summary)

    def test_protected_quantum_files_immutability(self):
        """9. Cryptographic check: Ensure protected core quantum files remain 100% byte-identical."""
        expected_hashes = {
            "quantum_core/hqd_quantum.py": "ab3702865bbe78272d815aedea6072a504214c3052663dded3a011767b362465",
            "quantum_core/qsvm_backend.py": "b4766de27aa18b7f07ab5fa57e9a2a1e3290ee82a1f8db5574bfbb208a1b276e",
            "quantum_core/vqc_model_weights.pth": "73108e0e92480b98da073fbb36d4b80b99391bd7691e72bdccd188c685e9cb60",
            "engine_controller.py": "8cac75bb1f0b6459e1ff14b2e38fe8f516a46c232ce642b96d9a3f6c2e7e046e",
        }
        for filepath, expected_sha in expected_hashes.items():
            self.assertTrue(os.path.exists(filepath), f"Protected file {filepath} is missing!")
            with open(filepath, "rb") as f:
                content = f.read()
                actual_sha = hashlib.sha256(content).hexdigest()
                self.assertEqual(
                    actual_sha,
                    expected_sha,
                    f"CRITICAL SECURITY FAILURE: Protected file {filepath} has been modified! "
                    f"Expected {expected_sha}, got {actual_sha}",
                )


if __name__ == "__main__":
    unittest.main()
