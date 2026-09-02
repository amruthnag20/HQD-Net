"""
3D Volumetric Medical Image Loader for Stage 7 (NIfTI & DICOM).
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union
import numpy as np


@dataclass
class Volume3DData:
    """
    Structured data container for 3D volumetric medical images.
    """
    volume_data: np.ndarray  # 3D spatial matrix of shape (D, H, W)
    voxel_spacing: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    orientation: str = "UNKNOWN"
    affine: np.ndarray = field(default_factory=lambda: np.eye(4, dtype=np.float64))
    inferred_modality: str = "UNKNOWN"
    filepath: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


def load_3d_volume(
    input_source: Union[str, Path, np.ndarray, Volume3DData],
) -> Volume3DData:
    """
    Load a 3D medical volume from NIfTI file, DICOM file/directory, numpy array, or Volume3DData.

    Parameters
    ----------
    input_source : Union[str, Path, np.ndarray, Volume3DData]
        Path to file, 3D numpy array, or Volume3DData object.

    Returns
    -------
    Volume3DData
        Structured volume object containing 3D array and spatial metadata.
    """
    if input_source is None:
        raise ValueError("Input volume source cannot be None.")

    if isinstance(input_source, Volume3DData):
        return input_source

    if isinstance(input_source, np.ndarray):
        arr = np.asarray(input_source, dtype=np.float32)
        if arr.ndim != 3:
            raise ValueError(f"Direct numpy input for 3D volume must be 3-D, got shape {arr.shape}")
        return Volume3DData(
            volume_data=arr,
            voxel_spacing=(1.0, 1.0, 1.0),
            orientation="UNKNOWN",
            affine=np.eye(4, dtype=np.float64),
            inferred_modality="UNKNOWN",
        )

    if isinstance(input_source, (str, Path)):
        path_str = str(input_source)
        path = Path(path_str)

        if not path.exists():
            raise FileNotFoundError(f"3D Medical image file does not exist: '{path_str}'")

        ext = path.name.lower()

        # Handle NIfTI (.nii, .nii.gz)
        if ".nii" in ext:
            try:
                import nibabel as nib
                nii_img = nib.load(path_str)
                data = nii_img.get_fdata(dtype=np.float32)

                # Squeeze extra 4th dimension if time/channel is 1
                if data.ndim == 4 and data.shape[3] == 1:
                    data = data.squeeze(axis=3)

                if data.ndim != 3:
                    raise ValueError(f"Expected 3D NIfTI volume, got shape {data.shape}")

                # Orient to (D, H, W)
                header = nii_img.header
                zooms = header.get_zooms()[:3]
                spacing = (float(zooms[2]), float(zooms[1]), float(zooms[0])) if len(zooms) >= 3 else (1.0, 1.0, 1.0)
                affine = np.asarray(nii_img.affine, dtype=np.float64)

                return Volume3DData(
                    volume_data=data,
                    voxel_spacing=spacing,
                    orientation="RAS",
                    affine=affine,
                    inferred_modality="MRI",
                    filepath=path_str,
                )
            except Exception as e:
                raise ValueError(f"Failed to load NIfTI volume '{path_str}': {str(e)}")

        # Handle DICOM (.dcm)
        elif ext.endswith(".dcm"):
            try:
                import pydicom
                ds = pydicom.dcmread(path_str)
                pixel_arr = ds.pixel_array.astype(np.float32)

                if pixel_arr.ndim == 2:
                    # Single 2D DICOM slice expanded to pseudo 3D volume (1, H, W)
                    pixel_arr = np.expand_dims(pixel_arr, axis=0)
                elif pixel_arr.ndim != 3:
                    raise ValueError(f"Expected 3D DICOM volume, got shape {pixel_arr.shape}")

                modality = str(getattr(ds, "Modality", "UNKNOWN")).upper()
                pixel_spacing = getattr(ds, "PixelSpacing", [1.0, 1.0])
                slice_thickness = getattr(ds, "SliceThickness", 1.0)
                spacing = (float(slice_thickness), float(pixel_spacing[0]), float(pixel_spacing[1]))

                return Volume3DData(
                    volume_data=pixel_arr,
                    voxel_spacing=spacing,
                    orientation="LPS",
                    affine=np.eye(4, dtype=np.float64),
                    inferred_modality=modality,
                    filepath=path_str,
                )
            except Exception as e:
                raise ValueError(f"Failed to load DICOM volume '{path_str}': {str(e)}")

        else:
            raise ValueError(f"Unsupported 3D medical image format for file '{path_str}'")

    raise TypeError(f"Unsupported 3D volume input type: {type(input_source).__name__}")
