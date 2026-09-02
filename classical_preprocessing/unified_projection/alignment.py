"""
Multimodal Sample Alignment and Presence Masking for Stage 8.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np


@dataclass
class AlignedMultimodalBatch:
    """
    Aligned multimodal feature container with explicit modality presence mask.
    """
    sample_ids: List[str]
    tabular: Optional[np.ndarray] = None  # (N, D_tab), float64
    image_2d: Optional[np.ndarray] = None  # (N, D_2d), float64
    image_3d: Optional[np.ndarray] = None  # (N, D_3d), float64
    presence_mask: np.ndarray = field(default_factory=lambda: np.zeros((0, 3), dtype=bool))
    metadata: Dict[str, Any] = field(default_factory=dict)


def _extract_matrix_and_ids(
    data_item: Any,
    default_prefix: str,
) -> Tuple[Optional[np.ndarray], Optional[List[str]]]:
    """
    Helper function to extract numeric matrix and sample IDs from stage representations or tuples.
    """
    if data_item is None:
        return None, None

    if hasattr(data_item, "embeddings") and hasattr(data_item, "sample_ids"):
        return np.asarray(data_item.embeddings, dtype=np.float64), list(data_item.sample_ids)

    if hasattr(data_item, "compressed_matrix") and hasattr(data_item, "sample_ids"):
        return np.asarray(data_item.compressed_matrix, dtype=np.float64), list(data_item.sample_ids)

    if isinstance(data_item, tuple) and len(data_item) == 2:
        matrix, ids = data_item
        return np.asarray(matrix, dtype=np.float64), list(ids)

    if isinstance(data_item, np.ndarray):
        arr = np.asarray(data_item, dtype=np.float64)
        ids = [f"{default_prefix}_{i:04d}" for i in range(len(arr))]
        return arr, ids

    raise TypeError(f"Unsupported data item type for multimodal alignment: {type(data_item).__name__}")


def align_multimodal_inputs(
    tabular: Any = None,
    image_2d: Any = None,
    image_3d: Any = None,
    sample_ids: Optional[List[str]] = None,
) -> AlignedMultimodalBatch:
    """
    Align tabular, 2D imaging, and 3D volumetric inputs into a unified sample order with presence masking.

    Parameters
    ----------
    tabular : Any
        Tabular dataset or stage output.
    image_2d : Any
        2D imaging dataset or ImageRepresentation.
    image_3d : Any
        3D volumetric dataset or VolumeRepresentation.
    sample_ids : Optional[List[str]]
        Explicit ordered list of sample IDs.

    Returns
    -------
    AlignedMultimodalBatch
    """
    tab_arr, tab_ids = _extract_matrix_and_ids(tabular, "tab")
    img2d_arr, img2d_ids = _extract_matrix_and_ids(image_2d, "img2d")
    img3d_arr, img3d_ids = _extract_matrix_and_ids(image_3d, "img3d")

    # Verify duplicate IDs within each individual modality
    for m_name, ids in [("tabular", tab_ids), ("2D image", img2d_ids), ("3D volume", img3d_ids)]:
        if ids is not None:
            if len(ids) != len(set(ids)):
                raise ValueError(f"Duplicate sample IDs detected within {m_name} input.")

    # Determine master sample ordering
    if sample_ids is not None:
        master_ids = list(sample_ids)
    else:
        # Union of sample IDs preserving order of discovery
        master_ids = []
        for id_list in [tab_ids, img2d_ids, img3d_ids]:
            if id_list:
                for sid in id_list:
                    if sid not in master_ids:
                        master_ids.append(sid)

    if not master_ids:
        raise ValueError("At least one modality with non-empty samples must be provided.")

    n_samples = len(master_ids)

    # Dimensionality inference
    d_tab = tab_arr.shape[1] if tab_arr is not None else 0
    d_2d = img2d_arr.shape[1] if img2d_arr is not None else 0
    d_3d = img3d_arr.shape[1] if img3d_arr is not None else 0

    aligned_tab = np.zeros((n_samples, d_tab), dtype=np.float64) if d_tab > 0 else None
    aligned_2d = np.zeros((n_samples, d_2d), dtype=np.float64) if d_2d > 0 else None
    aligned_3d = np.zeros((n_samples, d_3d), dtype=np.float64) if d_3d > 0 else None
    presence_mask = np.zeros((n_samples, 3), dtype=bool)  # [has_tab, has_2d, has_3d]

    # Map sample IDs to indices
    tab_map = {sid: i for i, sid in enumerate(tab_ids)} if tab_ids else {}
    img2d_map = {sid: i for i, sid in enumerate(img2d_ids)} if img2d_ids else {}
    img3d_map = {sid: i for i, sid in enumerate(img3d_ids)} if img3d_ids else {}

    for idx, sid in enumerate(master_ids):
        if sid in tab_map and tab_arr is not None:
            aligned_tab[idx] = tab_arr[tab_map[sid]]
            presence_mask[idx, 0] = True

        if sid in img2d_map and img2d_arr is not None:
            aligned_2d[idx] = img2d_arr[img2d_map[sid]]
            presence_mask[idx, 1] = True

        if sid in img3d_map and img3d_arr is not None:
            aligned_3d[idx] = img3d_arr[img3d_map[sid]]
            presence_mask[idx, 2] = True

    metadata = {
        "total_aligned_samples": n_samples,
        "d_tabular": d_tab,
        "d_image_2d": d_2d,
        "d_image_3d": d_3d,
        "presence_counts": {
            "tabular": int(presence_mask[:, 0].sum()),
            "image_2d": int(presence_mask[:, 1].sum()),
            "image_3d": int(presence_mask[:, 2].sum()),
        },
    }

    return AlignedMultimodalBatch(
        sample_ids=master_ids,
        tabular=aligned_tab,
        image_2d=aligned_2d,
        image_3d=aligned_3d,
        presence_mask=presence_mask,
        metadata=metadata,
    )
