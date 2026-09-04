"""
Backend Pipeline Orchestrator for Post-Quantum Clinical Intelligence.
Wires complete end-to-end architecture:
CPM -> Input LLM -> Candidate Parameters -> Parameter Priority Engine -> Top-K ->
Shared Preprocessing -> Classical AI (with XAI) + Quantum VQC -> Verification -> QuXAI + RAG -> Output LLM -> API Payload.
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np
import torch

from classical_preprocessing.cpm import CommonPatientModel
from classical_preprocessing.clinical_intelligence.input_llm import InputMedicalLLM
from classical_preprocessing.candidate_parameters import extract_candidate_parameter_space
from classical_preprocessing.parameter_priority import compute_parameter_priority_scores
from classical_preprocessing.topk_selection import select_topk_parameters
from classical_preprocessing.classical_models import ClassicalAIEngine
from classical_preprocessing.verification import verify_dual_models
from classical_preprocessing.multimodal_routing import MultimodalIngestionRouter

from classical_preprocessing.clinical_intelligence.api_contract import (
    build_api_error_payload,
    build_api_response_payload,
)
from classical_preprocessing.clinical_intelligence.contracts import post_quantum_result_from_payload
from classical_preprocessing.clinical_intelligence.ingestion import DocumentChunk, ingest_knowledge_directory
from classical_preprocessing.clinical_intelligence.llm import (
    ClinicalLLM,
    generate_clinical_report,
    get_configured_llm_provider,
)
from classical_preprocessing.clinical_intelligence.retrieval import MedicalEvidenceRetriever
from classical_preprocessing.pipeline_runner import run_hqd_real_pipeline

_KB_CACHE: Dict[str, List[DocumentChunk]] = {}
_CLASSICAL_ENGINE = ClassicalAIEngine()
_INPUT_LLM = InputMedicalLLM()
_INGESTION_ROUTER = MultimodalIngestionRouter()


def _get_cached_kb_chunks(kb_dir: str) -> List[DocumentChunk]:
    if kb_dir not in _KB_CACHE:
        if os.path.exists(kb_dir):
            _KB_CACHE[kb_dir] = ingest_knowledge_directory(kb_dir)
        else:
            _KB_CACHE[kb_dir] = []
    return _KB_CACHE[kb_dir]


def run_clinical_analysis(
    raw_features: Optional[List[float]] = None,
    tabular_file_path: Optional[Union[str, Path]] = None,
    image_2d_path: Optional[Union[str, Path]] = None,
    image_3d_path: Optional[Union[str, Path]] = None,
    ecg_input: Optional[Union[List[float], str, Path]] = None,
    document_text: Optional[str] = None,
    backend_choice: str = "VQC",
    kb_dir: str = "knowledge_base",
    llm_provider: Optional[ClinicalLLM] = None,
) -> Dict[str, Any]:
    """
    Executes complete end-to-end architecture pipeline in a single pass.
    """
    try:
        # 1. Run core pipeline (PCA 10-D projection, 10-qubit VQC, QuXAI Jacobian)
        tab_input = tabular_file_path if tabular_file_path is not None else raw_features

        raw_payload = run_hqd_real_pipeline(
            tabular_input=tab_input,
            image_2d_input=image_2d_path,
            image_3d_input=image_3d_path,
            backend_choice=backend_choice,
        )

        if raw_payload.get("status") == "error":
            return build_api_error_payload("PREPROCESSING_ERROR", raw_payload.get("error_message", "Unknown error"))

        # 2. Build Structured Common Patient Model (CPM)
        sample_ids_list = raw_payload.get("meta_summary", {}).get("sample_ids", [])
        sample_id = str(sample_ids_list[0]) if sample_ids_list else "PAT_1000"

        cpm = CommonPatientModel(patient_id=sample_id)
        extracted_12d = raw_payload.get("raw_12d_features")
        effective_raw_features = raw_features if (raw_features and len(raw_features) >= 12) else extracted_12d

        if effective_raw_features and len(effective_raw_features) >= 12:
            cpm.age = float(effective_raw_features[0])
            cpm.sex = "Male" if effective_raw_features[1] in [2, "2", "Male"] else "Female"
            cpm.height = float(effective_raw_features[2])
            cpm.weight = float(effective_raw_features[3])
            cpm.bmi = float(effective_raw_features[4])
            cpm.systolic_bp = float(effective_raw_features[5])
            cpm.diastolic_bp = float(effective_raw_features[6])
            cpm.cholesterol = float(effective_raw_features[7])
            cpm.glucose = float(effective_raw_features[8])
            cpm.smoking = int(effective_raw_features[9])
            cpm.alcohol = int(effective_raw_features[10])
            cpm.physical_activity = int(effective_raw_features[11])

        # 3. Input Medical LLM Semantic Normalization (if document text provided or fallback)
        if document_text:
            cpm, input_llm_meta = _INPUT_LLM.process_raw_text_to_cpm(document_text, cpm)
        else:
            input_llm_meta = {
                "execution_status": "NO_FREE_TEXT_INPUT_STANDALONE_TABULAR",
                "mediphi_available_on_disk": _INPUT_LLM.has_mediphi_local,
                "entities_extracted_count": 0
            }

        # 4. Route ECG & OCR Document inputs
        if ecg_input is not None:
            cpm.ECG_findings = _INGESTION_ROUTER.process_ecg_input(ecg_input)
        if document_text:
            cpm.document_entities.append(_INGESTION_ROUTER.process_ocr_document(document_text))

        # 5. Extract Candidate Parameter Space
        candidates = extract_candidate_parameter_space(cpm)

        # 6. Parameter Priority Engine
        ranked_params = compute_parameter_priority_scores(candidates)

        # 7. TOP-K Selection
        selected_params, topk_audit = select_topk_parameters(ranked_params, top_k=10)

        # 8. Classical AI Engine (RF 12-D + SVM 10-D + Classical XAI)
        raw_12d = None
        if effective_raw_features and len(effective_raw_features) >= 12:
            raw_12d = np.array(effective_raw_features[:12], dtype=np.float64)
        
        latent_10d = raw_payload.get("latent_representation", {}).get("latent_biomarkers_vector")
        latent_10d_arr = np.array(latent_10d, dtype=np.float64) if latent_10d else np.zeros(10, dtype=np.float64)

        classical_result = _CLASSICAL_ENGINE.run_classical_inference(
            raw_12d_features=raw_12d,
            latent_10d_features=latent_10d_arr,
        )

        # 9. Dual-Model Verification Engine
        quantum_risk = raw_payload.get("diagnostic_prediction", {}).get("disease_risk_score", 0.5)
        quantum_verdict = raw_payload.get("diagnostic_prediction", {}).get("verdict", "")
        quantum_label = "High Risk" if quantum_risk >= 0.5 else "Normal"
        classical_risk = classical_result.get("primary_risk_score", 0.5)
        verification_result = verify_dual_models(classical_risk, quantum_risk)

        # 10. Build frontend-compatible ModelComparisonResult (classical vs quantum)
        patient_id = cpm.patient_id or "PAT_1000"
        model_comparison = _CLASSICAL_ENGINE.build_model_comparison_payload(
            classical_result=classical_result,
            quantum_risk=quantum_risk,
            quantum_label=quantum_label,
            patient_id=patient_id,
        )

        # 11. Parse into PostQuantumResult contract
        post_q_result = post_quantum_result_from_payload(raw_payload)

        # 12. Retrieve Evidence from Knowledge Base (RAG)
        chunks = _get_cached_kb_chunks(kb_dir)
        retrieval_engine = MedicalEvidenceRetriever(chunks)
        evidence_bundle = retrieval_engine.retrieve_evidence(post_q_result, top_k=3)

        # 13. Generate Evidence-Grounded Clinical Report via Output LLM
        active_llm = llm_provider or get_configured_llm_provider()
        clinical_report = generate_clinical_report(post_q_result, evidence_bundle, llm=active_llm)

        # 14. Build final comprehensive API payload
        api_payload = build_api_response_payload(post_q_result, evidence_bundle, clinical_report)

        # ── Inject Architecture Pipeline Artifacts ──────────────────────
        api_payload["cpm"] = cpm.to_dict()
        api_payload["input_medical_llm"] = input_llm_meta
        api_payload["candidate_parameter_space"] = {
            "total_candidate_count": len(candidates),
            "parameters": [p.model_dump() for p in candidates],
        }
        api_payload["parameter_priority_engine"] = {
            "ranked_parameters": [rp.model_dump() for rp in ranked_params]
        }
        api_payload["topk_selection"] = topk_audit
        api_payload["classical_ai_engine"] = classical_result
        api_payload["dual_model_verification"] = verification_result.to_dict()
        api_payload["classical_xai"] = classical_result.get("random_forest_cvd", {}).get("xai_attributions", [])

        # ── Frontend-facing ModelComparisonResult block ─────────────────
        # Shape matches frontend's ModelComparisonResult TypeScript type exactly.
        # - classical.probabilities = RF patient-level P(cardio=1)   [runtime]
        # - classical.metrics       = held-out benchmark performance  [static]
        # - quantum.probabilities   = VQC patient-level P(cardio=1)  [runtime]
        api_payload["model_comparison"] = model_comparison

        return api_payload

    except Exception as err:
        return build_api_error_payload("PIPELINE_EXECUTION_ERROR", str(err))
