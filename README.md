# Diabetes Prediction using Machine Learning

[![Test](https://github.com/sam-black007/diabetes-prediction/actions/workflows/test.yml/badge.svg)](https://github.com/sam-black007/diabetes-prediction/actions)

A simple machine learning project that predicts whether a person has diabetes based on their medical records. I used the classic **PIMA Indian Diabetes Dataset**, which has records for 768 patients with 8 health features.

## What I used
Python, Pandas, NumPy, Scikit-Learn, Matplotlib, Seaborn and Streamlit. I trained and compared three models — **Logistic Regression, SVM, and Random Forest** — and picked the best one.

## Step-by-step setup

**Step 1 — Install Python (only if you don't have it)**
- Download from https://www.python.org/downloads/ (choose 3.10 or newer)
- During installation, tick **"Add Python to PATH"** — this is important
- Check it worked. Open a terminal (cmd on Windows / Terminal on Mac) and type:
```bash
python --version
```
You should see something like `Python 3.11.9`.

**Step 2 — Download the project**
```bash
git clone https://github.com/sam-black007/diabetes-prediction
cd diabetes-prediction
```
(No Git? Just download the ZIP from the repo page → *Code* → *Download ZIP* → unzip it, then open a terminal inside that folder.)

**Step 3 — Install the packages**
```bash
pip install -r requirements.txt
```
You'll see lots of "Downloading / Successfully installed" lines. This installs Pandas, NumPy, Scikit-Learn, Matplotlib, Seaborn, and Streamlit.

**Step 4 — Start the web app**
```bash
streamlit run app.py
```
Your browser opens **http://localhost:8501** automatically. To stop it, press `Ctrl + C` in the terminal.

## How to use the app
The app has three tabs:
- **Single patient** — move the sliders to enter a person's details and click *Predict* to see their diabetes risk
- **Batch from CSV** — upload a file like `data/sample_patients.csv` and get predictions for everyone at once
- **Results & charts** — the charts and confusion matrix from this project

> A trained model is already included, so the app works right away without training. Anyone else can do the same on their own laptop — no accounts or hosting needed.

## Full work process (how the project actually runs)

If you want to run everything yourself — from raw data to final result — do it in this order:

```bash
python src/01_preprocessing.py   # 1. clean + normalize + split
python src/02_eda.py             # 2. generate the charts
python src/03_model_training.py  # 3. train + tune + compare models
streamlit run app.py             # 4. open the web app
```

What each step does and what you should see:

1. **`01_preprocessing.py`** — loads the raw data, fixes the impossible `0` values, normalizes the features, splits into 80% training / 20% testing. It prints how many `0`s were fixed in each column and finishes with *"Saved scaler to data/processed/scaler.joblib"*.
2. **`02_eda.py`** — draws the charts (histograms, correlation heatmap, boxplots) and saves them into the `plots/` folder. It prints the class balance (500 no-diabetes, 268 diabetes).
3. **`03_model_training.py`** — trains Logistic Regression, SVM, and Random Forest, tunes them with `GridSearchCV`, and prints a report for each. It finishes by printing *"BEST MODEL (by F1-score): Random Forest (tuned) -> F1 = 0.6600"* and saves `best_model.joblib`.
4. **`streamlit run app.py`** — opens the web app, which uses the saved model to make live predictions.

**Testing everything (optional):** after the three scripts above, run
```bash
python tests/test_project.py
```
It checks 10 things (files exist, split sizes are right, Random Forest wins) and prints `10/10 checks passed`.

## What I did, step by step

1. **Cleaned the data** — the dataset had a lot of impossible `0` values (a person can't have 0 glucose or 0 BMI, for example). Those are actually missing values, so I replaced them with the average of each column.
2. **Normalized the features** — scaled everything so one feature (like glucose) doesn't overpower the others (like BMI).
3. **Split the data** — 80% for training, 20% for testing (614 / 154 patients).
4. **Explored the data** — made histograms, a correlation heatmap, and boxplots to see which features matter most (glucose and BMI stood out).
5. **Trained the models** — Logistic Regression, SVM, and Random Forest. I tuned the hyperparameters using `GridSearchCV`.
6. **Compared them** — using accuracy, precision, recall, and F1-score on the unseen test data.

## Results

| Model | Accuracy | Precision | Recall | F1-Score |
|-------|----------|-----------|--------|----------|
| Logistic Regression | 0.708 | 0.600 | 0.500 | 0.546 |
| SVM (tuned) | 0.740 | 0.652 | 0.556 | 0.600 |
| **Random Forest (tuned)** | **0.779** | **0.717** | **0.611** | **0.660** |

Random Forest won with about **78% accuracy** — the best of the three.

## Charts

**How the models compare**

![Model comparison](https://raw.githubusercontent.com/sam-black007/diabetes-prediction/main/plots/5_model_comparison.png)

**Confusion matrix of the best model (Random Forest)**

![Random Forest confusion matrix](https://raw.githubusercontent.com/sam-black007/diabetes-prediction/main/plots/cm_random_forest_%28tuned%29.png)

**Correlation between features**

![Correlation heatmap](https://raw.githubusercontent.com/sam-black007/diabetes-prediction/main/plots/3_correlation_heatmap.png)

## Project structure
```
data/
  diabetes.csv              raw dataset
  sample_patients.csv       example file for the app's batch tab
  processed/                cleaned data, train/test sets, trained model
plots/                      all the charts
src/
  01_preprocessing.py
  02_eda.py
  03_model_training.py
app.py                      the web app
tests/
  test_project.py           checks the project still works
requirements.txt
README.md
```