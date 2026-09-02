"""
MONAI-Powered Deterministic 3D Volumetric Preprocessing for Medical Imaging Features (MRI / CT).
"""

from typing import Any, Dict, Optional, Tuple, Union
import numpy as np
import torch

try:
    import monai
    from monai.transforms import (
        Compose,
        NormalizeIntensity,
        Orientation,
        Resize,
        ScaleIntensityRange,
        ToTensor,
    )
    MONAI_AVAILABLE = True
except ImportError:
    MONAI_AVAILABLE = False

from classical_preprocessing.imaging_3d.config import Imaging3DConfig
from classical_preprocessing.imaging_3d.loader import Volume3DData, load_3d_volume
from classical_preprocessing.imaging_3d.validator import validate_3d_volume


def preprocess_3d_volume(
    volume_input: Any,
    config: Optional[Imaging3DConfig] = None,
) -> Tuple[torch.Tensor, Dict[str, Any]]:
    """
    Preprocess a 3D medical volume into a standardized, normalized 3D float tensor using MONAI.

    Parameters
    ----------
    volume_input : Any
        Input volume file path, Volume3DData, or 3D numpy array.
    config : Optional[Imaging3DConfig]
        Preprocessing configuration.

    Returns
    -------
    Tuple[torch.Tensor, Dict[str, Any]]
        (Normalized 4D tensor of shape (1, D, H, W), metadata dictionary)
    """
    cfg = config or Imaging3DConfig()
    report = validate_3d_volume(volume_input)

    if not report.is_valid:
        raise ValueError(f"3D Volume validation failed: {'; '.join(report.errors)}")

    vol_obj = load_3d_volume(volume_input)
    data = vol_obj.volume_data.copy().astype(np.float32)

    modality = cfg.modality.lower() if cfg.modality != "auto" else vol_obj.inferred_modality.lower()
    if modality == "unknown":
        raise ValueError(
            "Modality is UNKNOWN. Explicit modality ('mri' or 'ct') is required for "
            "clinical intensity windowing/normalization."
        )

    target_d, target_h, target_w = cfg.target_shape

    # Construct MONAI preprocessing transform sequence
    transforms_list = []

    if MONAI_AVAILABLE:
        # 1. Modality-specific intensity transformation via MONAI
        if modality in ("ct", "hu"):
            center = cfg.ct_window_center if cfg.ct_window_center is not None else 40.0
            width = cfg.ct_window_width if cfg.ct_window_width is not None else 400.0
            min_hu = center - (width / 2.0)
            max_hu = center + (width / 2.0)

            transforms_list.append(
                ScaleIntensityRange(a_min=min_hu, a_max=max_hu, b_min=0.0, b_max=1.0, clip=True)
            )
        elif modality == "mri":
            transforms_list.append(NormalizeIntensity(nonzero=True))
            transforms_list.append(
                ScaleIntensityRange(a_min=-3.0, a_max=3.0, b_min=0.0, b_max=1.0, clip=True)
            )
        else:
            transforms_list.append(NormalizeIntensity(nonzero=True))

        # 2. Spatial Resizing via MONAI
        transforms_list.append(Resize(spatial_size=(target_d, target_h, target_w), mode=cfg.resampling_strategy))
        transforms_list.append(ToTensor())

        monai_pipeline = Compose(transforms_list)

        # Prepare 4D tensor input for MONAI (1, D, H, W)
        input_4d = np.expand_dims(data, axis=0)
        tensor_4d = monai_pipeline(input_4d)

        # Ensure float32 tensor
        if not isinstance(tensor_4d, torch.Tensor):
            tensor_4d = torch.as_tensor(tensor_4d, dtype=torch.float32)
        else:
            tensor_4d = tensor_4d.to(dtype=torch.float32)

    else:
        # Fallback to PyTorch functional interpolation if MONAI is unavailable
        if modality in ("ct", "hu"):
            center = cfg.ct_window_center if cfg.ct_window_center is not None else 40.0
            width = cfg.ct_window_width if cfg.ct_window_width is not None else 400.0
            min_hu = center - (width / 2.0)
            max_hu = center + (width / 2.0)
            data = np.clip(data, min_hu, max_hu)
            data = (data - min_hu) / max(1e-6, max_hu - min_hu)
        else:
            mean_val = float(np.mean(data))
            std_val = float(np.std(data))
            if std_val > 1e-6:
                data = (data - mean_val) / std_val
            data = np.clip(data, -3.0, 3.0)
            data = (data - (-3.0)) / 6.0

        tensor_5d = torch.from_numpy(data).unsqueeze(0).unsqueeze(0)
        resampled_5d = torch.nn.functional.interpolate(
            tensor_5d,
            size=(target_d, target_h, target_w),
            mode="trilinear",
            align_corners=False,
        )
        tensor_4d = resampled_5d.squeeze(0)

    if not torch.isfinite(tensor_4d).all():
        raise ValueError("Preprocessed 3D volume tensor contains NaN or Inf values.")

    meta = {
        "original_shape": vol_obj.volume_data.shape,
        "target_shape": cfg.target_shape,
        "original_spacing": vol_obj.voxel_spacing,
        "target_spacing": cfg.target_spacing,
        "modality": modality,
        "orientation": vol_obj.orientation,
        "affine": vol_obj.affine,
        "monai_transforms_applied": MONAI_AVAILABLE,
    }

    return tensor_4d, meta
