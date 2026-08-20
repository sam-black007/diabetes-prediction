import json
import os

PROCESSED_DIR = "data/processed"
PLOT_DIR = "plots"

errors = []
checks = 0

def check(name, condition, detail=""):
    global checks
    checks += 1
    if condition:
        print(f"PASS  {name}")
    else:
        errors.append(name)
        print(f"FAIL  {name} {detail}")

def main():
    # 1. Preprocessing artifacts
    check("train/test arrays exist", all(
        os.path.exists(os.path.join(PROCESSED_DIR, f)) for f in
        ["X_train.npy", "X_test.npy", "y_train.npy", "y_test.npy"]
    ))
    check("cleaned dataset exists", os.path.exists(os.path.join(PROCESSED_DIR, "diabetes_clean.csv")))

    X_train = __import__("numpy").load(os.path.join(PROCESSED_DIR, "X_train.npy"))
    X_test = __import__("numpy").load(os.path.join(PROCESSED_DIR, "X_test.npy"))
    check("train/test split sizes (614/154)", X_train.shape[0] == 614 and X_test.shape[0] == 154,
          f"got {X_train.shape[0]}/{X_test.shape[0]}")

    # 2. EDA artifacts
    check("all 5 main plots exist", all(
        os.path.exists(os.path.join(PLOT_DIR, f)) for f in [
            "1_outcome_distribution.png", "2_feature_histograms.png",
            "3_correlation_heatmap.png", "4_boxplots_by_outcome.png",
            "5_model_comparison.png",
        ]
    ))

    # 3. Training results
    check("results.json exists", os.path.exists(os.path.join(PROCESSED_DIR, "results.json")))
    with open(os.path.join(PROCESSED_DIR, "results.json")) as f:
        results = json.load(f)
    check("all 3 models present", set(results.keys()) == {
        "Logistic Regression", "SVM (tuned)", "Random Forest (tuned)"
    }, f"got {list(results.keys())}")

    rf = results["Random Forest (tuned)"]
    check("Random Forest accuracy >= 0.75", rf["accuracy"] >= 0.75, f"got {rf['accuracy']}")
    check("Random Forest F1 >= 0.60", rf["f1"] >= 0.60, f"got {rf['f1']}")

    best = max(results, key=lambda k: results[k]["f1"])
    check("best model is Random Forest", best == "Random Forest (tuned)", f"got {best}")

    # 4. Confusion matrix plots
    check("3 confusion matrix plots exist", all(
        os.path.exists(os.path.join(PLOT_DIR, f)) for f in [
            "cm_logistic_regression.png", "cm_svm_(tuned).png", "cm_random_forest_(tuned).png",
        ]
    ))

    print(f"\n{checks - len(errors)}/{checks} checks passed")
    if errors:
        print("FAILURES:", ", ".join(errors))
        raise SystemExit(1)
    print("ALL TESTS PASSED")

if __name__ == "__main__":
    main()