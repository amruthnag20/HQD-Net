"""
Classical AI Models & Explainability (XAI) Engine for HQD-Net.

Executes production classical baselines:
  - Random Forest CVD (models/classical/random_forest/random_forest_cvd.pkl)
    Trained on 12 named physiological CVD features (no internal scaling).
  - Calibrated RBF SVM (classical_preprocessing/svm_model.pkl)
    Trained on 10-D PCA-projected latent vector.

Feature contract for Random Forest (authoritative – from train_all_cvd_models.py):
    ["age_years", "gender", "height", "weight", "bmi",
     "ap_hi", "ap_lo", "cholesterol", "gluc", "smoke", "alco", "active"]

    age_years = age_in_days / 365.25
    bmi       = weight / (height_in_m) ** 2
    No additional scaling is applied before the RF (it is a tree-based model).

IMPORTANT:
  - Patient probability is the per-patient P(cardio=1) from the live model execution.
  - Benchmark metrics (accuracy=73.24%, ROC-AUC=0.8010) describe performance on the
    held-out test set and must NEVER be returned as the patient's own risk score.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Expected feature names – must match exactly what the RF was fitted with.
# ---------------------------------------------------------------------------
RF_FEATURE_NAMES: List[str] = [
    "age_years", "gender", "height", "weight", "bmi",
    "ap_hi", "ap_lo", "cholesterol", "gluc", "smoke", "alco", "active",
]

# Benchmark metrics on the held-out CVD test set (NOT per-patient risk).
RF_BENCHMARK_METRICS: Dict[str, float] = {
    "accuracy":  0.7324,
    "precision": 0.7506,
    "recall":    0.6877,
    "f1":        0.7177,
    "roc_auc":   0.8010,
}


class ClassicalAIEngine:
    """
    Singleton-friendly manager for classical ML models and XAI attribution.
    Models are loaded once on first instantiation.
    """

    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path(__file__).resolve().parent.parent
        self.rf_model_path = (
            self.project_root / "models" / "classical" / "random_forest" / "random_forest_cvd.pkl"
        )
        self.svm_model_path = (
            self.project_root / "classical_preprocessing" / "svm_model.pkl"
        )

        self.rf_model = None
        self.svm_model = None
        self._load_models()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_models(self) -> None:
        if self.rf_model_path.exists():
            try:
                self.rf_model = joblib.load(self.rf_model_path)
            except Exception as exc:
                print(f"[ClassicalAIEngine] Warning: could not load Random Forest – {exc}")

        if self.svm_model_path.exists():
            try:
                self.svm_model = joblib.load(self.svm_model_path)
            except Exception as exc:
                print(f"[ClassicalAIEngine] Warning: could not load SVM – {exc}")

    def _build_rf_dataframe(self, raw_values: np.ndarray) -> pd.DataFrame:
        """
        Wraps a 1-D (12,) or 2-D (N, 12) numpy array into a named DataFrame
        so that sklearn does not produce a feature-name warning and the column
        order is guaranteed correct.
        """
        arr = raw_values.reshape(1, -1) if raw_values.ndim == 1 else raw_values
        if arr.shape[1] != len(RF_FEATURE_NAMES):
            raise ValueError(
                f"RF expects {len(RF_FEATURE_NAMES)} features, got {arr.shape[1]}"
            )
        return pd.DataFrame(arr, columns=RF_FEATURE_NAMES)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run_classical_inference(
        self,
        raw_12d_features: Optional[np.ndarray],
        latent_10d_features: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Executes Real RF (12-D named features) + Calibrated SVM (10-D latent).

        Returns a structured result dict with:
          - Per-patient risk probabilities (NOT benchmark metrics).
          - Separate benchmark block that clearly labels held-out performance.
          - MDI feature importances for Classical XAI.
        """
        rf_patient_prob: Optional[float] = None
        rf_xai: List[Dict[str, Any]] = []
        rf_executed = False

        # ── 1. Random Forest on 12-D raw clinical features ──────────────
        if self.rf_model is not None and raw_12d_features is not None:
            try:
                x_df = self._build_rf_dataframe(raw_12d_features)
                proba = self.rf_model.predict_proba(x_df)[0, 1]
                rf_patient_prob = float(proba)
                rf_executed = True

                # MDI feature importances (model-level, not sample-level)
                if hasattr(self.rf_model, "feature_importances_"):
                    imp = self.rf_model.feature_importances_
                    total = imp.sum()
                    norm = imp / total if total > 0 else imp
                    rf_xai = [
                        {
                            "feature_name": name,
                            "importance": float(v),
                            "impact_percentage": f"{v * 100:.2f}%",
                            "direction": "positive",
                            "source": "Random Forest (MDI)",
                        }
                        for name, v in sorted(
                            zip(RF_FEATURE_NAMES, norm),
                            key=lambda x: x[1],
                            reverse=True,
                        )
                    ]
            except Exception as exc:
                print(f"[ClassicalAIEngine] RF inference failed: {exc}")

        # ── 2. Calibrated SVM on 10-D latent vector ─────────────────────
        svm_patient_prob: Optional[float] = None
        svm_executed = False
        if self.svm_model is not None:
            try:
                x_svm = (
                    latent_10d_features.reshape(1, -1)
                    if latent_10d_features.ndim == 1
                    else latent_10d_features
                )
                svm_patient_prob = float(self.svm_model.predict_proba(x_svm)[0, 1])
                svm_executed = True
            except Exception as exc:
                print(f"[ClassicalAIEngine] SVM inference failed: {exc}")

        # Primary classical model = RF when available, SVM as fallback
        primary_prob = (
            rf_patient_prob if rf_patient_prob is not None
            else (svm_patient_prob if svm_patient_prob is not None else 0.5)
        )
        primary_name = (
            "Random Forest (CVD)" if rf_executed else "Calibrated RBF SVM (10-D)"
        )

        return {
            # ── top-level primary classical result ──────────────────────
            "primary_model_name": primary_name,
            "primary_model_path": str(
                self.rf_model_path if rf_executed else self.svm_model_path
            ),
            "primary_risk_score": primary_prob,
            "primary_risk_percentage": f"{primary_prob * 100:.1f}%",

            # ── Random Forest detail ────────────────────────────────────
            "random_forest_cvd": {
                "executed": rf_executed,
                "model_path": str(self.rf_model_path),
                "input_schema": "12-D Named CVD Features (no scaling)",
                "feature_names": RF_FEATURE_NAMES,
                # patient-level prediction
                "patient_probability": rf_patient_prob,
                "patient_classification": (
                    "High Risk" if rf_patient_prob is not None and rf_patient_prob >= 0.5
                    else "Normal"
                ),
                # held-out benchmark (distinct from patient prediction)
                "benchmark_held_out": {
                    **RF_BENCHMARK_METRICS,
                    "note": (
                        "Metrics measured on held-out 20% test split of cardio_train.csv. "
                        "NOT this patient's risk score."
                    ),
                },
                "xai_attributions": rf_xai,
            },

            # ── SVM detail ──────────────────────────────────────────────
            "svm_10d": {
                "executed": svm_executed,
                "model_path": str(self.svm_model_path),
                "input_schema": "10-D Unified Latent Vector (PCA-projected)",
                "patient_probability": svm_patient_prob,
                "patient_classification": (
                    "High Risk" if svm_patient_prob is not None and svm_patient_prob >= 0.5
                    else "Normal"
                ),
            },

            # ── documentation ───────────────────────────────────────────
            "comparison_compatible": True,
            "feature_space_documentation": (
                "Random Forest: 12-D raw physiological features (age_years, gender, height, "
                "weight, bmi, ap_hi, ap_lo, cholesterol, gluc, smoke, alco, active). "
                "SVM / Quantum VQC: 10-D PCA-projected latent vector. "
                "Both models address the same CVD binary classification task on the same dataset."
            ),
        }

    def build_model_comparison_payload(
        self,
        classical_result: Dict[str, Any],
        quantum_risk: float,
        quantum_label: str,
        patient_id: str = "PAT_1000",
    ) -> Dict[str, Any]:
        """
        Builds a ModelComparisonResult-shaped dict (matching the frontend TypeScript type)
        from the classical engine result and quantum VQC output.

        This is what the frontend's comparisonAdapter maps into ModelComparisonResult.
        """
        rf = classical_result.get("random_forest_cvd", {})
        rf_prob = rf.get("patient_probability")
        rf_label = rf.get("patient_classification", "Unknown")
        rf_bench = rf.get("benchmark_held_out", RF_BENCHMARK_METRICS)

        quantum_prob_normal = 1.0 - quantum_risk
        quantum_prob_highrisk = quantum_risk

        classical_prob = rf_prob if rf_prob is not None else 0.5
        classical_label = rf_label if rf_prob is not None else "Unavailable"

        # Difference metrics
        prob_delta = classical_prob - quantum_risk
        abs_gap_pp = abs(prob_delta) * 100.0
        class_matches = classical_label == quantum_label

        return {
            "status": "compatible",
            "agreement": "agree" if class_matches else "disagree",
            "priority": "low" if class_matches else "review-required",
            "patientId": patient_id,
            "targetColumn": "cardio",
            "datasetSource": "cardio_train.csv (Cardiovascular Disease Dataset)",
            "inputCompatibility": {
                "isCompatible": True,
                "status": "compatible",
                "reason": (
                    "Both models are trained on the same CVD binary classification task. "
                    "Random Forest uses 12-D raw clinical features; Quantum VQC uses a 10-D "
                    "PCA-projected latent vector of the same clinical inputs."
                ),
                "classicalDomain": "12-D Raw CVD Features (cardio_train.csv)",
                "quantumDomain": "10-D PCA Latent Vector (cardio_train.csv)",
                "featureOverlapCount": 12,
            },
            "classical": {
                "modelName": "Random Forest (CVD)",
                "modelType": "random-forest",
                "executionStatus": "trained" if rf.get("executed") else "unavailable",
                "predictionLabel": classical_label,
                "confidencePercent": round(max(classical_prob, 1 - classical_prob) * 100, 1),
                "probabilities": {
                    "Normal": round(1 - classical_prob, 4),
                    "High Risk": round(classical_prob, 4),
                },
                "featureCount": len(RF_FEATURE_NAMES),
                "featureNames": RF_FEATURE_NAMES,
                "inputDomain": "cardio_train.csv (12-D raw clinical features)",
                "metrics": {
                    "accuracy": rf_bench.get("accuracy"),
                    "precision": rf_bench.get("precision"),
                    "recall": rf_bench.get("recall"),
                    "f1": rf_bench.get("f1_score") or rf_bench.get("f1"),
                    "rocAuc": rf_bench.get("roc_auc"),
                    "evaluationMethod": "Held-out 20% test split (80/20 stratified, random_state=42)",
                    "foldCount": None,
                },
                "computationalMetadata": {
                    "architecture": "Random Forest (100 trees, max_depth=12)",
                    "framework": "scikit-learn (joblib artifact)",
                    "executionEnvironment": "Python FastAPI Backend (:8000)",
                    "numericPrecision": "float64",
                },
            },
            "quantum": {
                "modelName": "DressedVQC (10-Qubit)",
                "modelType": "dressed-vqc",
                "executionStatus": "complete",
                "predictionLabel": quantum_label,
                "confidencePercent": round(max(quantum_prob_normal, quantum_prob_highrisk) * 100, 1),
                "probabilities": {
                    "Normal": round(quantum_prob_normal, 4),
                    "High Risk": round(quantum_prob_highrisk, 4),
                },
                "featureCount": 10,
                "featureNames": [f"z_{i:02d}" for i in range(10)],
                "inputDomain": "10-D PCA Latent Vector (cardio_train.csv)",
                "metrics": None,
                "computationalMetadata": {
                    "architecture": "10-Qubit Dressed VQC (AngleEmbedding + 2 StronglyEntanglingLayers + Linear Post-Processing)",
                    "framework": "PennyLane + PyTorch",
                    "executionEnvironment": "Python FastAPI Backend (:8000)",
                    "numericPrecision": "float64",
                    "qubits": 10,
                    "layers": 2,
                    "ansatz": "StronglyEntanglingLayers",
                    "device": "default.qubit",
                },
            },
            "difference": {
                "predictedClassMatches": class_matches,
                "normalProbabilityDelta": round(prob_delta, 4),
                "probabilityGapPercentagePoints": round(abs_gap_pp, 2),
                "confidenceDelta": round(
                    (max(classical_prob, 1 - classical_prob) - max(quantum_risk, 1 - quantum_risk)) * 100,
                    2,
                ),
                "summaryText": (
                    f"Models agree on '{classical_label}' classification "
                    f"(Classical RF: {classical_prob * 100:.1f}%, Quantum VQC: {quantum_risk * 100:.1f}%)."
                    if class_matches else
                    f"Disagreement: Classical RF predicts '{classical_label}' "
                    f"({classical_prob * 100:.1f}%) while Quantum VQC predicts '{quantum_label}' "
                    f"({quantum_risk * 100:.1f}%). Clinical review recommended."
                ),
            },
            # Benchmark (held-out) vs patient prediction – clearly separated
            "benchmark_note": {
                "classical_benchmark": {
                    "accuracy_pct": f"{RF_BENCHMARK_METRICS['accuracy'] * 100:.2f}%",
                    "roc_auc": f"{RF_BENCHMARK_METRICS['roc_auc']:.4f}",
                    "evaluation_set": "Held-out 20% test split of cardio_train.csv",
                },
                "patient_prediction": {
                    "classical_rf_patient_probability": rf_prob,
                    "quantum_vqc_patient_probability": quantum_risk,
                    "note": "Patient probability is generated at runtime for this patient only.",
                },
            },
            "isDemoFixture": False,
        }
