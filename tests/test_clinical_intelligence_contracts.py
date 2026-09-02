"""
Unit Test Suite for Post-Quantum Clinical Intelligence Contracts (Phase 1).
Tests mathematical boundaries, immutability, invalid payload rejections,
adapter conversion functionality against real pipeline executions, and JSON serialization.
"""

from dataclasses import FrozenInstanceError
import json
import os
import unittest
from classical_preprocessing.clinical_intelligence.contracts import (
    ClinicalPrediction,
    ClinicalReport,
    EvidenceItem,
    ExplainabilityAttribution,
    ModelComparison,
    PostQuantumResult,
    QuantumPrediction,
    post_quantum_result_from_dict,
    post_quantum_result_from_payload,
    post_quantum_result_to_dict,
)
from classical_preprocessing.pipeline_runner import run_hqd_real_pipeline


class TestClinicalIntelligenceContracts(unittest.TestCase):

    def setUp(self):
        self.valid_payload = {
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
                "disease_risk_score": 0.85,
                "risk_percentage": "85.0%",
                "verdict": "High Risk - Anomalous Multimodal Signature Detected",
            },
            "benchmarking_comparison": {
                "quantum_risk_score": 0.85,
                "classical_svm_risk": 0.65,
                "classical_rf_risk": 0.60,
                "quantum_lift_over_svm": "+20.00%",
            },
            "explainability_breakdown": [
                {
                    "biomarker": "Fasting Blood Glucose",
                    "attribution_weight": 0.60,
                    "impact_percentage": "60.00%",
                },
                {
                    "biomarker": "Systolic Blood Pressure",
                    "attribution_weight": 0.40,
                    "impact_percentage": "40.00%",
                },
            ],
            "telemetry_logs": ["[1/5 Ingestion] Test telemetry log entry"],
        }

    # -------------------------------------------------------------------------
    # 1. Valid Payload Conversion & Contract Instantiation
    # -------------------------------------------------------------------------
    def test_valid_payload_conversion(self):
        result = post_quantum_result_from_payload(self.valid_payload)

        self.assertIsInstance(result, PostQuantumResult)
        self.assertEqual(result.sample_id, "PATIENT_777")
        self.assertEqual(result.active_modalities, ("TABULAR", "IMAGE_2D (TorchXRayVision DenseNet-121)"))

        # Quantum Prediction
        self.assertEqual(result.quantum_prediction.risk_score, 0.85)
        self.assertEqual(result.quantum_prediction.risk_percentage, "85.0%")
        self.assertIn("High Risk", result.quantum_prediction.verdict)

        # Classical Prediction & Model Comparison
        self.assertEqual(result.classical_prediction.svm_risk, 0.65)
        self.assertEqual(result.classical_prediction.random_forest_risk, 0.60)
        self.assertAlmostEqual(result.model_comparison.quantum_lift_over_svm, 20.0)

        # Explainability
        self.assertEqual(len(result.explainability), 2)
        self.assertEqual(result.explainability[0].biomarker, "Fasting Blood Glucose")
        self.assertEqual(result.explainability[0].attribution_weight, 0.60)

        # Latent Vector
        self.assertIsNotNone(result.latent_vector_10d)
        self.assertEqual(len(result.latent_vector_10d), 10)

    # -------------------------------------------------------------------------
    # 2. Quantum Risk Bounds Rejection
    # -------------------------------------------------------------------------
    def test_quantum_risk_bounds_rejection(self):
        # Underflow (< 0)
        with self.assertRaises(ValueError):
            QuantumPrediction(risk_score=-0.01, risk_percentage="-1.0%", verdict="Invalid")

        # Overflow (> 1)
        with self.assertRaises(ValueError):
            QuantumPrediction(risk_score=1.05, risk_percentage="105.0%", verdict="Invalid")

        # Non-finite (NaN)
        with self.assertRaises(ValueError):
            QuantumPrediction(risk_score=float("nan"), risk_percentage="NaN%", verdict="Invalid")

    # -------------------------------------------------------------------------
    # 3. Classical Risk Bounds Rejection
    # -------------------------------------------------------------------------
    def test_classical_risk_bounds_rejection(self):
        with self.assertRaises(ValueError):
            ClinicalPrediction(svm_risk=-0.1)

        with self.assertRaises(ValueError):
            ClinicalPrediction(svm_risk=1.2)

        with self.assertRaises(ValueError):
            ClinicalPrediction(svm_risk=0.5, random_forest_risk=1.5)

    # -------------------------------------------------------------------------
    # 4. Explainability Attribution Validation
    # -------------------------------------------------------------------------
    def test_attribution_validation(self):
        # Negative weight rejection
        with self.assertRaises(ValueError):
            ExplainabilityAttribution(biomarker="Glucose", attribution_weight=-0.1, impact_percentage="-10%")

        # Non-finite weight rejection
        with self.assertRaises(ValueError):
            ExplainabilityAttribution(biomarker="Glucose", attribution_weight=float("inf"), impact_percentage="Inf")

        # Empty biomarker label rejection
        with self.assertRaises(ValueError):
            ExplainabilityAttribution(biomarker="", attribution_weight=0.5, impact_percentage="50%")

    # -------------------------------------------------------------------------
    # 5. Latent 10-D Vector Validation
    # -------------------------------------------------------------------------
    def test_latent_vector_validation(self):
        payload_invalid_dim = self.valid_payload.copy()
        payload_invalid_dim["latent_representation"] = {
            "dimensions": 5,
            "latent_biomarkers_vector": [0.1, 0.2, 0.3, 0.4, 0.5],
        }

        with self.assertRaises(ValueError):
            post_quantum_result_from_payload(payload_invalid_dim)

    # -------------------------------------------------------------------------
    # 6. EvidenceItem Provenance Fields
    # -------------------------------------------------------------------------
    def test_evidence_item_provenance(self):
        evidence = EvidenceItem(
            document_title="ACC/AHA Clinical Guidelines on Cardiovascular Risk",
            source="PubMed PMID: 31542123",
            excerpt="Patients with elevated blood glucose and arterial stiffness show double cardiac risk.",
            relevance_score=0.92,
            page=14,
            section="Section 4.2 Biomarker Assessment",
            publication_year=2024,
            reranking_score=0.88,
        )

        self.assertEqual(evidence.document_title, "ACC/AHA Clinical Guidelines on Cardiovascular Risk")
        self.assertEqual(evidence.relevance_score, 0.92)
        self.assertEqual(evidence.publication_year, 2024)

        # Invalid relevance score
        with self.assertRaises(ValueError):
            EvidenceItem(
                document_title="Title",
                source="Source",
                excerpt="Excerpt",
                relevance_score=1.5,
            )

    # -------------------------------------------------------------------------
    # 7. ClinicalReport Structured Instantiation
    # -------------------------------------------------------------------------
    def test_clinical_report_instantiation(self):
        evidence = EvidenceItem(
            document_title="Medical Research Journal",
            source="DOI:10.1016/j.cardio.2025.01",
            excerpt="Biomarker correlation analysis...",
            relevance_score=0.95,
        )

        report = ClinicalReport(
            sample_id="PATIENT_777",
            diagnostic_summary="Multimodal analysis indicates elevated cardiovascular disease risk.",
            risk_assessment_interpretation="The 10-qubit VQC model assigned an 85.0% risk score...",
            primary_biomarker_analysis=(
                {"biomarker": "Fasting Blood Glucose", "finding": "Marked elevation driving risk"},
            ),
            retrieved_evidence=(evidence,),
            clinical_recommendations=("Recommend HbA1c screening", "Schedule ECG examination"),
        )

        self.assertEqual(report.sample_id, "PATIENT_777")
        self.assertEqual(len(report.retrieved_evidence), 1)
        self.assertIn("attending licensed medical practitioner", report.limitations_and_disclaimer)

    # -------------------------------------------------------------------------
    # 8. Strict Immutability Verification
    # -------------------------------------------------------------------------
    def test_contract_immutability(self):
        result = post_quantum_result_from_payload(self.valid_payload)

        # Attempt to mutate field on PostQuantumResult
        with self.assertRaises(FrozenInstanceError):
            result.sample_id = "PATIENT_MUTATED"

        # Attempt to mutate nested QuantumPrediction
        with self.assertRaises(FrozenInstanceError):
            result.quantum_prediction.risk_score = 0.01

        # Attempt to mutate ClinicalReport
        report = ClinicalReport(
            sample_id="P001",
            diagnostic_summary="Summary",
            risk_assessment_interpretation="Interpretation",
            primary_biomarker_analysis=(),
        )
        with self.assertRaises(FrozenInstanceError):
            report.diagnostic_summary = "Altered Summary"

    # -------------------------------------------------------------------------
    # 9. Real Runtime Pipeline Payload Adapter Test
    # -------------------------------------------------------------------------
    def test_real_pipeline_adapter_execution(self):
        csv_path = "clinical_data_real.csv"
        if not os.path.exists(csv_path):
            self.skipTest(f"Dataset {csv_path} not found for real pipeline adapter test.")

        # Execute the real end-to-end HQD-Net pipeline
        real_payload = run_hqd_real_pipeline(
            tabular_input=csv_path,
            backend_choice="VQC",
        )

        self.assertEqual(real_payload.get("status"), "success")

        # Map real runtime dictionary payload into PostQuantumResult contract
        result = post_quantum_result_from_payload(real_payload)

        self.assertIsInstance(result, PostQuantumResult)
        self.assertTrue(0.0 <= result.quantum_prediction.risk_score <= 1.0)
        self.assertTrue(0.0 <= result.classical_prediction.svm_risk <= 1.0)
        self.assertIsNotNone(result.latent_vector_10d)
        self.assertEqual(len(result.latent_vector_10d), 10)
        self.assertGreater(len(result.explainability), 0)

    # -------------------------------------------------------------------------
    # 10. JSON Serialization Roundtrip Check
    # -------------------------------------------------------------------------
    def test_serialization_roundtrip(self):
        result_orig = post_quantum_result_from_payload(self.valid_payload)

        # Serialize contract to dictionary and JSON string
        dict_payload = post_quantum_result_to_dict(result_orig)
        json_str = json.dumps(dict_payload)

        # Deserialize JSON string back to contract object
        reconstructed_dict = json.loads(json_str)
        result_reconstructed = post_quantum_result_from_dict(reconstructed_dict)

        self.assertEqual(result_orig.sample_id, result_reconstructed.sample_id)
        self.assertEqual(result_orig.quantum_prediction.risk_score, result_reconstructed.quantum_prediction.risk_score)
        self.assertEqual(result_orig.classical_prediction.svm_risk, result_reconstructed.classical_prediction.svm_risk)
        self.assertEqual(result_orig.model_comparison.quantum_lift_over_svm, result_reconstructed.model_comparison.quantum_lift_over_svm)
        self.assertEqual(len(result_orig.explainability), len(result_reconstructed.explainability))
        self.assertEqual(result_orig.latent_vector_10d, result_reconstructed.latent_vector_10d)


if __name__ == "__main__":
    unittest.main()
