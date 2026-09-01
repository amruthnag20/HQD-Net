import numpy as np
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, roc_auc_score
from dataset_loader import load_clinical_data

# Load identical dataset splits
X_train_t, X_test_t, y_train_t, y_test_t = load_clinical_data(n_samples=400, n_features=4)
X_train, X_test = X_train_t.numpy(), X_test_t.numpy()
y_train, y_test = y_train_t.numpy(), y_test_t.numpy()

# 1. Classical Baseline: Support Vector Classifier (RBF Kernel)
clf_svm = SVC(probability=True, random_state=42)
clf_svm.fit(X_train, y_train)
svm_preds = clf_svm.predict(X_test)
svm_acc = accuracy_score(y_test, svm_preds)
svm_auc = roc_auc_score(y_test, clf_svm.predict_proba(X_test)[:, 1])

# 2. Classical Baseline: Random Forest
clf_rf = RandomForestClassifier(n_estimators=50, random_state=42)
clf_rf.fit(X_train, y_train)
rf_preds = clf_rf.predict(X_test)
rf_acc = accuracy_score(y_test, rf_preds)
rf_auc = roc_auc_score(y_test, clf_rf.predict_proba(X_test)[:, 1])

print("--- Classical Baseline Benchmarks ---")
print(f"Standard SVM  | Accuracy: {svm_acc*100:.2f}% | ROC-AUC: {svm_auc:.4f}")
print(f"Random Forest | Accuracy: {rf_acc*100:.2f}% | ROC-AUC: {rf_auc:.4f}")
