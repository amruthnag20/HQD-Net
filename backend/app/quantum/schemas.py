"""
HQD-Net Quantum Backend Pydantic Schemas (Phase 3B.2).
Strict native-domain verification contracts.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class QuantumPredictRequest(BaseModel):
    dataset: str = Field(
        default="clinical_data_synthetic.csv",
        description="Dataset name. In Phase 3B.2 native verification, only 'clinical_data_synthetic.csv' is accepted."
    )
    row_index: int = Field(
        default=0,
        description="0-indexed row integer within the native training dataset [0, 499]."
    )


class ModelTelemetry(BaseModel):
    name: str = "DressedVQC"
    checkpoint: str = "quantum_core/vqc_model_weights.pth"
    wires: int = 10
    layers: int = 2
    feature_map: str = "AngleEmbedding(rotation=Y)"
    ansatz: str = "StronglyEntanglingLayers"


class InputTelemetry(BaseModel):
    source: str
    patient_id: str
    feature_count: int
    feature_names: List[str]
    standardized_vector: List[float]


class PredictionTelemetry(BaseModel):
    class_index: int
    class_label: str  # "Normal" or "High Risk"
    probabilities: Dict[str, float]


class QuantumExecutionTelemetry(BaseModel):
    device: str = "default.qubit"
    wires: int = 10
    precision: str = "float64"


class QuantumPredictResponse(BaseModel):
    status: str = "complete"
    model: ModelTelemetry
    input: InputTelemetry
    prediction: PredictionTelemetry
    quantum_telemetry: QuantumExecutionTelemetry


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "hqd-net-quantum-backend"
