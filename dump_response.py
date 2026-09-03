"""Dump the complete backend response JSON to inspect all available fields."""
import sys, json
sys.path.insert(0, '.')
from classical_preprocessing.clinical_intelligence.orchestrator import run_clinical_analysis

sample = [55.0, 2, 175.0, 80.0, 26.1, 140.0, 90.0, 2.0, 1.0, 0.0, 0.0, 1.0]

res = run_clinical_analysis(
    raw_features=sample,
    tabular_file_path='clinical_data_synthetic.csv',
    backend_choice='VQC',
)

with open('backend_response_dump.json', 'w') as f:
    json.dump(res, f, indent=2, default=str)

print("Dumped to backend_response_dump.json")
print("Top-level keys:", list(res.keys()))
