# HQD-Net Model Registry & Checkpoints

## Model Inventory

### 1. MerMED Pretrained Teacher Encoder
- **Architecture**: Vision Transformer (ViT-B/16)
- **Weights File**: `weights/MerMED.pth` (1,534.70 MB)
- **Representation**: 768-D Multi-Specialty 2D Latent Vector
- **Status**: Frozen / Immutable Evaluation Mode

### 2. NIH Imaging Multi-Label Head
- **Architecture**: Lightweight Projection (`768 -> 128 -> 10 -> 8 Diseases`)
- **Weights File**: `models/nih_mermed_head.pth`
- **Training Dataset**: 651 NIH Chest X-ray images (Patient-isolated split)
- **Performance**: Accuracy: 86.14%, Micro-Sensitivity: 86.14%, Micro-F1: 86.14%, Micro-ROC-AUC: 0.7608
- **Status**: `REAL_TRAINED`

### 3. Frozen 10-Qubit Softmax-Dressed VQC
- **Architecture**: 10-Qubit AngleEmbedding(Ry) + 2 StronglyEntanglingLayers + Classical Post-Processing (10->16->2)
- **Weights File**: `quantum_core/vqc_model_weights.pth` (SHA256 Protected)
- **Status**: `REAL_TRAINED` / Protected Core Checkpoint

### 4. Classical Baseline SVM
- **Architecture**: Calibrated RBF Support Vector Classifier
- **Model File**: `classical_preprocessing/svm_model.pkl`
- **Status**: Trained & Calibrated Baseline

### 5. 1D ResNet ECG Arrhythmia Encoder
- **Architecture**: 1D ResNet with Adaptive Pooling (768-D output)
- **Weights File**: `models/ecg_1d_cnn.pth`
- **Status**: `REAL_TRAINED`

### 6. Medical Document OCR CPM Extractor
- **Artifacts**: `models/ocr/preprocessing_config.json`, `models/ocr/metrics.json`
- **Status**: `REAL_TRAINED` / Evaluated
