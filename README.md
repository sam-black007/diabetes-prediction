# Diabetes Prediction using Machine Learning

[![Test](https://github.com/sam-black007/diabetes-prediction/actions/workflows/test.yml/badge.svg)](https://github.com/sam-black007/diabetes-prediction/actions)

Predict whether a patient has diabetes based on medical records, using the **PIMA Indian Diabetes Dataset** (768 patients, 8 features).

## Tools
Python, Pandas, NumPy, Scikit-Learn (SVM, Logistic Regression, Random Forest), Matplotlib, Seaborn, Streamlit

## How to run (your laptop, no hosting needed)

**1. Download the project** (or run this in cmd):
```bash
git clone https://github.com/sam-black007/diabetes-prediction
cd diabetes-prediction
```

**2. Install dependencies** (one time):
```bash
pip install -r requirements.txt
```

**3. Train the models** (optional — a trained model is already included):
```bash
python src/01_preprocessing.py   # clean + normalize + split
python src/02_eda.py             # visualizations
python src/03_model_training.py  # train + tune + evaluate
```

**4. Start the web app:**
```bash
streamlit run app.py
```
Your browser opens **http://localhost:8501**. To stop it, press `Ctrl + C` in the cmd window.

The app has three tabs: **single patient** (sliders → live prediction with risk %), **batch from CSV** (upload a file like `data/sample_patients.csv`), and **results & charts**.

> **Anyone else can do the same:** clone the repo, `pip install -r requirements.txt`, then `streamlit run app.py` — no account, no hosting, no internet needed after download.

## Pipeline
1. **Preprocessing** — impossible zero values in Glucose, BloodPressure, SkinThickness, Insulin, BMI are replaced with the column median; features are standardized (mean 0, std 1); data is split 80/20 (stratified).
2. **EDA** — outcome distribution, feature histograms by class, correlation heatmap, boxplots.
3. **Modeling** — Logistic Regression (baseline), SVM, and Random Forest, with hyperparameter tuning via `GridSearchCV` (5-fold, scored on F1).
4. **Evaluation** — accuracy, precision, recall, F1-score, confusion matrices on the held-out test set.

## Results (test set, 154 patients)

| Model                 | Accuracy | Precision | Recall | F1-Score |
|-----------------------|----------|-----------|--------|----------|
| Logistic Regression   | 0.708    | 0.600     | 0.500  | 0.546    |
| SVM (tuned, RBF, C=1) | 0.740    | 0.652     | 0.556  | 0.600    |
| **Random Forest (tuned)** | **0.779** | **0.717** | **0.611** | **0.660** |

**Best model:** Random Forest (100 trees, no depth limit) — best accuracy and best F1-score.

## Results gallery

**Model comparison**

![Model comparison](https://raw.githubusercontent.com/sam-black007/diabetes-prediction/main/plots/5_model_comparison.png)

**Best model — Random Forest confusion matrix**

![Random Forest confusion matrix](https://raw.githubusercontent.com/sam-black007/diabetes-prediction/main/plots/cm_random_forest_%28tuned%29.png)

**Feature correlation heatmap**

![Correlation heatmap](https://raw.githubusercontent.com/sam-black007/diabetes-prediction/main/plots/3_correlation_heatmap.png)

## Automated testing (CI)

Every push to `main` runs the whole pipeline on GitHub's servers and verifies the results. Status shows in the **Actions** tab:

- https://github.com/sam-black007/diabetes-prediction/actions
- Click a run → expand **Run verification tests** to see the per-check output (e.g. `10/10 checks passed`)

## Project structure
```
data/
  diabetes.csv              raw dataset
  sample_patients.csv       example file for the app's batch tab
  processed/                cleaned data, train/test arrays, model, results.json
plots/                      all generated charts
src/
  01_preprocessing.py
  02_eda.py
  03_model_training.py
app.py                      local web app (streamlit run app.py)
tests/
  test_project.py           CI verification checks
.github/workflows/test.yml  automated testing on push
requirements.txt
README.md
```