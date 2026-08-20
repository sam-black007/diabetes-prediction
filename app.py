import os
import json
import sys
import io
from datetime import datetime
import numpy as np
import pandas as pd
import joblib
import streamlit as st
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))
from report_parser import extract_text_from_pdf, parse_report

MODEL_PATH = os.path.join("data", "processed", "best_model.joblib")
SCALER_PATH = os.path.join("data", "processed", "scaler.joblib")
THRESHOLD_PATH = os.path.join("data", "processed", "model_threshold.json")
CLEAN_PATH = os.path.join("data", "processed", "diabetes_clean.csv")
HISTORY_PATH = os.path.join("data", "processed", "prediction_history.json")
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

def risk_level(prob, threshold):
    if prob < threshold:
        return "Low risk", "#2E7D32"
    elif prob < 0.6:
        return "Moderate risk", "#F9A825"
    return "High risk", "#C62828"

def health_tips(values):
    tips = []
    if values["Glucose"] >= 140:
        tips.append("Your after-meal glucose is high — talk to a doctor and limit sugary foods.")
    elif values["Glucose"] >= 126:
        tips.append("Your glucose is above normal — watch your carbohydrate intake.")
    if values["BMI"] >= 30:
        tips.append("Your BMI is in the obese range — even modest weight loss lowers diabetes risk.")
    elif values["BMI"] >= 25:
        tips.append("Your BMI is slightly high — regular exercise and a balanced diet help.")
    if values["BloodPressure"] >= 90:
        tips.append("Your blood pressure is elevated — reduce salt and get it checked regularly.")
    if values["Age"] >= 50:
        tips.append("Diabetes risk rises with age — annual screening is recommended.")
    if values["DiabetesPedigreeFunction"] >= 0.5:
        tips.append("Your family history score is raised — be extra mindful of lifestyle habits.")
    if not tips:
        tips.append("Your values look healthy. Keep up good sleep, exercise, and a balanced diet.")
    return tips

def save_prediction(record):
    records = []
    if os.path.exists(HISTORY_PATH):
        try:
            with open(HISTORY_PATH) as f:
                records = json.load(f)
        except Exception:
            records = []
    records.append(record)
    records = records[-50:]
    with open(HISTORY_PATH, "w") as f:
        json.dump(records, f, indent=2)

def render_history():
    if os.path.exists(HISTORY_PATH):
        with open(HISTORY_PATH) as f:
            records = json.load(f)
        if records:
            with st.expander(f"Prediction history ({len(records)} saved)"):
                st.dataframe(pd.DataFrame(records[::-1]))

def make_pdf(pred, prob, values, threshold):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, h - 70, "Diabetes Risk Report")
    c.setFont("Helvetica", 11)
    c.drawString(50, h - 95, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, h - 130, "Patient values")
    c.setFont("Helvetica", 11)
    labels = {
        "Glucose": "After-meal glucose (mg/dL)", "Pregnancies": "Pregnancies",
        "BloodPressure": "Blood pressure (systolic)", "SkinThickness": "Skin thickness",
        "Insulin": "Insulin (uIU/mL)", "BMI": "BMI",
        "DiabetesPedigreeFunction": "Family history score", "Age": "Age",
    }
    y = h - 155
    for f in FEATURES:
        c.drawString(60, y, f"{labels[f]}: {values[f]:.1f}")
        y -= 18
    y -= 10
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, f"Result: {'Diabetes likely' if pred == 1 else 'No diabetes'} ({risk_level(prob, threshold)[0]})")
    y -= 18
    c.setFont("Helvetica", 11)
    c.drawString(50, y, f"Probability of diabetes: {prob:.1%}")
    y -= 30
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Health tips")
    c.setFont("Helvetica", 10)
    for tip in health_tips(values):
        y -= 16
        c.drawString(60, y, f"- {tip}")
    c.save()
    return buf.getvalue()

def show_result(pred, prob, values, threshold):
    if pred == 1:
        st.error("### Result: Diabetes likely")
    else:
        st.success("### Result: No diabetes")
    level, color = risk_level(prob, threshold)
    st.markdown(f"**Risk level:** <span style='color:{color};font-weight:bold'>{level}</span>", unsafe_allow_html=True)
    st.progress(int(prob * 100))
    st.write(f"**Probability of diabetes: {prob:.1%}**")

    st.markdown("#### Health tips")
    for tip in health_tips(values):
        st.write(f"- {tip}")

    record = {
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "result": "Diabetes likely" if pred == 1 else "No diabetes",
        "risk": f"{prob:.1%}",
        **{k: round(float(v), 2) for k, v in values.items()},
    }
    save_prediction(record)

    pdf_bytes = make_pdf(pred, prob, values, threshold)
    st.download_button(
        "Download result as PDF", data=pdf_bytes,
        file_name=f"diabetes_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
        mime="application/pdf",
    )
    render_history()

def glucose_interpretation(value, kind):
    if kind == "fasting":
        if value < 100:
            return "Normal", "#2E7D32"
        elif value < 126:
            return "Pre-diabetes (impaired fasting glucose)", "#F9A825"
        return "Diabetes range", "#C62828"
    else:
        if value < 140:
            return "Normal", "#2E7D32"
        elif value < 200:
            return "Pre-diabetes (impaired glucose tolerance)", "#F9A825"
        return "Diabetes range", "#C62828"

def glucose_panel():
    st.markdown("#### Blood sugar test (mg/dL)")
    fasting = st.number_input("Fasting blood sugar (after 8h no food)", min_value=0, max_value=400, value=100, step=1)
    postmeal = st.number_input("Blood sugar 2 hours after a meal", min_value=0, max_value=500, value=140, step=1)
    c1, c2 = st.columns(2)
    for col, value, kind, label in [
        (c1, fasting, "fasting", "Fasting"),
        (c2, postmeal, "postmeal", "After-meal (2h)"),
    ]:
        with col:
            category, color = glucose_interpretation(value, kind)
            st.markdown(
                f"**{label}:** <span style='color:{color};font-weight:bold'>{category}</span>",
                unsafe_allow_html=True,
            )
    st.caption("Standard ranges: Fasting — normal <100, pre-diabetes 100–125, diabetes ≥126 | After-meal — normal <140, pre-diabetes 140–199, diabetes ≥200. The model uses the after-meal value.")
    return postmeal

def main():
    st.set_page_config(page_title="Diabetes Prediction", page_icon="🩺", layout="wide")
    st.title("🩺 Diabetes Prediction")
    st.markdown("Predict diabetes risk from medical records using a tuned **Gradient Boosting** model trained on the PIMA Indian Diabetes dataset (best accuracy **~77%**).")

    model, scaler, medians, threshold = load_artifacts()

    tab1, tab2, tab3, tab4 = st.tabs(["Single patient", "Batch from CSV", "From test report", "Results & charts"])

    with tab1:
        st.subheader("Enter patient details")
        values = {}
        values["Glucose"] = glucose_panel()
        st.markdown("#### Other details")
        col1, col2 = st.columns(2)
        for i, feature in enumerate(FEATURES):
            if feature == "Glucose":
                continue
            lo, hi, step = RANGES[feature]
            with (col1 if i % 2 == 0 else col2):
                if feature in ["BMI", "DiabetesPedigreeFunction"]:
                    values[feature] = st.slider(feature, float(lo), float(hi), float((lo + hi) / 2), float(step))
                else:
                    values[feature] = st.slider(feature, lo, hi, (lo + hi) // 2, step)

        if st.button("Predict diabetes risk", type="primary"):
            pred, prob = fix_and_predict(values, model, scaler, medians, threshold)
            show_result(pred, prob, values, threshold)
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

    with tab4:
        st.subheader("Model comparison")
        if os.path.exists(os.path.join(PLOT_DIR, "5_model_comparison.png")):
            st.image(os.path.join(PLOT_DIR, "5_model_comparison.png"))
        st.subheader("ROC curves")
        if os.path.exists(os.path.join(PLOT_DIR, "6_roc_curves.png")):
            st.image(os.path.join(PLOT_DIR, "6_roc_curves.png"))
        st.subheader("Feature importance (what drives the prediction)")
        if os.path.exists(os.path.join(PLOT_DIR, "7_feature_importance.png")):
            st.image(os.path.join(PLOT_DIR, "7_feature_importance.png"))
        st.subheader("Confusion matrix — Random Forest")
        if os.path.exists(os.path.join(PLOT_DIR, "cm_random_forest_(tuned).png")):
            st.image(os.path.join(PLOT_DIR, "cm_random_forest_(tuned).png"))
        st.subheader("Feature correlation")
        if os.path.exists(os.path.join(PLOT_DIR, "3_correlation_heatmap.png")):
            st.image(os.path.join(PLOT_DIR, "3_correlation_heatmap.png"))

    with tab3:
        st.subheader("Upload a blood test report (PDF)")
        st.write("The app reads the report and fills in the values automatically. You can correct anything before predicting.")
        report = st.file_uploader("Choose a PDF report", type=["pdf"])
        if report is not None:
            with st.spinner("Reading report..."):
                text = extract_text_from_pdf(report)
                parsed = parse_report(text)
            if not any(parsed.values()):
                st.warning("Could not find recognizable values in this report. Check it's a text-based PDF (scanned images aren't supported).")
                st.text(text[:500])
            else:
                st.success("Report read! Values extracted below — edit if needed.")
                st.markdown("#### Extracted values")
                defaults = {
                    "Fasting blood sugar (mg/dL)": parsed.get("fasting", 100) or 100,
                    "After-meal blood sugar (mg/dL)": parsed.get("postmeal", 140) or 140,
                    "BMI": parsed.get("bmi", medians["BMI"]) or medians["BMI"],
                    "Blood pressure (systolic)": parsed.get("blood_pressure", medians["BloodPressure"]) or medians["BloodPressure"],
                    "Age": parsed.get("age", 45) or 45,
                    "Insulin": parsed.get("insulin", medians["Insulin"]) or medians["Insulin"],
                    "Pregnancies": parsed.get("pregnancies", 1) or 1,
                    "Skin thickness": parsed.get("skin_thickness", medians["SkinThickness"]) or medians["SkinThickness"],
                }
                c1, c2 = st.columns(2)
                inputs = {}
                for i, (label, val) in enumerate(defaults.items()):
                    with (c1 if i % 2 == 0 else c2):
                        inputs[label] = st.number_input(label, value=float(val), step=1.0)
                dpf = st.slider("DiabetesPedigreeFunction (family history)", 0.0, 2.5, 0.5, 0.01)

                if st.button("Predict from report", type="primary"):
                    values = {
                        "Pregnancies": inputs["Pregnancies"],
                        "Glucose": inputs["After-meal blood sugar (mg/dL)"],
                        "BloodPressure": inputs["Blood pressure (systolic)"],
                        "SkinThickness": inputs["Skin thickness"],
                        "Insulin": inputs["Insulin"],
                        "BMI": inputs["BMI"],
                        "DiabetesPedigreeFunction": dpf,
                        "Age": inputs["Age"],
                    }
                    pred, prob = fix_and_predict(values, model, scaler, medians, threshold)
                    show_result(pred, prob, values, threshold)
                    st.caption(f"Decision threshold: {threshold:.2f}.")

if __name__ == "__main__":
    main()