"""
3D Volumetric Medical Image Validator for Stage 7.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, List, Optional, Tuple, Union
import numpy as np

from classical_preprocessing.imaging_3d.loader import Volume3DData, load_3d_volume

SUPPORTED_3D_EXTENSIONS = {".nii", ".nii.gz", ".dcm"}


@dataclass
class VolumeValidationReport:
    """
    Validation report for 3D volumetric medical images.
    """
    is_valid: bool
    filepath: Optional[str] = None
    file_format: Optional[str] = None
    original_shape: Optional[Tuple[int, ...]] = None
    voxel_spacing: Optional[Tuple[float, ...]] = None
    modality: str = "UNKNOWN"
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


def validate_3d_volume(input_source: Any) -> VolumeValidationReport:
    """
    Validate a 3D medical volume file, array, or object.

    Parameters
    ----------
    input_source : Any
        Path to 3D image file, numpy array, or Volume3DData.

    Returns
    -------
    VolumeValidationReport
    """
    if input_source is None:
        return VolumeValidationReport(is_valid=False, errors=["Volume input source cannot be None."])

    errors = []
    warnings = []
    filepath_str = None
    file_fmt = None
    shape = None
    spacing = None
    modality = "UNKNOWN"

    # Handle file path validation
    if isinstance(input_source, (str, Path)):
        filepath_str = str(input_source)
        path = Path(filepath_str)

        if not path.exists():
            return VolumeValidationReport(
                is_valid=False,
                filepath=filepath_str,
                errors=[f"3D Medical image file does not exist: '{filepath_str}'"],
            )

        file_name = path.name.lower()
        if not any(file_name.endswith(ext) for ext in SUPPORTED_3D_EXTENSIONS):
            return VolumeValidationReport(
                is_valid=False,
                filepath=filepath_str,
                errors=[f"Unsupported 3D volume extension for file '{path_str}'. Supported: {sorted(list(SUPPORTED_3D_EXTENSIONS))}"],
            )

        try:
            vol_obj = load_3d_volume(input_source)
            shape = vol_obj.volume_data.shape
            spacing = vol_obj.voxel_spacing
            modality = vol_obj.inferred_modality
            file_fmt = "NIfTI" if ".nii" in file_name else "DICOM"
            vol_data = vol_obj.volume_data
        except Exception as e:
            return VolumeValidationReport(
                is_valid=False,
                filepath=filepath_str,
                errors=[f"Corrupt or unreadable 3D volume file: {str(e)}"],
            )

    elif isinstance(input_source, Volume3DData):
        filepath_str = input_source.filepath
        shape = input_source.volume_data.shape
        spacing = input_source.voxel_spacing
        modality = input_source.inferred_modality
        file_fmt = "Volume3DData"
        vol_data = input_source.volume_data

    elif isinstance(input_source, np.ndarray):
        file_fmt = "NUMPY"
        vol_data = input_source
        shape = input_source.shape
        spacing = (1.0, 1.0, 1.0)
    else:
        return VolumeValidationReport(
            is_valid=False,
            errors=[f"Unsupported 3D volume input object type: {type(input_source).__name__}"],
        )

    # 1. Dimensionality check: Must be 3D spatial matrix
    if vol_data.ndim != 3:
        errors.append(f"2D or {vol_data.ndim}-D input cannot be silently treated as 3D volume. Expected 3D (D, H, W), got shape {shape}")

    # 2. Zero-dimension check
    if shape is not None:
        if any(dim == 0 for dim in shape):
            errors.append(f"Invalid zero-dimension volume shape: {shape}")

    # 3. Finite value check
    if vol_data is not None and len(errors) == 0:
        if not np.isfinite(vol_data).all():
            errors.append("Volume array contains NaN or Inf values.")

    is_valid = len(errors) == 0

    return VolumeValidationReport(
        is_valid=is_valid,
        filepath=filepath_str,
        file_format=file_fmt,
        original_shape=shape,
        voxel_spacing=spacing,
        modality=modality,
        errors=errors,
        warnings=warnings,
    )
