import numpy as np
import os
import json
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

PROCESSED_DIR = "data/processed"
PLOT_DIR = "plots"
os.makedirs(PLOT_DIR, exist_ok=True)

def load_data():
    X_train = np.load(os.path.join(PROCESSED_DIR, "X_train.npy"))
    X_test = np.load(os.path.join(PROCESSED_DIR, "X_test.npy"))
    y_train = np.load(os.path.join(PROCESSED_DIR, "y_train.npy"))
    y_test = np.load(os.path.join(PROCESSED_DIR, "y_test.npy"))
    return X_train, X_test, y_train, y_test

def evaluate(name, model, X_test, y_test, results):
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds)
    rec = recall_score(y_test, preds)
    f1 = f1_score(y_test, preds)
    print(f"\n--- {name} ---")
    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1-Score : {f1:.4f}")
    print(classification_report(y_test, preds, target_names=["No Diabetes", "Diabetes"]))
    results[name] = {
        "accuracy": acc, "precision": prec, "recall": rec, "f1": f1,
    }
    return preds

def plot_confusion_matrix(name, y_test, preds):
    cm = confusion_matrix(y_test, preds)
    plt.figure(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["No Diabetes", "Diabetes"],
                yticklabels=["No Diabetes", "Diabetes"])
    plt.title(f"Confusion Matrix - {name}")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, f"cm_{name.replace(' ', '_').lower()}.png"))
    plt.close()

def tune(model, params, X_train, y_train):
    grid = GridSearchCV(model, params, cv=5, scoring="f1", n_jobs=-1, verbose=1)
    grid.fit(X_train, y_train)
    print("Best params:", grid.best_params_)
    return grid.best_estimator_

if __name__ == "__main__":
    X_train, X_test, y_train, y_test = load_data()
    results = {}

    print("=" * 50)
    print("Model 1: Logistic Regression (baseline, default)")
    lr = LogisticRegression(max_iter=2000, random_state=42)
    lr.fit(X_train, y_train)
    preds_lr = evaluate("Logistic Regression", lr, X_test, y_test, results)
    plot_confusion_matrix("Logistic Regression", y_test, preds_lr)

    print("=" * 50)
    print("Model 2: Support Vector Machine + hyperparameter tuning")
    svm = tune(SVC(random_state=42), {"C": [0.1, 1, 10, 100], "kernel": ["linear", "rbf"]}, X_train, y_train)
    preds_svm = evaluate("SVM (tuned)", svm, X_test, y_test, results)
    plot_confusion_matrix("SVM (tuned)", y_test, preds_svm)

    print("=" * 50)
    print("Model 3: Random Forest + hyperparameter tuning")
    rf = tune(RandomForestClassifier(random_state=42), {"n_estimators": [100, 200], "max_depth": [None, 5, 10]}, X_train, y_train)
    preds_rf = evaluate("Random Forest (tuned)", rf, X_test, y_test, results)
    plot_confusion_matrix("Random Forest (tuned)", y_test, preds_rf)

    print("=" * 50)
    best_name = max(results, key=lambda k: results[k]["f1"])
    print(f"\nBEST MODEL (by F1-score): {best_name} -> F1 = {results[best_name]['f1']:.4f}")

    with open(os.path.join(PROCESSED_DIR, "results.json"), "w") as f:
        json.dump(results, f, indent=2)
    print("Results saved to", os.path.join(PROCESSED_DIR, "results.json"))

    # Comparison bar chart
    names = list(results.keys())
    metrics = ["accuracy", "precision", "recall", "f1"]
    x = np.arange(len(names))
    width = 0.2
    plt.figure(figsize=(9, 5))
    colors = ["#4C72B0", "#55A868", "#C44E52", "#8172B2"]
    for i, metric in enumerate(metrics):
        values = [results[n][metric] for n in names]
        plt.bar(x + i * width, values, width, label=metric.title(), color=colors[i])
    plt.xticks(x + width * 1.5, names)
    plt.ylabel("Score")
    plt.ylim(0, 1)
    plt.title("Model Performance Comparison")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, "5_model_comparison.png"))
    plt.close()
    print("Comparison chart saved to", os.path.join(PLOT_DIR, "5_model_comparison.png"))