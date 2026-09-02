"""
2D Medical Image Validator for Stage 6 Classical Ingestion.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
from PIL import Image

SUPPORTED_2D_EXTENSIONS = {".png", ".jpg", ".jpeg", ".dcm"}


@dataclass
class ImageValidationReport:
    """
    Validation report for 2D medical images.
    """
    is_valid: bool
    filepath: Optional[str] = None
    file_format: Optional[str] = None
    original_shape: Optional[Tuple[int, ...]] = None
    channel_count: int = 1
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


def validate_2d_image(
    image_input: Union[str, Path, Image.Image, np.ndarray],
) -> ImageValidationReport:
    """
    Validate a 2D medical image file or in-memory object.

    Parameters
    ----------
    image_input : Union[str, Path, Image.Image, np.ndarray]
        Path to image file, PIL Image, or numpy array.

    Returns
    -------
    ImageValidationReport
        Validation report detailing image health and shape.
    """
    if image_input is None:
        return ImageValidationReport(is_valid=False, errors=["Image input cannot be None."])

    errors = []
    warnings = []
    filepath_str = None
    file_fmt = None
    shape = None
    channels = 1

    # Handle file paths
    if isinstance(image_input, (str, Path)):
        filepath_str = str(image_input)
        path = Path(filepath_str)

        if not path.exists():
            return ImageValidationReport(
                is_valid=False,
                filepath=filepath_str,
                errors=[f"Image file does not exist: '{filepath_str}'"],
            )

        ext = path.suffix.lower()
        if ext not in SUPPORTED_2D_EXTENSIONS:
            return ImageValidationReport(
                is_valid=False,
                filepath=filepath_str,
                file_format=ext,
                errors=[f"Unsupported image extension '{ext}'. Supported: {sorted(list(SUPPORTED_2D_EXTENSIONS))}"],
            )

        file_fmt = ext.lstrip(".").upper()

        try:
            with Image.open(path) as img:
                img.verify()
            with Image.open(path) as img:
                shape = (img.height, img.width)
                mode = img.mode
                if mode in ("L", "I;16", "I", "F"):
                    channels = 1
                elif mode in ("RGB", "RGBA"):
                    channels = 3 if mode == "RGB" else 4
                else:
                    channels = 1
        except Exception as e:
            return ImageValidationReport(
                is_valid=False,
                filepath=filepath_str,
                file_format=file_fmt,
                errors=[f"Corrupt or unreadable image file: {str(e)}"],
            )

    # Handle PIL Image
    elif isinstance(image_input, Image.Image):
        shape = (image_input.height, image_input.width)
        file_fmt = image_input.format or "PIL"
        channels = 3 if image_input.mode in ("RGB", "RGBA") else 1

    # Handle Numpy Array
    elif isinstance(image_input, np.ndarray):
        file_fmt = "NUMPY"
        shape = image_input.shape
        if image_input.ndim == 2:
            channels = 1
        elif image_input.ndim == 3:
            channels = image_input.shape[2] if image_input.shape[2] in (1, 3, 4) else image_input.shape[0]
        else:
            errors.append(f"Expected 2-D or 3-D numpy array for 2D image, got shape {shape}")

    else:
        errors.append(f"Unsupported image input object type: {type(image_input).__name__}")

    if shape is not None:
        if shape[0] == 0 or shape[1] == 0:
            errors.append(f"Invalid zero-dimension image shape: {shape}")

    is_valid = len(errors) == 0

    return ImageValidationReport(
        is_valid=is_valid,
        filepath=filepath_str,
        file_format=file_fmt,
        original_shape=shape,
        channel_count=channels,
        errors=errors,
        warnings=warnings,
    )
