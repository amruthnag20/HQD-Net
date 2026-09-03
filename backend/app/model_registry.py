"""
Runtime Model Registry Module for HQD-Net.
Tracks active production models, versions, artifact paths, training datasets, metrics,
and validation statuses (APPROVED, VALIDATED, CANDIDATE, RETIRED).
"""

from typing import Any, Dict, List
from pydantic import BaseModel, Field


class RegisteredModel(BaseModel):
    model_name: str
    model_type: str = Field(description="quantum / classical / llm / encoder")
    version: str
    artifact_path: str
    training_dataset: str
    training_date: str
    metrics: Dict[str, float]
    feature_schema: str
    status: str = Field(description="APPROVED / VALIDATED / CANDIDATE / RETIRED")


_MODEL_REGISTRY_DATABASE: List[RegisteredModel] = [
    RegisteredModel(
        model_name="HQD-Net 10-Qubit Dressed VQC Core",
        model_type="quantum",
        version="vqc_v1.0.0",
        artifact_path="quantum_core/vqc_model_weights.pth",
        training_dataset="Cardiovascular Disease Dataset (cardio_train.csv)",
        training_date="2026-09-02",
        metrics={"roc_auc": 0.6808, "accuracy": 0.6372},
        feature_schema="10-D Latent PCA Vector (z_00 to z_09)",
        status="APPROVED"
    ),
    RegisteredModel(
        model_name="Random Forest CVD Classifier",
        model_type="classical",
        version="rf_v1.0.0",
        artifact_path="models/classical/random_forest/random_forest_cvd.pkl",
        training_dataset="Cardiovascular Disease Dataset (cardio_train.csv)",
        training_date="2026-09-02",
        metrics={"roc_auc": 0.8010, "accuracy": 0.7324, "f1_score": 0.7177},
        feature_schema="12-D Raw Tabular CVD Features",
        status="APPROVED"
    ),
    RegisteredModel(
        model_name="Calibrated RBF Support Vector Classifier",
        model_type="classical",
        version="svm_v1.0.0",
        artifact_path="classical_preprocessing/svm_model.pkl",
        training_dataset="Cardiovascular Disease Dataset (cardio_train.csv)",
        training_date="2026-09-02",
        metrics={"roc_auc": 0.7909, "accuracy": 0.7312},
        feature_schema="10-D Latent PCA Vector (z_00 to z_09)",
        status="APPROVED"
    ),
    RegisteredModel(
        model_name="MerMED Vision Transformer Encoder",
        model_type="encoder",
        version="mermed_v1.0.0",
        artifact_path="weights/MerMED.pth",
        training_dataset="Multi-Specialty 2D Medical Scans",
        training_date="2026-08-30",
        metrics={"embedding_dim": 768},
        feature_schema="2D CXR Scans (224x224)",
        status="APPROVED"
    ),
    RegisteredModel(
        model_name="MedicalNet 3D ResNet-10 Encoder",
        model_type="encoder",
        version="medicalnet_v1.0.0",
        artifact_path="resnet_10_23dataset.pth",
        training_dataset="3D Medical Volumetric Dataset",
        training_date="2026-08-30",
        metrics={"embedding_dim": 512},
        feature_schema="3D MRI/CT Volumes (32x32x32)",
        status="APPROVED"
    )
]


def get_model_registry() -> List[Dict[str, Any]]:
    """Returns runtime model registry inventory."""
    return [model.model_dump() for model in _MODEL_REGISTRY_DATABASE]


def get_approved_model(model_type: str) -> RegisteredModel:
    """Retrieves approved model for requested type."""
    for model in _MODEL_REGISTRY_DATABASE:
        if model.model_type == model_type and model.status == "APPROVED":
            return model
    return _MODEL_REGISTRY_DATABASE[0]
