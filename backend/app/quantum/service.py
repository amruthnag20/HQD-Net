"""
Native Quantum Service (Phase 3B.2).
Loads the frozen VQC checkpoint and executes real PennyLane inference
on the native clinical_data_synthetic.csv domain.
"""

from pathlib import Path
from typing import Any, Dict, Optional
import torch

from quantum_core.hqd_quantum import DressedVQC
from backend.app.quantum.native_preprocessing import (
    NATIVE_DATASET_FILENAME,
    NativePreprocessingArtifacts,
    reproduce_native_preprocessing,
)
from backend.app.quantum.schemas import (
    InputTelemetry,
    ModelTelemetry,
    PredictionTelemetry,
    QuantumExecutionTelemetry,
    QuantumPredictResponse,
)


class NativeQuantumService:
    """
    Dedicated execution service for the frozen 10-qubit VQC model.
    Maintains zero mock fallback and strictly enforces native-domain inputs.
    """

    def __init__(self, project_root: Optional[Path] = None):
        if project_root is None:
            project_root = Path(__file__).resolve().parent.parent.parent.parent
        self.project_root = project_root

        self.checkpoint_path = self.project_root / "quantum_core" / "vqc_model_weights.pth"
        self.dataset_path = self.project_root / NATIVE_DATASET_FILENAME

        if not self.checkpoint_path.exists():
            raise FileNotFoundError(f"Frozen VQC checkpoint not found at: {self.checkpoint_path}")
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Native training dataset not found at: {self.dataset_path}")

        # 1. Reproduce original native preprocessing contract once
        self.artifacts: NativePreprocessingArtifacts = reproduce_native_preprocessing(self.dataset_path)

        # 2. Load authoritative checkpoint
        state_dict = torch.load(str(self.checkpoint_path), map_location="cpu", weights_only=True)

        expected_shapes = {
            "q_layer.weights": (2, 10, 3),
            "post_processing.0.weight": (16, 10),
            "post_processing.0.bias": (16,),
            "post_processing.2.weight": (2, 16),
            "post_processing.2.bias": (2,),
        }

        for key, expected_shape in expected_shapes.items():
            if key not in state_dict:
                raise KeyError(f"Missing required parameter '{key}' in frozen checkpoint.")
            actual_shape = tuple(state_dict[key].shape)
            if actual_shape != expected_shape:
                raise ValueError(
                    f"Tensor shape mismatch for '{key}': expected {expected_shape}, found {actual_shape}"
                )

        # 3. Instantiate authoritative DressedVQC with 2 layers and float64 precision
        self.model = DressedVQC(n_layers=2).double()
        self.model.load_state_dict(state_dict)
        self.model.eval()

    def predict_native_row(self, dataset: str, row_index: int) -> QuantumPredictResponse:
        """
        Executes real PennyLane quantum inference for a requested native row.
        """
        # Strict validation of dataset domain
        if dataset != NATIVE_DATASET_FILENAME:
            raise ValueError(
                f"Unsupported dataset '{dataset}'. Phase 3B.2 native verification only accepts '{NATIVE_DATASET_FILENAME}'."
            )

        n_rows = len(self.artifacts.df)
        if not (0 <= row_index < n_rows):
            raise IndexError(
                f"Row index {row_index} out of bounds for native dataset (valid range: [0, {n_rows - 1}])."
            )

        # Extract standardized 10-D feature vector
        vector_np = self.artifacts.X_scaled[row_index]
        patient_id = str(self.artifacts.df.loc[row_index, "patient_id"])

        # Execute real PennyLane quantum circuit in evaluation mode
        inputs_t = torch.tensor(vector_np, dtype=torch.float64).unsqueeze(0)
        with torch.no_grad():
            output_probs = self.model(inputs_t)

        normal_prob = float(output_probs[0, 0].item())
        high_risk_prob = float(output_probs[0, 1].item())

        class_index = 0 if normal_prob >= high_risk_prob else 1
        class_label = "Normal" if class_index == 0 else "High Risk"

        return QuantumPredictResponse(
            status="complete",
            model=ModelTelemetry(
                name="DressedVQC",
                checkpoint="quantum_core/vqc_model_weights.pth",
                wires=10,
                layers=2,
                feature_map="AngleEmbedding(rotation=Y)",
                ansatz="StronglyEntanglingLayers",
            ),
            input=InputTelemetry(
                source=NATIVE_DATASET_FILENAME,
                patient_id=patient_id,
                feature_count=10,
                feature_names=self.artifacts.selected_feature_names,
                standardized_vector=[float(v) for v in vector_np],
            ),
            prediction=PredictionTelemetry(
                class_index=class_index,
                class_label=class_label,
                probabilities={
                    "Normal": normal_prob,
                    "High Risk": high_risk_prob,
                },
            ),
            quantum_telemetry=QuantumExecutionTelemetry(
                device="default.qubit",
                wires=10,
                precision="float64",
            ),
        )
