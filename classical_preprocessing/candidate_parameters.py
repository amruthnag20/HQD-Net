"""
Candidate Parameter Space for HQD-Net.
Extracts all available parameters from the Common Patient Model (CPM) with metadata.
Does not fabricate fake clinical variables.
"""

from typing import Any, List, Optional
from pydantic import BaseModel, Field
from classical_preprocessing.cpm import CommonPatientModel


class CandidateParameter(BaseModel):
    name: str = Field(description="Parameter name")
    value: Any = Field(description="Parameter value")
    unit: Optional[str] = Field(default=None, description="Measurement unit")
    source: str = Field(default="tabular", description="Source modality or document")
    confidence: float = Field(default=1.0, description="Extraction / measurement confidence (0-1)")
    availability: bool = Field(default=True, description="Availability flag")
    clinical_category: str = Field(default="vital_sign", description="Clinical category")


def extract_candidate_parameter_space(cpm: CommonPatientModel) -> List[CandidateParameter]:
    """
    Collects available candidate parameters from CPM.
    Missing/null fields are excluded from available space.
    """
    candidates = []

    field_mapping = [
        ("age", "years", "demographic", "Age"),
        ("sex", "category", "demographic", "Sex / Gender"),
        ("height", "cm", "anthropometric", "Height"),
        ("weight", "kg", "anthropometric", "Weight"),
        ("bmi", "kg/m^2", "anthropometric", "Body Mass Index (BMI)"),
        ("systolic_bp", "mmHg", "vital_sign", "Systolic Blood Pressure"),
        ("diastolic_bp", "mmHg", "vital_sign", "Diastolic Blood Pressure"),
        ("cholesterol", "category", "lab_result", "Cholesterol Level"),
        ("glucose", "category", "lab_result", "Fasting Glucose"),
        ("smoking", "binary", "lifestyle", "Smoking Status"),
        ("alcohol", "binary", "lifestyle", "Alcohol Intake"),
        ("physical_activity", "binary", "lifestyle", "Physical Activity"),
    ]

    cpm_dict = cpm.to_dict()
    for field_name, unit, cat, label in field_mapping:
        val = cpm_dict.get(field_name)
        if val is not None:
            source = cpm.source_provenance.get(field_name, "tabular_input")
            candidates.append(CandidateParameter(
                name=label,
                value=val,
                unit=unit,
                source=source,
                confidence=1.0,
                availability=True,
                clinical_category=cat,
            ))

    # Add imaging / ECG candidate parameters if present
    if cpm.imaging_findings:
        for k, v in cpm.imaging_findings.items():
            candidates.append(CandidateParameter(
                name=f"Imaging Finding: {k}",
                value=v,
                unit="feature_embedding",
                source="2D/3D Imaging Processor",
                confidence=0.95,
                availability=True,
                clinical_category="imaging",
            ))

    if cpm.ECG_findings:
        for k, v in cpm.ECG_findings.items():
            candidates.append(CandidateParameter(
                name=f"ECG Signal: {k}",
                value=v,
                unit="signal_embedding",
                source="1D ResNet ECG Processor",
                confidence=0.92,
                availability=True,
                clinical_category="ecg",
            ))

    return candidates
