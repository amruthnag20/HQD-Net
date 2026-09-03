# NIH Chest X-ray 14 Partial Dataset Training & Handoff Report

## Executive Summary
Training and evaluation of the NIH Chest X-ray 14 imaging pipeline was conducted using the 651 locally available images without downloading additional external data.

## Pipeline Architecture
```
NIH Chest X-ray Image (224x224)
        ↓
MerMED Pretrained Vision Transformer (ViT-B/16, weights/MerMED.pth)
        ↓
768-D Multi-Specialty Latent Embedding
        ↓
Lightweight Trainable Head (768 -> 128 -> 10 -> 8 Diseases)
        ↓
10-D Quantum Handoff Representation
        ↓
Frozen 10-Qubit Softmax-Dressed VQC (quantum_core/hqd_quantum.py)
```

## Training Parameters & Data
- **Dataset Status**: `REAL_TRAINED`
- **Total Images Used**: 651
- **Train / Val / Test Split**: 472 / 124 / 55 (Patient-isolated)
- **Primary Targets**: 8 multi-label disease categories (No Finding, Effusion, Infiltration, Atelectasis, Cardiomegaly, Pneumothorax, Emphysema, Mass)
- **Epochs**: 30
- **Optimizer**: AdamW (lr=0.001, weight_decay=0.0001)

## Benchmark Results (Patient-Isolated Test Set: 55 Images)
- **Overall Accuracy**: 86.14%
- **Micro-Sensitivity**: 86.14%
- **Micro-F1 Score**: 86.14%
- **Micro-ROC-AUC**: 0.7608

## Quantum Handoff Telemetry
- **Handoff Vector Dimension**: `(10,)`
- **Finite Check**: True (No NaN, No Inf)
- **Non-zero Vector**: True
- **Frozen VQC Integration**: Verified with `quantum_core/vqc_model_weights.pth`
- **Sample VQC Output**: Normal = 0.5003, High Risk = 0.4997

## Saved Artifacts
- **Model Head Checkpoint**: `models/nih_mermed_head.pth`
- **Cached Embeddings**: `data/embeddings/nih_cxr14_embeddings.pt` (2.10 MB)
- **Manifest**: `data/embeddings/nih_cxr14_manifest.csv`
- **Metrics Telemetry**: `models/nih_training_results.json`
