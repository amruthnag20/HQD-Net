import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from frontend.app import query_classical_controller

raw_inputs = [
    45.0, 120.0, 80.0, 95.0, 24.5, 72.0, 
    100.0, 50.0, 150.0, 5.4, 0.9, 15.0, 
    0.01, 1.0, 140.0, 4.2, 7.5, 4.8, 
    250.0, 14.2, 0.15, 0.45, 0.0, 0.0
]

payload = query_classical_controller(
    raw_features=raw_inputs,
    backend_choice="VQC",
    tabular_file_path=None,
    image_2d_path=None,
    image_3d_path=None,
)

print(f"Status: {payload.get('status')}")
if payload.get("status") == "error":
    print(f"Error Message: {payload.get('error_message')}")
else:
    print(f"Risk Score: {payload['diagnostic_prediction']['disease_risk_score']}")
    print(f"Verdict: {payload['diagnostic_prediction']['verdict']}")
    print("Explainability Breakdown:")
    for item in payload['explainability_breakdown'][:3]:
        print(f"  - {item['biomarker']}: {item['attribution_weight']:.4f}")
    print("End-to-End Execution Passed!")
