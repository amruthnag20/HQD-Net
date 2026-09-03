import joblib, pathlib, json, sys
base = pathlib.Path(r"c:/Users/jonna/OneDrive/Desktop/hqd-net/models/classical")
paths = {
    'hist_gb_cvd.pkl': base/'hist_gb_cvd.pkl',
    'logistic_cvd.pkl': base/'logistic_cvd.pkl',
    'random_forest_cvd.pkl': base/'random_forest'/'random_forest_cvd.pkl',
    'svm_cvd.pkl': base/'svm'/'svm_cvd.pkl',
}
results = {}
for name, p in paths.items():
    print('Loading', p)
    try:
        obj = joblib.load(p)
        info = {'type': type(obj).__name__}
        # Detect if sklearn Pipeline
        if hasattr(obj, 'named_steps'):
            info['pipeline_steps'] = list(obj.named_steps.keys())
        results[name] = info
        print('Loaded', info)
    except Exception as e:
        results[name] = {'error': str(e)}
        print('Error loading', e, file=sys.stderr)
# Write results to JSON for later reference
out_path = pathlib.Path(r"c:/Users/jonna/OneDrive/Desktop/hqd-net/models/classical/load_results.json")
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
print('Results written to', out_path)
