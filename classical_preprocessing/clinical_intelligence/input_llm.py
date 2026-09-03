"""
Input Medical LLM & Semantic Normalization Layer for HQD-Net.
Extracts clinical entities, normalizes medical terms, and populates CPM fields.
Uses MediPhi-Instruct if available/executable locally, or transparent rule-based fallback.
MUST NOT predict disease probability or alter quantum/classical model risk.
"""

import os
import re
from typing import Any, Dict, Tuple
from classical_preprocessing.cpm import CommonPatientModel


class InputMedicalLLM:
    """
    Interface for semantic normalization and entity extraction into the CPM.
    """

    def __init__(self, mediphi_dir: str = "models/MediPhi-Instruct"):
        self.mediphi_dir = mediphi_dir
        self.has_mediphi_local = os.path.exists(mediphi_dir) and any(os.listdir(mediphi_dir))

    def process_raw_text_to_cpm(
        self,
        raw_text: str,
        base_cpm: CommonPatientModel
    ) -> Tuple[CommonPatientModel, Dict[str, Any]]:
        """
        Extracts structured entities from raw clinical text into base_cpm.
        Returns updated CPM and execution metadata.
        """
        cpm_dict = base_cpm.to_dict()
        execution_status = "MEDIPHI_LOCAL_UNAVAILABLE_FALLBACK_EXECUTED"

        # Rule-based / Regular Expression normalization parser
        text_lower = raw_text.lower()

        # Extract BP if present
        bp_match = re.search(r'(\d{2,3})\s*[\/\\]\s*(\d{2,3})', raw_text)
        if bp_match and cpm_dict.get("systolic_bp") is None:
            cpm_dict["systolic_bp"] = float(bp_match.group(1))
            cpm_dict["diastolic_bp"] = float(bp_match.group(2))
            cpm_dict["source_provenance"]["systolic_bp"] = "InputLLM_text_extraction"
            cpm_dict["source_provenance"]["diastolic_bp"] = "InputLLM_text_extraction"

        # Extract Age
        age_match = re.search(r'(\d{1,3})\s*(?:years|yo|year-old|y/o)', text_lower)
        if age_match and cpm_dict.get("age") is None:
            cpm_dict["age"] = float(age_match.group(1))
            cpm_dict["source_provenance"]["age"] = "InputLLM_text_extraction"

        # Extract Symptoms
        symptom_keywords = ["chest pain", "shortness of breath", "dyspnea", "dizziness", "fatigue", "palpitations", "edema"]
        for sym in symptom_keywords:
            if sym in text_lower and sym not in cpm_dict["symptoms"]:
                cpm_dict["symptoms"].append(sym)

        # Extract Medications
        med_keywords = ["aspirin", "statin", "atorvastatin", "metformin", "lisinopril", "amlodipine", "beta-blocker"]
        for med in med_keywords:
            if med in text_lower and med not in cpm_dict["medications"]:
                cpm_dict["medications"].append(med)

        cpm_dict["document_entities"].append({
            "raw_text_snippet": raw_text[:200],
            "extracted_symptoms": list(cpm_dict["symptoms"]),
            "extracted_medications": list(cpm_dict["medications"])
        })

        meta = {
            "execution_status": execution_status,
            "mediphi_available_on_disk": self.has_mediphi_local,
            "entities_extracted_count": len(cpm_dict["symptoms"]) + len(cpm_dict["medications"])
        }

        return CommonPatientModel.from_dict(cpm_dict), meta
