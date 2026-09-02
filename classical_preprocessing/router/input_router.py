"""
Input Router and Modality Dispatch Layer for Phase 1 Classical Preprocessing.

Determines the input category and processing pathway for clinical data
without performing expensive file parsing or data transformation.
"""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union

from classical_preprocessing.contracts import RawInputContract


class InputKind(str, Enum):
    TABULAR = "TABULAR"
    IMAGE_2D = "IMAGE_2D"
    DICOM = "DICOM"
    NIFTI = "NIFTI"


class ProcessingPath(str, Enum):
    TABULAR = "TABULAR"
    IMAGING_2D = "IMAGING_2D"
    IMAGING_3D = "IMAGING_3D"
    DEFERRED_IMAGING = "DEFERRED_IMAGING"


class UnsupportedFormatError(ValueError):
    """Raised when an unsupported file extension or format is supplied."""
    pass


@dataclass
class RoutingDecision:
    """
    Typed result of an input routing determination.
    """
    input_kind: InputKind
    processing_path: ProcessingPath
    source: str  # e.g., "filepath", "dataframe", "raw_input_contract"
    extension: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


SUPPORTED_EXTENSIONS: Dict[str, Tuple[InputKind, ProcessingPath]] = {
    ".csv": (InputKind.TABULAR, ProcessingPath.TABULAR),
    ".xlsx": (InputKind.TABULAR, ProcessingPath.TABULAR),
    ".xls": (InputKind.TABULAR, ProcessingPath.TABULAR),
    ".png": (InputKind.IMAGE_2D, ProcessingPath.IMAGING_2D),
    ".jpg": (InputKind.IMAGE_2D, ProcessingPath.IMAGING_2D),
    ".jpeg": (InputKind.IMAGE_2D, ProcessingPath.IMAGING_2D),
    ".dcm": (InputKind.DICOM, ProcessingPath.DEFERRED_IMAGING),
    ".nii": (InputKind.NIFTI, ProcessingPath.IMAGING_3D),
    ".nii.gz": (InputKind.NIFTI, ProcessingPath.IMAGING_3D),
}


def _extract_extension(path_str: str) -> str:
    """Extract lower-case extension handling compound extensions like .nii.gz."""
    lower_path = path_str.lower()
    if lower_path.endswith(".nii.gz"):
        return ".nii.gz"
    p = Path(path_str)
    return p.suffix.lower()


def route_input(
    input_data: Any,
    modality_hint: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    validate_path_exists: bool = False,
) -> RoutingDecision:
    """
    Classify and route clinical input data to its appropriate processing pathway.

    Parameters
    ----------
    input_data : Any
        Path string, pathlib.Path, pandas.DataFrame, or RawInputContract.
    modality_hint : Optional[str]
        Optional caller-supplied modality hint.
    metadata : Optional[Dict[str, Any]]
        Optional non-sensitive metadata dictionary.
    validate_path_exists : bool
        If True, checks that file paths exist on disk. Default False to allow path-based routing.

    Returns
    -------
    RoutingDecision
        Deterministic routing decision containing input_kind, processing_path, source, and extension.

    Raises
    ------
    ValueError / TypeError / UnsupportedFormatError / FileNotFoundError
        If input is invalid, missing, directory, or unsupported format.
    """
    meta = dict(metadata or {})
    if modality_hint:
        meta["modality_hint"] = modality_hint

    if input_data is None:
        raise ValueError("Input data cannot be None.")

    # 1. Check if RawInputContract
    if isinstance(input_data, RawInputContract):
        meta.update(input_data.metadata)
        if input_data.dataframe is not None:
            return RoutingDecision(
                input_kind=InputKind.TABULAR,
                processing_path=ProcessingPath.TABULAR,
                source="raw_input_contract_dataframe",
                metadata=meta,
            )
        if input_data.filepath:
            return route_input(
                input_data.filepath,
                modality_hint=input_data.modality or modality_hint,
                metadata=meta,
                validate_path_exists=validate_path_exists,
            )
        raise ValueError("RawInputContract must contain a valid filepath or dataframe.")

    # 2. Check if pandas.DataFrame (or DataFrame-like object)
    type_name = type(input_data).__name__
    module_name = type(input_data).__module__
    if type_name == "DataFrame" or "pandas" in module_name:
        return RoutingDecision(
            input_kind=InputKind.TABULAR,
            processing_path=ProcessingPath.TABULAR,
            source="dataframe",
            metadata=meta,
        )

    # 3. Check if Path or str
    if isinstance(input_data, (str, Path)):
        path_str = str(input_data).strip()
        if not path_str:
            raise ValueError("Input path string cannot be empty.")

        path_obj = Path(path_str)

        if validate_path_exists:
            if not path_obj.exists():
                raise FileNotFoundError(f"Clinical input file not found: {path_str}")
            if path_obj.is_dir():
                raise ValueError(f"Input path is a directory, not a file: {path_str}")

        ext = _extract_extension(path_str)

        if ext not in SUPPORTED_EXTENSIONS:
            supported_str = ", ".join(sorted(SUPPORTED_EXTENSIONS.keys()))
            raise UnsupportedFormatError(
                f"Unsupported clinical input format: '{ext}'. "
                f"Supported formats: {supported_str}"
            )

        kind, path = SUPPORTED_EXTENSIONS[ext]
        return RoutingDecision(
            input_kind=kind,
            processing_path=path,
            source="filepath",
            extension=ext,
            metadata=meta,
        )

    raise TypeError(f"Unsupported input object type: {type(input_data).__name__}")


class InputRouter:
    """
    Router class wrapper for clinical input classification and dispatch.
    """

    def __init__(self, validate_path_exists: bool = False):
        self.validate_path_exists = validate_path_exists

    def route(
        self,
        input_data: Any,
        modality_hint: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> RoutingDecision:
        """Route clinical input data to its appropriate processing pathway."""
        return route_input(
            input_data,
            modality_hint=modality_hint,
            metadata=metadata,
            validate_path_exists=self.validate_path_exists,
        )
