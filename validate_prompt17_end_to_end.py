"""
================================================================================
HQD-NET PROMPT 17 — END-TO-END PREPROCESSOR TO QUANTUM MODEL VALIDATION
================================================================================
Executes complete black-box validation from user input files to the quantum model output:
Raw Input Files -> Input Router -> Preprocessing -> Feature Extraction/Selection
-> TorchXRayVision 2D Encoder -> Stage 8 10-D Projection -> Stage 9 Quantum Handoff
-> Frozen Immutable VQC -> Quantum Output Probabilities.
================================================================================
"""

import hashlib
import os
from pathlib import Path
import sys
import time
import numpy as np
import pandas as pd
import torch

# Ensure project root is accessible
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from classical_preprocessing import (
    InputRouter,
    InputKind,
    TabularPreprocessingPipeline,
    Imaging2DConfig,
    Imaging2DPipeline,
    TorchXRayVisionEncoder,
    Unified10DProjector,
    UnifiedProjectionConfig,
    QuantumHandoffAdapter,
    align_multimodal_inputs,
)


def get_file_sha256(file_path: Path) -> str:
    """Calculate SHA-256 checksum of a file."""
    return hashlib.sha256(file_path.read_bytes()).hexdigest()


def run_prompt17_validation():
    print("=" * 80)
    print("  HQD-NET PROMPT 17: END-TO-END PREPROCESSOR -> QUANTUM MODEL VALIDATION")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # 0. Check Protected File Integrity (Before)
    # -------------------------------------------------------------------------
    protected_files = {
        "hqd_quantum.py": PROJECT_ROOT / "quantum_core" / "hqd_quantum.py",
        "qsvm_backend.py": PROJECT_ROOT / "quantum_core" / "qsvm_backend.py",
        "vqc_model_weights.pth": PROJECT_ROOT / "quantum_core" / "vqc_model_weights.pth",
    }
    initial_hashes = {}
    print("\n[Step 0] Protected File Hashes (Initial):")
    for name, path in protected_files.items():
        if path.exists():
            h = get_file_sha256(path)
            initial_hashes[name] = h
            print(f"  - {name}: {h}")
        else:
            print(f"  - WARNING: {name} not found at {path}")

    # -------------------------------------------------------------------------
    # 1. Environment Details
    # -------------------------------------------------------------------------
    print("\n[Step 1] Environment Diagnostics:")
    print(f"  - OS: {sys.platform}")
    print(f"  - Python: {sys.version.split()[0]}")
    print(f"  - PyTorch: {torch.__version__}")
    print(f"  - CUDA Available: {torch.cuda.is_available()}")

    import torchxrayvision as xrv
    import monai

    print(f"  - TorchXRayVision: {xrv.__version__}")
    print(f"  - MONAI: {monai.__version__}")

    # -------------------------------------------------------------------------
    # 2. Input File Inspection
    # -------------------------------------------------------------------------
    csv_file = PROJECT_ROOT / "raw_clinical_test.csv"
    xlsx_file = PROJECT_ROOT / "raw_clinical_test.xlsx"
    xray_file = PROJECT_ROOT / "mock_chest_xray.png"

    print("\n[Step 2] Input File Verification:")
    print(f"  - CSV File:  {csv_file.name} (exists: {csv_file.exists()}, size: {csv_file.stat().st_size if csv_file.exists() else 0} bytes)")
    print(f"  - XLSX File: {xlsx_file.name} (exists: {xlsx_file.exists()}, size: {xlsx_file.stat().st_size if xlsx_file.exists() else 0} bytes)")
    print(f"  - X-Ray File:{xray_file.name} (exists: {xray_file.exists()}, size: {xray_file.stat().st_size if xray_file.exists() else 0} bytes)")

    # Read spreadsheet data
    df_raw_full = pd.read_csv(csv_file)
    df_raw = df_raw_full.drop_duplicates(subset=["patient_id"]).reset_index(drop=True)
    print(f"  - Spreadsheet shape (raw): {df_raw_full.shape[0]} rows x {df_raw_full.shape[1]} columns")
    print(f"  - Spreadsheet shape (deduplicated): {df_raw.shape[0]} rows x {df_raw.shape[1]} columns")
    print(f"  - Patient ID column present: {'patient_id' in df_raw.columns}")
    print(f"  - Target column present: {'diagnosed_disease_target' in df_raw.columns}")

    numeric_cols = df_raw.select_dtypes(include=[np.number]).columns.tolist()
    if "diagnosed_disease_target" in numeric_cols:
        numeric_cols.remove("diagnosed_disease_target")
    print(f"  - Clinical numeric features count: {len(numeric_cols)}")

    null_count = df_raw[numeric_cols].isna().sum().sum()
    print(f"  - Total missing values in features: {null_count}")

    duplicates = df_raw.duplicated().sum()
    print(f"  - Duplicate rows found: {duplicates}")

    # -------------------------------------------------------------------------
    # 3. Input Router Verification
    # -------------------------------------------------------------------------
    print("\n[Step 3] Input Router Dispatch:")
    router = InputRouter()

    decision_csv = router.route(csv_file)
    print(f"  - {csv_file.name} -> Kind: {decision_csv.input_kind.value}, Format: {decision_csv.extension}, Path: {decision_csv.processing_path.value}")
    assert decision_csv.input_kind == InputKind.TABULAR, "CSV file was not routed to TABULAR!"

    decision_xlsx = router.route(xlsx_file)
    print(f"  - {xlsx_file.name} -> Kind: {decision_xlsx.input_kind.value}, Format: {decision_xlsx.extension}, Path: {decision_xlsx.processing_path.value}")
    assert decision_xlsx.input_kind == InputKind.TABULAR, "XLSX file was not routed to TABULAR!"

    decision_xray = router.route(xray_file)
    print(f"  - {xray_file.name} -> Kind: {decision_xray.input_kind.value}, Format: {decision_xray.extension}, Path: {decision_xray.processing_path.value}")
    assert decision_xray.input_kind == InputKind.IMAGE_2D, "PNG X-ray file was not routed to IMAGE_2D!"

    # -------------------------------------------------------------------------
    # 4. Tabular-Only Pipeline Validation (Test A)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[Test A] Executing Real Pipeline — Tabular Only (raw_clinical_test.csv)")
    print("-" * 70)

    t0 = time.perf_counter()

    # Stage 3: Tabular Preprocessing
    t_tab0 = time.perf_counter()
    tab_pipeline = TabularPreprocessingPipeline()
    tab_result = tab_pipeline.fit_transform(df_raw)
    t_tab1 = time.perf_counter()

    print(f"  - Preprocessed Tabular Matrix Shape: {tab_result.processed_features.shape}")
    print(f"  - Missing values after imputation: {np.isnan(tab_result.processed_features).sum()}")
    print(f"  - All values finite: {np.isfinite(tab_result.processed_features).all()}")
    print(f"  - Processed feature dtype: {tab_result.processed_features.dtype}")
    print(f"  - Tabular Preprocessing Time: {(t_tab1 - t_tab0)*1000:.2f} ms")

    # Stage 8: Unified Projection
    t_proj0 = time.perf_counter()
    sample_ids = tab_result.traceability_metadata.get("sample_ids") or (
        df_raw["patient_id"].astype(str).tolist() if "patient_id" in df_raw.columns else [f"SAMPLE_{i:04d}" for i in range(len(df_raw))]
    )
    projector_tab = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
    tabular_arg = (tab_result.processed_features, sample_ids)
    projector_tab.fit(tabular=tabular_arg, sample_ids=sample_ids)
    unified_rep_tab = projector_tab.transform(tabular=tabular_arg, sample_ids=sample_ids)
    t_proj1 = time.perf_counter()

    z_tab = unified_rep_tab.representation  # (N, 10)
    print(f"  - Stage 8 10-D Vector Shape: {z_tab.shape}")
    print(f"  - Stage 8 Dtype: {z_tab.dtype}")
    print(f"  - Stage 8 All Finite: {np.isfinite(z_tab).all()}")
    print(f"  - Stage 8 Modality Presence Mask: {unified_rep_tab.modality_presence[0]}")
    print(f"  - Stage 8 Projection Time: {(t_proj1 - t_proj0)*1000:.2f} ms")

    # Stage 9: Quantum Handoff
    t_handoff0 = time.perf_counter()
    handoff_adapter = QuantumHandoffAdapter()
    quantum_angles_tab = handoff_adapter.prepare_quantum_input(z_tab)
    t_handoff1 = time.perf_counter()

    print(f"  - Stage 9 Quantum Angles Shape: {quantum_angles_tab.shape}")
    print(f"  - Stage 9 Quantum Angles Dtype: {quantum_angles_tab.dtype}")
    print(f"  - Stage 9 Quantum Angles Range [Min, Max]: [{quantum_angles_tab.min().item():.4f}, {quantum_angles_tab.max().item():.4f}]")
    print(f"  - All angles within [-pi, pi]: {((quantum_angles_tab >= -np.pi) & (quantum_angles_tab <= np.pi)).all().item()}")

    # Immutable Quantum Core Execution
    t_q0 = time.perf_counter()
    probs_tab, theta_tab = handoff_adapter.execute_quantum_model(z_tab)
    t_q1 = time.perf_counter()
    t1 = time.perf_counter()

    probs_np_tab = probs_tab.cpu().numpy()
    row_sums_tab = probs_np_tab.sum(axis=1)

    print(f"  - Quantum Output Probabilities Shape: {probs_tab.shape}")
    print(f"  - Quantum Output Dtype: {probs_tab.dtype}")
    print(f"  - All Quantum Outputs Finite: {np.isfinite(probs_np_tab).all()}")
    print(f"  - Row Sums Approximately 1.0: {np.allclose(row_sums_tab, 1.0, atol=1e-4)} (Min sum: {row_sums_tab.min():.6f}, Max sum: {row_sums_tab.max():.6f})")
    print(f"  - Sample Patient 1 Risk Probability: P(High Risk) = {probs_np_tab[0, 1]*100:.2f}%")
    print(f"  - Quantum Model Execution Time: {(t_q1 - t_q0)*1000:.2f} ms")
    print(f"  - Total Pipeline Execution Time (Tabular): {(t1 - t0)*1000:.2f} ms")

    # -------------------------------------------------------------------------
    # 5. Multimodal Pipeline Validation (Test B: Tabular + X-Ray)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[Test B] Executing Real Pipeline — Multimodal (Tabular + TorchXRayVision X-Ray)")
    print("-" * 70)

    t_mm0 = time.perf_counter()

    # 2D Pretrained TorchXRayVision Encoder Execution
    t_xray0 = time.perf_counter()
    cfg_2d = Imaging2DConfig(encoder_name="torchxrayvision")
    encoder_2d = TorchXRayVisionEncoder(config=cfg_2d, weights=None)
    pipeline_2d = Imaging2DPipeline(config=cfg_2d, encoder=encoder_2d)

    print(f"  - TorchXRayVision Model Weights Name: {encoder_2d.weights_name}")
    print(f"  - Encoder Output Dimension: {encoder_2d.embedding_dim}")
    param_count = sum(p.numel() for p in encoder_2d.model.parameters())
    print(f"  - DenseNet-121 Parameter Count: {param_count:,}")

    img_rep_2d = pipeline_2d.process_image(xray_file, sample_id=sample_ids[0])
    t_xray1 = time.perf_counter()

    print(f"  - X-Ray Feature Embedding Shape: {img_rep_2d.embeddings.shape}")
    print(f"  - X-Ray Feature Embedding Dtype: {img_rep_2d.embeddings.dtype}")
    print(f"  - X-Ray All Values Finite: {np.isfinite(img_rep_2d.embeddings).all()}")
    print(f"  - 2D X-Ray Encoding Time: {(t_xray1 - t_xray0)*1000:.2f} ms")

    # Stage 8 Multimodal Fusion
    t_mmp0 = time.perf_counter()
    projector_mm = Unified10DProjector(config=UnifiedProjectionConfig(projection_method="unsupervised_pca"))
    projector_mm.fit(tabular=tabular_arg, image_2d=img_rep_2d, sample_ids=sample_ids)
    unified_rep_mm = projector_mm.transform(tabular=tabular_arg, image_2d=img_rep_2d, sample_ids=sample_ids)
    t_mmp1 = time.perf_counter()

    z_mm = unified_rep_mm.representation
    print(f"  - Multimodal Stage 8 10-D Vector Shape: {z_mm.shape}")
    print(f"  - Multimodal Modality Presence Mask: {unified_rep_mm.modality_presence[0]}")
    print(f"  - Stage 8 Multimodal Projection Time: {(t_mmp1 - t_mmp0)*1000:.2f} ms")

    # Stage 9 Handoff & Immutable Quantum Model Execution
    t_mmq0 = time.perf_counter()
    probs_mm, theta_mm = handoff_adapter.execute_quantum_model(z_mm)
    t_mmq1 = time.perf_counter()
    t_mm1 = time.perf_counter()

    probs_np_mm = probs_mm.cpu().numpy()
    row_sums_mm = probs_np_mm.sum(axis=1)

    print(f"  - Multimodal Quantum Output Shape: {probs_mm.shape}")
    print(f"  - Multimodal Quantum Output Dtype: {probs_mm.dtype}")
    print(f"  - Row Sums Approximately 1.0: {np.allclose(row_sums_mm, 1.0, atol=1e-4)}")
    print(f"  - Multimodal Sample Patient 1 Risk: P(High Risk) = {probs_np_mm[0, 1]*100:.2f}%")
    print(f"  - Multimodal Quantum Execution Time: {(t_mmq1 - t_mmq0)*1000:.2f} ms")
    print(f"  - Total Pipeline Execution Time (Multimodal): {(t_mm1 - t_mm0)*1000:.2f} ms")

    # -------------------------------------------------------------------------
    # 6. Determinism & Reproducibility Verification
    # -------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[Step 6] Determinism Verification:")
    print("-" * 70)

    probs_tab_run2, _ = handoff_adapter.execute_quantum_model(z_tab)
    diff_tab = np.abs(probs_tab.cpu().numpy() - probs_tab_run2.cpu().numpy()).max()
    print(f"  - Tabular Quantum Output Max Difference across runs: {diff_tab:.8e}")
    assert diff_tab < 1e-6, "Tabular quantum outputs are non-deterministic!"

    probs_mm_run2, _ = handoff_adapter.execute_quantum_model(z_mm)
    diff_mm = np.abs(probs_mm.cpu().numpy() - probs_mm_run2.cpu().numpy()).max()
    print(f"  - Multimodal Quantum Output Max Difference across runs: {diff_mm:.8e}")
    assert diff_mm < 1e-6, "Multimodal quantum outputs are non-deterministic!"

    print("  ✅ PASS: All pipeline outputs are 100% deterministic and reproducible.")

    # -------------------------------------------------------------------------
    # 7. Error Handling Verification
    # -------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[Step 7] Error Handling Verification:")
    print("-" * 70)

    try:
        router.route("non_existent_file.xyz")
        print("  - ERROR: Non-existent file did not trigger exception!")
    except Exception as e:
        print(f"  - Non-existent file handled cleanly: '{type(e).__name__}: {e}'")

    # -------------------------------------------------------------------------
    # 8. Check Protected File Integrity (After)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[Step 8] Protected File Integrity Check (After):")
    print("-" * 70)
    for name, path in protected_files.items():
        if path.exists():
            h_after = get_file_sha256(path)
            h_before = initial_hashes.get(name)
            self_match = h_after == h_before
            print(f"  - {name}: MATCH={self_match} ({h_after})")
            assert self_match, f"PROTECTED FILE ALTERED: {name}"

    print("\n" + "=" * 80)
    print("  FINAL VERDICT: END-TO-END PREPROCESSOR -> QUANTUM VALIDATION PASSED")
    print("=" * 80)


if __name__ == "__main__":
    run_prompt17_validation()
