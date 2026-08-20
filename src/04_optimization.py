import numpy as np
import os
import json
import joblib
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import (
    RandomForestClassifier, GradientBoostingClassifier, StackingClassifier,
)
from sklearn.model_selection import GridSearchCV, cross_val_predict
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve,
)
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

PROCESSED_DIR = "data/processed"
PLOT_DIR = "plots"
os.makedirs(PLOT_DIR, exist_ok=True)

FEATURE_LABELS = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age",
]

def load_data():
    X_train = np.load(os.path.join(PROCESSED_DIR, "X_train.npy"))
    X_test = np.load(os.path.join(PROCESSED_DIR, "X_test.npy"))
    y_train = np.load(os.path.join(PROCESSED_DIR, "y_train.npy"))
    y_test = np.load(os.path.join(PROCESSED_DIR, "y_test.npy"))
    return X_train, X_test, y_train, y_test

def report(name, model, X_test, y_test, threshold=0.5, results=None, proba_model=None):
    if proba_model is None:
        proba_model = model
    proba = proba_model.predict_proba(X_test)[:, 1]
    preds = (proba >= threshold).astype(int)
    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds)
    rec = recall_score(y_test, preds)
    f1 = f1_score(y_test, preds)
    auc = roc_auc_score(y_test, proba)
    print(f"  Accuracy={acc:.4f} | Precision={prec:.4f} | Recall={rec:.4f} | F1={f1:.4f} | AUC={auc:.4f}")
    if results is not None:
        results[name] = {
            "accuracy": acc, "precision": prec, "recall": rec, "f1": f1, "auc": auc,
            "threshold": threshold,
        }
    return preds

def find_best_threshold(proba, y_true, metric=f1_score):
    best_t, best_m = 0.5, -1
    for t in np.arange(0.30, 0.71, 0.01):
        score = metric(y_true, (proba >= t).astype(int))
        if score > best_m:
            best_m, best_t = score, t
    return best_t, best_m

def main():
    X_train, X_test, y_train, y_test = load_data()
    results = {}
    print("=" * 60)
    print("STEP 1 - Baseline (original models, no optimization)")
    print("=" * 60)

    base_lr = LogisticRegression(max_iter=2000, random_state=42).fit(X_train, y_train)
    base_svm = SVC(C=1, kernel="rbf", probability=True, random_state=42).fit(X_train, y_train)
    base_rf = RandomForestClassifier(n_estimators=100, random_state=42).fit(X_train, y_train)

    report("Logistic Regression (baseline)", base_lr, X_test, y_test, results=results)
    report("SVM (baseline)", base_svm, X_test, y_test, results=results)
    report("Random Forest (baseline)", base_rf, X_test, y_test, results=results)

    print("=" * 60)
    print("STEP 2 - Handle class imbalance (class_weight='balanced')")
    print("=" * 60)

    bal_lr = LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42).fit(X_train, y_train)
    bal_svm = SVC(C=1, kernel="rbf", class_weight="balanced", probability=True, random_state=42).fit(X_train, y_train)
    bal_rf = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42).fit(X_train, y_train)
    gb = GradientBoostingClassifier(random_state=42).fit(X_train, y_train)

    report("Logistic Regression (balanced)", bal_lr, X_test, y_test, results=results)
    report("SVM (balanced)", bal_svm, X_test, y_test, results=results)
    report("Random Forest (balanced)", bal_rf, X_test, y_test, results=results)
    report("Gradient Boosting", gb, X_test, y_test, results=results)

    print("=" * 60)
    print("STEP 3 - Wider hyperparameter tuning (best 2 candidates)")
    print("=" * 60)

    tuned_rf = GridSearchCV(
        RandomForestClassifier(class_weight="balanced", random_state=42),
        {"n_estimators": [200, 400], "max_depth": [None, 10], "min_samples_split": [2, 5]},
        cv=5, scoring="roc_auc", n_jobs=-1, verbose=0,
    ).fit(X_train, y_train)
    print(f"  Random Forest best params: {tuned_rf.best_params_}")
    report("Random Forest (tuned+balanced)", tuned_rf.best_estimator_, X_test, y_test, results=results)

    tuned_gb = GridSearchCV(
        GradientBoostingClassifier(random_state=42),
        {"n_estimators": [100, 200], "learning_rate": [0.05, 0.1], "max_depth": [3, 5]},
        cv=5, scoring="roc_auc", n_jobs=-1, verbose=0,
    ).fit(X_train, y_train)
    print(f"  Gradient Boosting best params: {tuned_gb.best_params_}")
    report("Gradient Boosting (tuned)", tuned_gb.best_estimator_, X_test, y_test, results=results)

    print("=" * 60)
    print("STEP 3.5 - Stronger models: XGBoost, SMOTE, Stacking")
    print("=" * 60)

    xgb_plain = xgb.XGBClassifier(
        eval_metric="logloss", n_estimators=200, max_depth=3,
        learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum(),
        random_state=42, n_jobs=-1,
    ).fit(X_train, y_train)
    report("XGBoost (class-weighted)", xgb_plain, X_test, y_test, results=results)

    xgb_smote = ImbPipeline([
        ("smote", SMOTE(random_state=42)),
        ("clf", xgb.XGBClassifier(
            eval_metric="logloss", n_estimators=200, max_depth=3,
            learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
            random_state=42, n_jobs=-1,
        )),
    ]).fit(X_train, y_train)
    report("XGBoost + SMOTE", xgb_smote, X_test, y_test, results=results, proba_model=xgb_smote)

    stack = StackingClassifier(
        estimators=[
            ("lr", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
            ("svm", SVC(C=1, kernel="rbf", class_weight="balanced", probability=True, random_state=42)),
            ("rf", RandomForestClassifier(n_estimators=200, max_depth=10, class_weight="balanced", random_state=42)),
            ("gb", GradientBoostingClassifier(n_estimators=100, learning_rate=0.05, max_depth=3, random_state=42)),
        ],
        final_estimator=LogisticRegression(max_iter=2000, random_state=42),
        cv=5, n_jobs=-1,
    ).fit(X_train, y_train)
    report("Stacking ensemble (4 models)", stack, X_test, y_test, results=results)

    print("=" * 60)
    print("STEP 4 - Decision-threshold tuning (to boost F1/Recall)")
    print("=" * 60)

    best_candidates = {
        "Random Forest (tuned+balanced)": tuned_rf.best_estimator_,
        "Gradient Boosting (tuned)": tuned_gb.best_estimator_,
        "XGBoost (class-weighted)": xgb_plain,
        "XGBoost + SMOTE": xgb_smote,
        "Stacking ensemble (4 models)": stack,
    }
    improved = {}
    for name, model in best_candidates.items():
        train_proba = cross_val_predict(model, X_train, y_train, cv=5, method="predict_proba")[:, 1]
        best_t, _ = find_best_threshold(train_proba, y_train)
        report(name, model, X_test, y_test,
               threshold=best_t, results=improved, proba_model=model)
        improved[name]["threshold"] = float(best_t)
        print(f"  -> best threshold for {name}: {best_t:.2f}")

    best_name = max(improved, key=lambda k: improved[k]["f1"])
    best_model = best_candidates[best_name]
    best_threshold = improved[best_name]["threshold"]

    print("=" * 60)
    print(f"BEST OPTIMIZED MODEL: {best_name}")
    print(f"Threshold: {best_threshold:.2f} | F1: {improved[best_name]['f1']:.4f} | "
          f"Accuracy: {improved[best_name]['accuracy']:.4f} | AUC: {improved[best_name]['auc']:.4f}")
    print("=" * 60)

    joblib.dump(best_model, os.path.join(PROCESSED_DIR, "best_model.joblib"))
    with open(os.path.join(PROCESSED_DIR, "model_threshold.json"), "w") as f:
        json.dump({"threshold": float(best_threshold)}, f)
    with open(os.path.join(PROCESSED_DIR, "results_optimized.json"), "w") as f:
        json.dump(results, f, indent=2)

    print("Saved optimized model + threshold to", PROCESSED_DIR)

    # ROC curves for the top models
    plt.figure(figsize=(7, 6))
    for name, model in best_candidates.items():
        proba = model.predict_proba(X_test)[:, 1]
        fpr, tpr, _ = roc_curve(y_test, proba)
        plt.plot(fpr, tpr, label=f"{name} (AUC={roc_auc_score(y_test, proba):.3f})")
    plt.plot([0, 1], [0, 1], "k--", label="Random guess")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curves - Optimized Models")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, "6_roc_curves.png"))
    plt.close()
    print("ROC curves saved to", os.path.join(PLOT_DIR, "6_roc_curves.png"))

    # Feature importance of the best model
    plt.figure(figsize=(8, 5))
    importances = best_model.feature_importances_
    order = np.argsort(importances)
    plt.barh(np.array(FEATURE_LABELS)[order], importances[order])
    plt.xlabel("Importance")
    plt.title("Feature Importance - Best Model")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, "7_feature_importance.png"))
    plt.close()
    print("Feature importance saved to", os.path.join(PLOT_DIR, "7_feature_importance.png"))

if __name__ == "__main__":
    main()