"""
Structured Common Patient Model (CPM) for HQD-Net.
Preserves patient-level clinical information from multimodal inputs before compression.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CommonPatientModel(BaseModel):
    """
    Unified, structured patient data contract.
    Missing fields remain explicitly None/null.
    """
    patient_id: Optional[str] = Field(default=None, description="Unique patient identifier")
    age: Optional[float] = Field(default=None, description="Age in years")
    sex: Optional[str] = Field(default=None, description="Gender / sex")
    height: Optional[float] = Field(default=None, description="Height in cm")
    weight: Optional[float] = Field(default=None, description="Weight in kg")
    bmi: Optional[float] = Field(default=None, description="Body Mass Index")
    systolic_bp: Optional[float] = Field(default=None, description="Systolic Blood Pressure (ap_hi)")
    diastolic_bp: Optional[float] = Field(default=None, description="Diastolic Blood Pressure (ap_lo)")
    cholesterol: Optional[float] = Field(default=None, description="Cholesterol category/level")
    glucose: Optional[float] = Field(default=None, description="Glucose level")
    smoking: Optional[int] = Field(default=None, description="Smoking status (0/1)")
    alcohol: Optional[int] = Field(default=None, description="Alcohol intake (0/1)")
    physical_activity: Optional[int] = Field(default=None, description="Physical activity status (0/1)")
    
    symptoms: List[str] = Field(default_factory=list, description="Extracted clinical symptoms")
    medical_history: List[str] = Field(default_factory=list, description="Patient medical history")
    medications: List[str] = Field(default_factory=list, description="Current medications")
    
    lab_results: Dict[str, Any] = Field(default_factory=dict, description="Structured lab results")
    imaging_findings: Dict[str, Any] = Field(default_factory=dict, description="2D/3D Imaging features & findings")
    ECG_findings: Dict[str, Any] = Field(default_factory=dict, description="ECG signal findings & embeddings")
    document_entities: List[Dict[str, Any]] = Field(default_factory=list, description="OCR / Text extracted entities")
    
    source_provenance: Dict[str, str] = Field(default_factory=dict, description="Provenance mapping for each field")

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CommonPatientModel":
        return cls(**data)

