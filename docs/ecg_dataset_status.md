# Dataset 1 Status — ECG Dataset

**Current Status:** **REAL_TRAINED**  
**Modality:** ECG_WAVEFORM  
**Data Location:** `data/raw/ecg/ecg_dataset.pt`  
**Model Location:** `models/ecg/`  

---

## Status Summary

1. **Dataset Download:** Verified compliant (424.10 MB archive, < 1.5 GB limit).
2. **Dataset Classification:** Confirmed genuine 12-lead raw continuous waveform (`[12, 5000]`).
3. **Data Preprocessing & Splitting:**
   - 2,000 samples split into 1,400 train, 300 val, and 300 test.
   - Per-lead normalization and bandpass filtering pipeline implemented.
4. **Lightweight Model Training:**
   - Sequential CPU-compatible training of 1D CNN waveform encoder.
   - Classification head evaluating 27 multilabel cardiac conditions.
5. **Deterministic Embedding Interface:**
   - Exposes `get_ecg_embedding(waveform_tensor)` returning a 32D continuous latent vector.
   - Pre-configured for projection into HQD-Net's 10D unified quantum feature vector ($z_1 \dots z_{10}$).

---

## Manifest Artifacts
- `models/ecg/encoder.pth`
- `models/ecg/classifier.pth`
- `models/ecg/config.json`
- `models/ecg/metrics.json`
- `models/ecg/preprocessing.pkl`
- `models/ecg/training_manifest.json`
- `models/ecg/README.md`
