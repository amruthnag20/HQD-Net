"""
Deterministic 2D Image Preprocessing for Medical Features.
"""

from pathlib import Path
from typing import Any, Dict, Tuple, Union
import numpy as np
from PIL import Image
import torch

from classical_preprocessing.imaging_2d.config import Imaging2DConfig
from classical_preprocessing.imaging_2d.validator import validate_2d_image


def preprocess_2d_image(
    image_input: Union[str, Path, Image.Image, np.ndarray],
    config: Optional[Imaging2DConfig] = None,
) -> Tuple[torch.Tensor, Dict[str, Any]]:
    """
    Preprocess a 2D medical image into a standardized, normalized float tensor.

    Parameters
    ----------
    image_input : Union[str, Path, Image.Image, np.ndarray]
        Input image file path, PIL Image, or numpy array.
    config : Optional[Imaging2DConfig]
        Preprocessing configuration options.

    Returns
    -------
    Tuple[torch.Tensor, Dict[str, Any]]
        (Normalized tensor of shape (C, H, W), metadata dictionary)
    """
    cfg = config or Imaging2DConfig()
    report = validate_2d_image(image_input)

    if not report.is_valid:
        raise ValueError(f"2D Image validation failed: {'; '.join(report.errors)}")

    # 1. Load image to PIL
    if isinstance(image_input, (str, Path)):
        img = Image.open(str(image_input))
    elif isinstance(image_input, Image.Image):
        img = image_input.copy()
    elif isinstance(image_input, np.ndarray):
        arr = image_input
        if arr.dtype != np.uint8:
            # Scale to 0..255 uint8 if float
            if arr.max() <= 1.0:
                arr = (arr * 255.0).clip(0, 255).astype(np.uint8)
            else:
                arr = arr.clip(0, 255).astype(np.uint8)
        if arr.ndim == 2:
            img = Image.fromarray(arr, mode="L")
        elif arr.ndim == 3:
            img = Image.fromarray(arr)
        else:
            raise ValueError(f"Unsupported numpy array dimension: {arr.ndim}")
    else:
        raise TypeError(f"Unsupported image input type: {type(image_input).__name__}")

    # 2. Color mode handling
    if cfg.color_mode == "grayscale":
        img = img.convert("L")
    elif cfg.color_mode == "rgb":
        img = img.convert("RGB")

    target_h, target_w = cfg.target_size

    # 3. Resizing with aspect ratio preservation
    orig_w, orig_h = img.size

    if cfg.resizing_strategy == "resize_crop":
        # Scale so smaller dimension matches target
        scale = max(target_w / orig_w, target_h / orig_h)
        new_w = max(1, int(round(orig_w * scale)))
        new_h = max(1, int(round(orig_h * scale)))
        img_resized = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

        # Center crop
        left = (new_w - target_w) // 2
        top = (new_h - target_h) // 2
        img_final = img_resized.crop((left, top, left + target_w, top + target_h))

    else:  # letterbox_pad
        scale = min(target_w / orig_w, target_h / orig_h)
        new_w = max(1, int(round(orig_w * scale)))
        new_h = max(1, int(round(orig_h * scale)))
        img_resized = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

        fill_color = 0 if cfg.color_mode == "grayscale" else (0, 0, 0)
        img_final = Image.new(img.mode, (target_w, target_h), fill_color)
        left = (target_w - new_w) // 2
        top = (target_h - new_h) // 2
        img_final.paste(img_resized, (left, top))

    # 4. Convert to float tensor and normalize
    arr_final = np.array(img_final, dtype=np.float32)

    if cfg.color_mode == "grayscale":
        if arr_final.ndim == 2:
            arr_final = np.expand_dims(arr_final, axis=0)  # (1, H, W)
        elif arr_final.ndim == 3:
            arr_final = arr_final.transpose(2, 0, 1)[:1]  # (1, H, W)
    else:
        if arr_final.ndim == 2:
            arr_final = np.stack([arr_final] * 3, axis=0)  # (3, H, W)
        elif arr_final.ndim == 3:
            arr_final = arr_final.transpose(2, 0, 1)  # (3, H, W)

    # Normalize pixel intensity to [0.0, 1.0]
    tensor = torch.from_numpy(arr_final / 255.0)

    meta = {
        "original_shape": (orig_h, orig_w),
        "target_size": cfg.target_size,
        "color_mode": cfg.color_mode,
        "resizing_strategy": cfg.resizing_strategy,
        "modality": cfg.modality,
    }

    return tensor, meta
