"""
Unit tests for Phase 1 Input Router and Modality Dispatch Layer.
"""

import unittest
from pathlib import Path
import pandas as pd

from classical_preprocessing.contracts import RawInputContract
from classical_preprocessing.router.input_router import (
    InputKind,
    InputRouter,
    ProcessingPath,
    RoutingDecision,
    UnsupportedFormatError,
    route_input,
)


class TestInputRouter(unittest.TestCase):

    # -------------------------------------------------------------
    # 1. Tabular Routing Tests
    # -------------------------------------------------------------
    def test_route_csv_path(self):
        decision = route_input("clinical_data.csv")
        self.assertEqual(decision.input_kind, InputKind.TABULAR)
        self.assertEqual(decision.processing_path, ProcessingPath.TABULAR)
        self.assertEqual(decision.extension, ".csv")
        self.assertEqual(decision.source, "filepath")

    def test_route_xlsx_path(self):
        decision = route_input("lab_results.xlsx")
        self.assertEqual(decision.input_kind, InputKind.TABULAR)
        self.assertEqual(decision.processing_path, ProcessingPath.TABULAR)
        self.assertEqual(decision.extension, ".xlsx")

    def test_route_xls_path(self):
        decision = route_input("legacy_data.xls")
        self.assertEqual(decision.input_kind, InputKind.TABULAR)
        self.assertEqual(decision.processing_path, ProcessingPath.TABULAR)
        self.assertEqual(decision.extension, ".xls")

    def test_route_pandas_dataframe(self):
        df = pd.DataFrame({"age": [45, 60], "cholesterol": [210, 195]})
        decision = route_input(df)
        self.assertEqual(decision.input_kind, InputKind.TABULAR)
        self.assertEqual(decision.processing_path, ProcessingPath.TABULAR)
        self.assertEqual(decision.source, "dataframe")

    def test_route_raw_input_contract_dataframe(self):
        df = pd.DataFrame({"feature1": [1.0, 2.0]})
        contract = RawInputContract(
            input_source="in_memory",
            input_type="tabular",
            modality="clinical_tabular",
            dataframe=df,
            patient_metadata={"patient_id": "P-99999"},
        )
        decision = route_input(contract)
        self.assertEqual(decision.input_kind, InputKind.TABULAR)
        self.assertEqual(decision.processing_path, ProcessingPath.TABULAR)

    # -------------------------------------------------------------
    # 2. 2D Image Routing Tests
    # -------------------------------------------------------------
    def test_route_png(self):
        decision = route_input("chest_xray.png")
        self.assertEqual(decision.input_kind, InputKind.IMAGE_2D)
        self.assertEqual(decision.processing_path, ProcessingPath.IMAGING_2D)
        self.assertEqual(decision.extension, ".png")

    def test_route_jpg(self):
        decision = route_input("dermatology_scan.jpg")
        self.assertEqual(decision.input_kind, InputKind.IMAGE_2D)
        self.assertEqual(decision.processing_path, ProcessingPath.IMAGING_2D)
        self.assertEqual(decision.extension, ".jpg")

    def test_route_jpeg(self):
        decision = route_input("retinal_image.jpeg")
        self.assertEqual(decision.input_kind, InputKind.IMAGE_2D)
        self.assertEqual(decision.processing_path, ProcessingPath.IMAGING_2D)
        self.assertEqual(decision.extension, ".jpeg")

    # -------------------------------------------------------------
    # 3. DICOM Routing Tests
    # -------------------------------------------------------------
    def test_route_dicom(self):
        decision = route_input("ct_slice_001.dcm")
        self.assertEqual(decision.input_kind, InputKind.DICOM)
        self.assertEqual(decision.processing_path, ProcessingPath.DEFERRED_IMAGING)
        self.assertEqual(decision.extension, ".dcm")

    # -------------------------------------------------------------
    # 4. NIfTI Routing Tests
    # -------------------------------------------------------------
    def test_route_nifti_nii(self):
        decision = route_input("brain_mri.nii")
        self.assertEqual(decision.input_kind, InputKind.NIFTI)
        self.assertEqual(decision.processing_path, ProcessingPath.IMAGING_3D)
        self.assertEqual(decision.extension, ".nii")

    def test_route_nifti_nii_gz(self):
        decision = route_input("structural_scan.nii.gz")
        self.assertEqual(decision.input_kind, InputKind.NIFTI)
        self.assertEqual(decision.processing_path, ProcessingPath.IMAGING_3D)
        self.assertEqual(decision.extension, ".nii.gz")

    # -------------------------------------------------------------
    # 5. Case-Insensitivity Tests
    # -------------------------------------------------------------
    def test_case_insensitive_extensions(self):
        cases = [
            ("DATA.CSV", InputKind.TABULAR, ".csv"),
            ("LAB.XLSX", InputKind.TABULAR, ".xlsx"),
            ("IMAGE.PNG", InputKind.IMAGE_2D, ".png"),
            ("SCAN.JPEG", InputKind.IMAGE_2D, ".jpeg"),
            ("TRACE.DCM", InputKind.DICOM, ".dcm"),
            ("BRAIN.NII", InputKind.NIFTI, ".nii"),
            ("VOLUME.NII.GZ", InputKind.NIFTI, ".nii.gz"),
        ]
        for path_str, expected_kind, expected_ext in cases:
            decision = route_input(path_str)
            self.assertEqual(decision.input_kind, expected_kind, f"Failed for {path_str}")
            self.assertEqual(decision.extension, expected_ext, f"Failed ext for {path_str}")

    # -------------------------------------------------------------
    # 6. Unsupported Format & Invalid Input Tests
    # -------------------------------------------------------------
    def test_unsupported_formats(self):
        unsupported = [
            "notes.pdf",
            "log.txt",
            "report.docx",
            "data.json",
            "program.exe",
            "archive.zip",
        ]
        for bad_path in unsupported:
            with self.assertRaises(UnsupportedFormatError) as ctx:
                route_input(bad_path)
            self.assertIn("Unsupported clinical input format", str(ctx.exception))
            self.assertIn("Supported formats:", str(ctx.exception))

    def test_invalid_none_input(self):
        with self.assertRaises(ValueError) as ctx:
            route_input(None)
        self.assertIn("cannot be None", str(ctx.exception))

    def test_invalid_empty_string(self):
        with self.assertRaises(ValueError) as ctx:
            route_input("   ")
        self.assertIn("cannot be empty", str(ctx.exception))

    def test_invalid_type(self):
        with self.assertRaises(TypeError):
            route_input(12345)

        with self.assertRaises(TypeError):
            route_input(["list", "of", "paths"])

    # -------------------------------------------------------------
    # 7. Path Validation Flag Tests
    # -------------------------------------------------------------
    def test_validate_path_exists_nonexistent(self):
        with self.assertRaises(FileNotFoundError):
            route_input("nonexistent_file_xyz_123.csv", validate_path_exists=True)

    def test_validate_path_exists_directory(self):
        dir_path = str(Path(__file__).parent)
        with self.assertRaises(ValueError) as ctx:
            route_input(dir_path, validate_path_exists=True)
        self.assertIn("directory", str(ctx.exception))

    # -------------------------------------------------------------
    # 8. Content-Independent Routing & Router Class
    # -------------------------------------------------------------
    def test_content_independent_classification(self):
        # Router must not attempt clinical diagnosis from filenames
        path_str = "malignant_tumor_stage4.csv"
        decision = route_input(path_str)
        self.assertEqual(decision.input_kind, InputKind.TABULAR)
        self.assertEqual(decision.processing_path, ProcessingPath.TABULAR)

    def test_input_router_class(self):
        router = InputRouter(validate_path_exists=False)
        decision = router.route("sample_xray.png")
        self.assertEqual(decision.input_kind, InputKind.IMAGE_2D)
        self.assertEqual(decision.processing_path, ProcessingPath.IMAGING_2D)


if __name__ == "__main__":
    unittest.main()
