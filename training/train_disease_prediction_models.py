import os
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

def train_disease_prediction_pipeline():
    print("=== Starting Disease Prediction Benchmark Pipeline ===")
    raw_path = 'data/raw/disease_prediction/Training.csv'
    if not os.path.exists(raw_path):
        raise FileNotFoundError(f"Raw data file not found at {raw_path}")

    df = pd.read_csv(raw_path)
    # Drop un-named trailing columns if present
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

    # Features and target
    X = df.drop(columns=['prognosis'])
    y = df['prognosis']

    feature_names = X.columns.tolist()
    target_names = sorted(y.unique().tolist())
    target_to_idx = {name: i for i, name in enumerate(target_names)}
    y_encoded = y.map(target_to_idx).values

    print(f"Loaded dataset shape: {df.shape} ({len(feature_names)} features, {len(target_names)} target disease classes).")

    # Stratified Train (70%), Val (15%), Test (15%) splits
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y_encoded, test_size=0.30, random_state=42, stratify=y_encoded
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    os.makedirs('data/splits', exist_ok=True)
    pd.DataFrame(np.column_stack([X_train, y_train]), columns=feature_names + ['prognosis_idx']).to_csv('data/splits/disease_prediction_train.csv', index=False)
    pd.DataFrame(np.column_stack([X_val, y_val]), columns=feature_names + ['prognosis_idx']).to_csv('data/splits/disease_prediction_val.csv', index=False)
    pd.DataFrame(np.column_stack([X_test, y_test]), columns=feature_names + ['prognosis_idx']).to_csv('data/splits/disease_prediction_test.csv', index=False)
    print(f"Splits saved: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")

    output_dir = 'models/classical/disease_prediction'
    os.makedirs(output_dir, exist_ok=True)

    models = {
        'logistic': LogisticRegression(max_iter=1000, random_state=42),
        'random_forest': RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42),
        'hist_gb': HistGradientBoostingClassifier(max_iter=100, random_state=42),
        'svm': SVC(kernel='rbf', probability=True, random_state=42)
    }

    metrics_summary = {}
    print("Training classical baseline models sequentially...")

    for name, model in models.items():
        print(f"Fitting {name}...")
        model.fit(X_train, y_train)

        # Save model pickle
        model_path = os.path.join(output_dir, f'{name}.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)

        # Evaluate on test set
        preds = model.predict(X_test)
        acc = accuracy_score(y_test, preds)
        p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(y_test, preds, average='macro', zero_division=0)
        _, _, f1_weighted, _ = precision_recall_fscore_support(y_test, preds, average='weighted', zero_division=0)
        cm = confusion_matrix(y_test, preds).tolist()

        metrics_summary[name] = {
            'accuracy': float(acc),
            'macro_precision': float(p_macro),
            'macro_recall': float(r_macro),
            'macro_f1': float(f1_macro),
            'weighted_f1': float(f1_weighted),
            'confusion_matrix': cm
        }
        print(f"  {name} -> Test Accuracy: {acc:.4f} | Macro F1: {f1_macro:.4f} | Weighted F1: {f1_weighted:.4f}")

    # Save preprocessing & metadata
    preprocessing_data = {
        'feature_names': feature_names,
        'target_names': target_names,
        'target_to_idx': target_to_idx,
        'num_features': len(feature_names),
        'num_classes': len(target_names)
    }
    with open(os.path.join(output_dir, 'preprocessing.pkl'), 'wb') as f:
        pickle.dump(preprocessing_data, f)

    with open(os.path.join(output_dir, 'metrics.json'), 'w') as f:
        json.dump(metrics_summary, f, indent=2)

    manifest = {
        'status': 'REAL_TRAINED',
        'dataset_source': 'kaushil268/disease-prediction-using-machine-learning',
        'task': 'secondary_41_disease_symptom_classification',
        'models_trained': list(models.keys()),
        'artifacts': [f'{m}.pkl' for m in models.keys()] + ['preprocessing.pkl', 'metrics.json']
    }
    with open(os.path.join(output_dir, 'training_manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)

    with open(os.path.join(output_dir, 'README.md'), 'w') as f:
        f.write("# Disease Prediction Secondary Benchmark Models\n\nContains classical baseline classifiers evaluated on the 41-disease symptom dataset.\n")

    print(f"Disease prediction benchmark artifacts saved to {output_dir}/")
    return metrics_summary

if __name__ == '__main__':
    train_disease_prediction_pipeline()
