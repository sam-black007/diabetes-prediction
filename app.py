import os
import json
import numpy as np
import pandas as pd
import joblib
import streamlit as st

MODEL_PATH = os.path.join("data", "processed", "best_model.joblib")
SCALER_PATH = os.path.join("data", "processed", "scaler.joblib")
THRESHOLD_PATH = os.path.join("data", "processed", "model_threshold.json")
CLEAN_PATH = os.path.join("data", "processed", "diabetes_clean.csv")
PLOT_DIR = "plots"

FEATURES = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age",
]

RANGES = {
    "Pregnancies": (0, 17, 1),
    "Glucose": (0, 200, 2),
    "BloodPressure": (0, 122, 2),
    "SkinThickness": (0, 99, 1),
    "Insulin": (0, 846, 2),
    "BMI": (0.0, 67.1, 0.1),
    "DiabetesPedigreeFunction": (0.0, 2.5, 0.01),
    "Age": (21, 90, 1),
}

@st.cache_resource
def load_artifacts():
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    clean = pd.read_csv(CLEAN_PATH)
    medians = {c: clean[clean[c] != 0][c].median() for c in FEATURES}
    threshold = 0.5
    if os.path.exists(THRESHOLD_PATH):
        with open(THRESHOLD_PATH) as f:
            threshold = json.load(f).get("threshold", 0.5)
    return model, scaler, medians, threshold

def fix_and_predict(values, model, scaler, medians, threshold):
    row = []
    for feature in FEATURES:
        val = values[feature]
        if val == 0 and medians.get(feature) is not None:
            val = medians[feature]
        row.append(val)
    scaled = scaler.transform(pd.DataFrame([row], columns=FEATURES))
    prob = model.predict_proba(scaled)[0][1]
    pred = int(prob >= threshold)
    return pred, prob

def show_result(pred, prob):
    if pred == 1:
        st.error(f"### Result: Diabetes likely")
    else:
        st.success(f"### Result: No diabetes")
    st.progress(int(prob * 100))
    st.write(f"**Prediction probability of diabetes: {prob:.1%}**")

def main():
    st.set_page_config(page_title="Diabetes Prediction", page_icon="🩺", layout="wide")
    st.title("🩺 Diabetes Prediction")
    st.markdown("Predict diabetes risk from medical records using a tuned **Random Forest** model trained on the PIMA Indian Diabetes dataset (best accuracy **~78%**).")

    model, scaler, medians, threshold = load_artifacts()

    tab1, tab2, tab3 = st.tabs(["Single patient", "Batch from CSV", "Results & charts"])

    with tab1:
        st.subheader("Enter patient details")
        values = {}
        col1, col2 = st.columns(2)
        for i, feature in enumerate(FEATURES):
            lo, hi, step = RANGES[feature]
            with (col1 if i % 2 == 0 else col2):
                if feature in ["BMI", "DiabetesPedigreeFunction"]:
                    values[feature] = st.slider(feature, float(lo), float(hi), float((lo + hi) / 2), float(step))
                else:
                    values[feature] = st.slider(feature, lo, hi, (lo + hi) // 2, step)

        if st.button("Predict diabetes risk", type="primary"):
            pred, prob = fix_and_predict(values, model, scaler, medians, threshold)
            show_result(pred, prob)
            st.caption(f"Decision threshold: {threshold:.2f}. Values entered as 0 (impossible) are auto-replaced with the dataset median.")

    with tab2:
        st.subheader("Upload a CSV")
        st.write(f"Expected columns: {', '.join(FEATURES)} (an optional `Outcome` column is ignored).")
        upload = st.file_uploader("Choose a CSV file", type=["csv"])
        if upload is not None:
            df = pd.read_csv(upload)
            missing = [c for c in FEATURES if c not in df.columns]
            if missing:
                st.error(f"Missing columns: {missing}")
            else:
                df_in = df[FEATURES]
                preds, probs = [], []
                for _, row in df_in.iterrows():
                    pred, prob = fix_and_predict(row.to_dict(), model, scaler, medians, threshold)
                    preds.append(pred)
                    probs.append(prob)
                out = df.copy()
                out["Prediction"] = ["Diabetes" if p == 1 else "No diabetes" for p in preds]
                out["Risk"] = [f"{p:.1%}" for p in probs]
                st.dataframe(out)
                st.success(f"Processed {len(out)} patients: {sum(preds)} predicted diabetic.")

    with tab3:
        st.subheader("Model comparison")
        if os.path.exists(os.path.join(PLOT_DIR, "5_model_comparison.png")):
            st.image(os.path.join(PLOT_DIR, "5_model_comparison.png"))
        st.subheader("Confusion matrix — Random Forest")
        if os.path.exists(os.path.join(PLOT_DIR, "cm_random_forest_(tuned).png")):
            st.image(os.path.join(PLOT_DIR, "cm_random_forest_(tuned).png"))
        st.subheader("Feature correlation")
        if os.path.exists(os.path.join(PLOT_DIR, "3_correlation_heatmap.png")):
            st.image(os.path.join(PLOT_DIR, "3_correlation_heatmap.png"))

if __name__ == "__main__":
    main()