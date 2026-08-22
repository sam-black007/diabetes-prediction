import os
import json
import sys
import io
from datetime import datetime
import random
import base64
import numpy as np
import pandas as pd
import joblib
import streamlit as st
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))
from report_parser import extract_text_from_pdf, extract_text_from_image, parse_report, OCR_ENGINE
try:
    from ai_agents import (
        AIClient, chat_agent, enrich_patient_data, web_research_agent,
        extract_patient_fields, extract_lifestyle, INTAKE_FIELDS,
        validate_report_values,
    )
except ImportError as _ai_err:
    st.error(f"AI module failed to load on the server: {_ai_err}. "
             "The app runs with AI disabled — report OCR and the model still work.")
    class AIClient:  # offline fallback so the rest of the app keeps working
        mode = "offline"
        status_detail = f"import failed: {_ai_err}"
        def chat(self, messages, system="", temperature=0.3):
            return "The AI assistant is unavailable on this server."
        def complete(self, prompt, system="", temperature=0.3):
            return "The AI assistant is unavailable on this server."
    def chat_agent(messages, client=None, system=None):
        return "The AI assistant is unavailable on this server."
    def enrich_patient_data(description, base_values=None, client=None):
        return {}
    def web_research_agent(query, client=None):
        return "Web research needs the AI module, which failed to load."
    def extract_patient_fields(history, client=None):
        return {}
    def extract_lifestyle(history, client=None):
        return {}
    INTAKE_FIELDS = ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
                     "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"]
    def validate_report_values(ocr_text, regex_parsed, client=None):
        return {}, []
from risk_questionnaire import calc_findrisk, calc_bmi, symptom_flags, RED_FLAG_SYMPTOMS

FUN_FACTS = [
    "🍎 Fibre-rich foods (veggies, beans, whole grains) blunt blood-sugar spikes.",
    "🚶 A 30-minute walk after meals can lower blood glucose more than you'd think.",
    "😴 Poor sleep raises diabetes risk — aim for 7–8 hours a night.",
    "💧 Swapping sugary drinks for water is one of the easiest wins.",
    "🧬 Family history matters, but daily habits still move the needle a lot.",
]
TIP_OF_DAY = [
    "Small swaps beat big overhauls — start with one habit.",
    "Water first, sugary drinks second. Your pancreas will thank you.",
    "A 10-minute walk beats a 0-minute workout. Motion > perfection.",
    "Sleep is part of health too — don't skip it.",
    "Know your numbers: glucose, BMI, blood pressure. Awareness is power.",
]

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
def load_ai():
    return AIClient()

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


def clinical_stage(fasting, postmeal, hba1c):
    """WHO/ADA diagnostic thresholds — what a health worker actually checks.

    Returns (stage_label, explanation). None inputs are ignored.
    """
    if (fasting is not None and fasting >= 126) or \
       (postmeal is not None and postmeal >= 200) or \
       (hba1c is not None and hba1c >= 6.5):
        return ("Diabetes range",
                "Per WHO/ADA: fasting glucose ≥126 mg/dL, 2h/after-meal ≥200 mg/dL, or "
                "HbA1c ≥6.5% is in the diabetes range — not just 'high BMI'.")
    if (fasting is not None and fasting >= 100) or \
       (postmeal is not None and postmeal >= 140) or \
       (hba1c is not None and hba1c >= 5.7):
        return ("Prediabetes range",
                "Above normal but below diabetes thresholds (fasting 100–125, after-meal "
                "140–199, HbA1c 5.7–6.4%). Lifestyle change now can prevent progression.")
    return ("Normal / low range",
            "Blood-sugar values are within the normal range. BMI, age and family history "
            "still matter as risk factors — keep screening periodically.")


# (UI label, session key, parser key, AI key, step)
REPORT_FIELDS = [
    ("After-meal blood sugar (mg/dL)", "rep_postmeal", "postmeal", "after_meal_glucose_mg_dl", 1.0),
    ("Fasting blood sugar (mg/dL)", "rep_fasting", "fasting", "fasting_glucose_mg_dl", 1.0),
    ("HbA1c (%)", "rep_hba1c", "hba1c", "hba1c_pct", 0.1),
    ("Blood pressure (systolic)", "rep_bp", "blood_pressure", "blood_pressure_systolic", 1.0),
    ("Age", "rep_age", "age", "age", 1.0),
    ("Insulin", "rep_insulin", "insulin", "insulin", 1.0),
    ("Pregnancies", "rep_preg", "pregnancies", "pregnancies", 1.0),
    ("Skin thickness", "rep_skin", "skin_thickness", "skin_thickness", 1.0),
]


def _reads_conflict(rv, av):
    """True when the regex parser and the AI disagree beyond a small tolerance."""
    return (rv is not None and av is not None
            and abs(rv - av) > max(1.0, 0.05 * abs(rv)))


def _init_report_fields(parsed, ai_vals, medians):
    """Seed the report-tab widgets from the two readings (parser + AI)."""
    median_for = {"rep_bp": "BloodPressure", "rep_insulin": "Insulin", "rep_skin": "SkinThickness"}
    default_for = {"rep_postmeal": 140.0, "rep_fasting": 100.0, "rep_hba1c": 0.0,
                   "rep_age": 45.0, "rep_preg": 1.0}
    for _label, key, pk, ak, _step in REPORT_FIELDS:
        rv, av = parsed.get(pk), ai_vals.get(ak)
        st.session_state["_rep_read_" + key] = (rv, av)
        if _reads_conflict(rv, av):
            if "_rep_pick_" + key not in st.session_state:
                st.session_state["_rep_pick_" + key] = "AI"
            chosen = av if st.session_state["_rep_pick_" + key] == "AI" else rv
        elif rv is not None:
            chosen = rv
        elif av is not None:
            chosen = av
        else:
            chosen = medians[median_for[key]] if key in median_for else default_for.get(key, 0.0)
        st.session_state[key] = float(chosen)
    w, h = ai_vals.get("weight_kg"), ai_vals.get("height_cm")
    b = ai_vals.get("bmi") or parsed.get("bmi")
    if w and h:
        st.session_state["rep_weight"], st.session_state["rep_height"] = float(w), float(h)
    elif b:
        st.session_state["rep_weight"] = round(float(b) * (1.65 ** 2), 1)
        st.session_state["rep_height"] = 165.0
    else:
        st.session_state["rep_weight"], st.session_state["rep_height"] = 70.0, 170.0
    if ai_vals.get("diabetes_pedigree_function"):
        st.session_state["rep_dpf"] = float(ai_vals["diabetes_pedigree_function"])
    elif "rep_dpf" not in st.session_state:
        st.session_state["rep_dpf"] = 0.5


def show_result(pred, prob, values, threshold, clinical=None):
    """Render the result: a clinical (WHO/ADA) verdict plus the ML screening estimate."""
    if clinical:
        stage, detail = clinical
        box = "alert-box" if stage == "Diabetes range" else (
            "disclaimer" if stage == "Prediabetes range" else "trust-pill")
        st.markdown(
            f'<div class="{box}"><b>Clinical check (WHO/ADA):</b> {stage}. {detail}</div>',
            unsafe_allow_html=True,
        )
    label = "Diabetes likely" if pred else "No diabetes"
    cat_class = "cat-high" if pred else "cat-low"
    chips = "".join(
        f'<span class="chip"><b>{k}:</b> {v}</span>' for k, v in values.items()
    )
    st.markdown(f'''
    <div class="result-card">
      <h3>Screening model estimate</h3>
      <div class="risk-headline">
        <span class="risk-score">{prob:.0%}</span>
        <span class="risk-cat {cat_class}">{label}</span>
      </div>
      <p>Trained screening-model probability of diabetes (decision threshold {threshold:.2f}).</p>
      <div class="bar-track"><div class="bar-fill" style="width:{int(prob * 100)}%"></div></div>
      <div class="chip-row">{chips}</div>
    </div>
    ''', unsafe_allow_html=True)
    st.markdown(
        '<div class="disclaimer">Screening only — not a diagnosis. A positive result should be '
        'confirmed with a fasting glucose / HbA1c test per WHO &amp; IDF guidance.</div>',
        unsafe_allow_html=True,
    )

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

def hero_svg_data_uri():
    try:
        p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "hero.svg")
        with open(p, "rb") as f:
            return "data:image/svg+xml;base64," + base64.b64encode(f.read()).decode()
    except Exception:
        return ""
    level, color = risk_level(prob, threshold)
    border_cls = {"Low risk": "result-safe", "Moderate risk": "result-warn",
                  "High risk": "result-alert"}.get(level, "result-safe")
    fun_caption = {
        "Low risk": "🎉 You're looking sweet — in the good way! Keep it up.",
        "Moderate risk": "🙂 Worth a closer look — small lifestyle tweaks go a long way.",
        "High risk": "⚠️ Heads up — let's get ahead of this with a pro.",
    }.get(level, "")
    if pred == 1:
        st.error(f"### 🚩 Result: Diabetes likely\n\n{fun_caption}")
    else:
        st.success(f"### 🎉 Result: No diabetes\n\n{fun_caption}")
        st.balloons()
    st.markdown(
        f'<div class="{border_cls}" style="padding:10px 14px;background:#FFFFFF;border-radius:10px;">'
        f'<b>Risk level:</b> <span style="color:{color};font-weight:bold">{level}</span><br>'
        f'<b>Probability of diabetes:</b> {prob:.1%}'
        f'</div>',
        unsafe_allow_html=True,
    )
    st.progress(int(prob * 100))
    st.caption("Screening estimate only — validation accuracy ~77% (sensitivity 82%, specificity 74%). "
               "Confirm with a clinician via fasting glucose / HbA1c.")

    st.markdown("#### 💪 Health tips")
    for tip in health_tips(values):
        st.write(f"- ✅ {tip}")

    with st.expander("💡 Did you know?"):
        st.write(random.choice(FUN_FACTS))

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

PROFESSIONAL_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
html, body, [class*="css"] { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
.stApp { background: transparent; }

/* Hero header */
.hero {
    position: relative; overflow: hidden;
    display: flex; align-items: center; gap: 18px;
    padding: 26px 30px; border-radius: 18px;
    background: linear-gradient(120deg, #0E7C86, #0B5C9E, #11A6A0, #0E7C86);
    background-size: 300% 300%;
    animation: heroShift 14s ease infinite;
    color: #FFFFFF; box-shadow: 0 10px 30px rgba(14,124,134,0.22);
    margin-bottom: 22px;
}
.hero::before, .hero::after {
    content: ""; position: absolute; border-radius: 50%;
    background: rgba(255,255,255,0.16);
}
.hero::before { width: 190px; height: 190px; top: -70px; right: -40px; }
.hero::after { width: 130px; height: 130px; bottom: -55px; left: 28%; }
.hero-art { margin-left: auto; width: 150px; height: auto; flex: 0 0 auto; position: relative; z-index: 1; }
@keyframes heroShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}
.hero-badge {
    width: 56px; height: 56px; border-radius: 14px; flex: 0 0 56px;
    background: rgba(255,255,255,0.18); display: flex; align-items: center;
    justify-content: center; font-size: 30px; animation: bob 3s ease-in-out infinite;
    position: relative; z-index: 1;
}
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.hero h1 { font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.3px; }
.hero p { margin: 4px 0 0; font-size: 14px; opacity: 0.9; font-weight: 400; }

/* Section cards */
.section-card {
    background: #F2F6F8; border: 1px solid #E3EBEF; border-radius: 14px;
    padding: 20px 22px; margin-bottom: 16px;
}

/* Tabs */
.stTabs [data-baseweb="tab-list"] { gap: 6px; }
.stTabs [data-baseweb="tab"] {
    border-radius: 9px 9px 0 0; padding: 9px 18px; font-weight: 600;
    background-color: #F2F6F8; color: #41565F;
}
.stTabs [aria-selected="true"] { background-color: #0E7C86 !important; color: #FFFFFF !important; }

/* Buttons */
.stButton > button[kind="primary"] {
    background: linear-gradient(120deg, #0E7C86, #0B5C9E);
    border: none; border-radius: 10px; font-weight: 600; padding: 0.55rem 1.4rem;
    box-shadow: 0 4px 14px rgba(14,124,134,0.25);
}
.stButton > button[kind="primary"]:hover { filter: brightness(1.05); }

/* Metrics */
[data-testid="stMetric"] {
    background: #FFFFFF; border: 1px solid #E3EBEF; border-radius: 12px;
    padding: 10px 14px; box-shadow: 0 2px 8px rgba(22,36,43,0.05);
}

div[data-testid="stCaption"] { color: #7A8B93; font-size: 12.5px; }
hr { border: none; border-top: 1px solid #E3EBEF; margin: 14px 0; }

/* Result cards (HTML/CSS UI) */
.result-card {
    background: #FFFFFF; border: 1px solid #E3EBEF; border-radius: 16px;
    padding: 22px 24px; margin: 14px 0; box-shadow: 0 4px 16px rgba(22,36,43,0.06);
}
.result-card h3 { margin: 0 0 12px; font-size: 16px; color: #16242B; font-weight: 600; }
.risk-headline { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.risk-score { font-size: 40px; font-weight: 700; color: #0E7C86; line-height: 1; }
.risk-cat { font-size: 18px; font-weight: 600; padding: 4px 12px; border-radius: 999px; }
.cat-low { background: #E6F4EA; color: #1E7A3C; }
.cat-mod { background: #FFF4E0; color: #B26A00; }
.cat-high { background: #FDE8E8; color: #C0392B; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.chip { background: #F2F6F8; border-radius: 8px; padding: 6px 12px; font-size: 13px; color: #2B3A42; }
.chip b { color: #0E7C86; }
.disclaimer {
    background: #FFF8E6; border-left: 4px solid #F0B400; border-radius: 8px;
    padding: 12px 16px; font-size: 13px; color: #6B5500; margin: 14px 0;
}
.alert-box {
    background: #FDE8E8; border-left: 4px solid #C0392B; border-radius: 8px;
    padding: 12px 16px; font-size: 13.5px; color: #7A1F1F; margin: 14px 0;
}
.bar-track { background: #EDEFF1; border-radius: 999px; height: 10px; overflow: hidden; margin-top: 10px; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #0E7C86, #0B5C9E); }

/* Page background + refined inputs */
body {
  background-color: #EFF5F7;
  background-image: radial-gradient(rgba(14,124,134,0.12) 1.4px, transparent 1.4px);
  background-size: 22px 22px;
}
.stApp,
[data-testid="stAppViewContainer"] { background: transparent; }
.trust-strip { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0 4px; }
.trust-pill {
  background: #FFFFFF; border: 1px solid #D8EAE6; color: #0E5A52;
  font-size: 12px; padding: 6px 12px; border-radius: 999px;
  box-shadow: 0 2px 6px rgba(14,124,134,0.06);
}
.result-safe { border-left: 5px solid #2E7D32; }
.result-warn { border-left: 5px solid #F9A825; }
.result-alert { border-left: 5px solid #C0392B; }
.stTextInput > div > div > input,
.stNumberInput input,
.stSelectbox > div > div {
    border-radius: 10px !important; border: 1px solid #D8E2E7 !important;
}
.stMultiSelect [data-baseweb="tag"] { background: #0E7C86 !important; }

/* Hero tag + step strip */
.hero-tag {
    display: inline-block; background: rgba(255,255,255,0.18); padding: 3px 11px;
    border-radius: 999px; font-size: 11.5px; letter-spacing: 0.6px;
    text-transform: uppercase; margin-bottom: 10px;
}
.step-strip { display: flex; gap: 14px; margin: 22px 0 6px; flex-wrap: wrap; }
.step-card {
    flex: 1; min-width: 200px; background: #FFFFFF; border: 1px solid #E3EBEF;
    border-radius: 14px; padding: 16px 18px; box-shadow: 0 3px 12px rgba(22,36,43,0.05);
}
.step-num {
    width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(120deg,#0E7C86,#0B5C9E);
    color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;
}
.step-card h4 { margin: 0 0 4px; font-size: 14.5px; color: #16242B; }
.step-card p { margin: 0; font-size: 12.8px; color: #5C6B72; }

/* Footer */
.app-footer {
    margin-top: 34px; padding: 20px 24px; border-radius: 14px;
    background: #0E2630; color: #C7D6DC; font-size: 13px;
    display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between;
}
.app-footer a { color: #4FD1C5; text-decoration: none; font-weight: 600; }
.app-footer a:hover { text-decoration: underline; }
.footer-btn {
    background: linear-gradient(120deg,#0E7C86,#0B5C9E); color: #fff !important;
    padding: 8px 16px; border-radius: 9px; font-weight: 600;
}
.footer-btn:hover { filter: brightness(1.06); text-decoration: none !important; }

/* Polished chat UI */
[data-testid="stChatMessage"] { background: transparent !important; padding: 6px 0 !important; }
[data-testid="stChatMessageContent"] {
    border-radius: 16px !important; padding: 12px 16px !important;
    font-size: 14px !important; line-height: 1.5 !important; box-shadow: 0 1px 6px rgba(22,36,43,0.05);
}
[data-testid="stChatMessage"]:has([data-testid="stChatMessageAvatar"] [alt="user"])
    [data-testid="stChatMessageContent"] {
    background: linear-gradient(120deg, #0E7C86, #0B5C9E) !important; color: #fff !important;
}
[data-testid="stChatMessage"]:has([data-testid="stChatMessageAvatar"] [alt="assistant"])
    [data-testid="stChatMessageContent"] {
    background: #F2F6F8 !important; border: 1px solid #E3EBEF !important; color: #16242B !important;
}
[data-testid="stChatInput"] textarea {
    border-radius: 14px !important; border: 1px solid #D8E2E7 !important;
}
[data-testid="stChatMessageAvatar"] {
    background: #0E7C86 !important; border: none !important;
}
</style>
"""


def run_lifestyle_assessment(life, symptoms, model, scaler, medians, threshold):
    required = ["age", "sex", "height_cm", "weight_kg"]
    missing = [k for k in required if k not in life or life.get(k) in (None, "")]
    if missing:
        st.warning("A few details are still missing — please continue the conversation "
                   f"(need: {', '.join(missing)}).")
        return

    fr = calc_findrisk(
        age=life.get("age"), sex=life.get("sex"), height_cm=life.get("height_cm"),
        weight_kg=life.get("weight_kg"), waist_cm=life.get("waist_cm"),
        activity_high=life.get("activity_high", False), veg_daily=life.get("veg_daily", False),
        bp_issue=life.get("bp_issue", False), high_sugar_history=life.get("high_sugar_history", False),
        family_history=life.get("family_history", "none"),
    )

    # ML model estimate with lab values imputed by dataset medians
    values = {
        "Pregnancies": 0,
        "Glucose": 0,
        "BloodPressure": 140.0 if life.get("bp_issue") else 0.0,
        "SkinThickness": 0,
        "Insulin": 0,
        "BMI": fr["bmi"] if fr["bmi"] else 0,
        "DiabetesPedigreeFunction": 0.8 if life.get("family_history") in ("young", "older") else 0.3,
        "Age": float(life.get("age")),
    }
    pred, prob = fix_and_predict(values, model, scaler, medians, threshold)

    cat_class = ("cat-low" if fr["category"] in ("Low risk", "Slightly elevated")
                 else "cat-mod" if fr["category"] == "Moderate" else "cat-high")
    bmi_txt = f'{fr["bmi"]}' if fr["bmi"] else "n/a"

    st.markdown(f'''
    <div class="result-card">
      <h3>FINDRISC Lifestyle Risk Score</h3>
      <div class="risk-headline">
        <span class="risk-score">{fr["score"]}</span>
        <span class="risk-cat {cat_class}">{fr["category"]}</span>
      </div>
      <p>Estimated 10-year type-2 diabetes risk: <b>{fr["risk_pct"]}%</b></p>
      <div class="chip-row">
        <span class="chip"><b>BMI:</b> {bmi_txt}</span>
        <span class="chip"><b>Age:</b> {life.get('age')}</span>
        <span class="chip"><b>Active:</b> {'Yes' if life.get('activity_high') else 'No'}</span>
        <span class="chip"><b>Daily veg/fruit:</b> {'Yes' if life.get('veg_daily') else 'No'}</span>
        <span class="chip"><b>High BP:</b> {'Yes' if life.get('bp_issue') else 'No'}</span>
        <span class="chip"><b>Prior high sugar:</b> {'Yes' if life.get('high_sugar_history') else 'No'}</span>
        <span class="chip"><b>Family history:</b> {life.get('family_history')}</span>
      </div>
    </div>
    ''', unsafe_allow_html=True)

    st.markdown(f'''
    <div class="result-card">
      <h3>Preliminary model estimate</h3>
      <p>Screening-model probability (lab values assumed typical): <b>{prob:.0%}</b></p>
      <div class="bar-track"><div class="bar-fill" style="width:{int(prob*100)}%"></div></div>
      <p style="font-size:12.5px;color:#7A8B93;margin-top:8px">Uses the trained model with missing lab values filled by typical averages — indicative only.</p>
    </div>
    ''', unsafe_allow_html=True)

    flags = symptom_flags(symptoms)
    if flags:
        st.markdown('<div class="alert-box"><b>⚠ Possible warning signs:</b> '
                    + ", ".join(flags)
                    + ". These can indicate active high blood sugar — please consult a clinician soon for a confirmatory test.</div>",
                    unsafe_allow_html=True)

    st.markdown('<div class="disclaimer">This is a lifestyle-based <b>screening</b> tool, not a diagnosis. '
               'A FINDRISC score of 12+ (or any red-flag symptoms) means you should get a '
               '<b>fasting blood glucose / HbA1c test</b> from a healthcare professional.</div>',
               unsafe_allow_html=True)


def main():
    st.set_page_config(page_title="Diabetes Risk Intelligence", page_icon="🩺", layout="wide")
    st.markdown(PROFESSIONAL_CSS, unsafe_allow_html=True)

    model, scaler, medians, threshold = load_artifacts()
    ai = load_ai()
    if "ai_messages" not in st.session_state:
        st.session_state.ai_messages = []

    hero_art = hero_svg_data_uri()
    st.markdown(
        '<div class="hero">'
        '<div class="hero-badge">🩺</div>'
        '<div style="position: relative; z-index: 1; flex: 1;">'
        '<div class="hero-tag">AI-powered clinical screening</div>'
        '<h1>Diabetes Risk Intelligence</h1>'
        '<p>Know your diabetes risk in minutes — upload a report, chat with the assistant, '
        'or answer a few friendly questions. No white coat required. 😊</p>'
        '</div>'
        f'<img class="hero-art" src="{hero_art}" alt="animated heartbeat" />'
        '</div>',
        unsafe_allow_html=True,
    )

    st.caption("💡 Tip of the day: " + random.choice(TIP_OF_DAY))

    st.markdown(
        '<div class="trust-strip">'
        '<div class="trust-pill">🔒 Private — your data stays on your device</div>'
        '<div class="trust-pill">🏥 Based on WHO / IDF guidance</div>'
        '<div class="trust-pill">✅ Validated model · ROC-AUC 0.82</div>'
        '<div class="trust-pill">⚕️ Screening only — not a diagnosis</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="step-strip">'
        '<div class="step-card"><div class="step-num">1</div><h4>Import a report</h4>'
        '<p>Upload a PDF or photo of a blood test — values are read automatically (OCR).</p></div>'
        '<div class="step-card"><div class="step-num">2</div><h4>Talk to the assistant</h4>'
        '<p>No test? Answer simple lifestyle questions — no lab values required.</p></div>'
        '<div class="step-card"><div class="step-num">3</div><h4>Get your risk</h4>'
        '<p>FINDRISC score + model estimate, with an AI interpretation and next steps.</p></div>'
        '</div>',
        unsafe_allow_html=True,
    )

    tab1, tab2, tab3, tab4 = st.tabs(
        ["Medical Report", "Guided Intake", "Model Analytics", "AI Clinical Assistant"]
    )

    # ---------------- Tab 1: Medical Report (primary) ----------------
    with tab1:
        st.subheader("Import lab report (PDF / image)")
        st.write("Upload a blood test report — **PDF, photo, or scanned image** (PNG/JPG). "
                 "Values are read automatically (OCR) and a risk assessment is generated instantly, "
                 "with an AI interpretation of the result. Your image is processed with OCR on our "
                 "server and is **never sent to the AI model** (it has no vision).")
        report = st.file_uploader("Choose a report (PDF or image)", type=["pdf", "png", "jpg", "jpeg"])
        pasted = st.text_area("…or paste the report text / values here if the photo won't read",
                              key="report_paste")
        if report is not None or pasted.strip():
            is_image = bool(report) and report.name.lower().endswith((".png", ".jpg", ".jpeg"))
            if is_image:
                st.image(report, caption="Uploaded report photo", width=400)
            sig = (report.name, getattr(report, "size", None)) if report is not None else ("pasted", hash(pasted.strip()))
            if st.session_state.get("_rep_sig") != sig:
                with st.spinner("Reading report (OCR + AI cross-check)..."):
                    text = ""
                    if report is not None:
                        text = extract_text_from_image(report) if is_image else extract_text_from_pdf(report)
                    if pasted.strip():
                        text = (text + "\n" + pasted.strip()).strip() if text else pasted.strip()
                    parsed = parse_report(text)
                    ai_vals, corrections = {}, []
                    if text.strip() and ai.mode != "offline":
                        ai_vals, corrections = validate_report_values(text, parsed, ai)
                    st.session_state.update({
                        "_rep_sig": sig, "_rep_text": text, "_rep_parsed": parsed,
                        "_rep_ai_vals": ai_vals, "_rep_corrections": corrections,
                    })
                    _init_report_fields(parsed, ai_vals, medians)
                st.caption(f"OCR engine: {OCR_ENGINE} · extracted {len(text.strip())} characters.")
            else:
                text = st.session_state.get("_rep_text", "")
                parsed = st.session_state.get("_rep_parsed", {})
                ai_vals = st.session_state.get("_rep_ai_vals", {})
                corrections = st.session_state.get("_rep_corrections", [])
            if not any(parsed.values()) and not ai_vals:
                st.warning("Could not recognize the values in this report. Make sure the photo is clear, "
                           "well-lit, and the text is readable (scans usually work best).")
                with st.expander("Show OCR text"):
                    st.text(text[:1500])
            else:
                st.success("Report read — OCR and AI cross-checked. Review the values, then assess.")
                n_real = sum(
                    1 for _l, _k, pk, ak, _s in REPORT_FIELDS
                    if parsed.get(pk) is not None or ai_vals.get(ak) is not None
                )
                if ai_vals:
                    st.caption(f"AI cross-check done · {len(corrections)} correction(s) · "
                               f"coverage {n_real}/{len(REPORT_FIELDS)} fields read from the report.")
                else:
                    st.caption("AI cross-check unavailable (offline) — parser values only. "
                               f"Coverage {n_real}/{len(REPORT_FIELDS)}. Reason: {ai.status_detail}")
                if corrections:
                    with st.expander("Show AI corrections (parser vs AI)"):
                        for c in corrections:
                            st.write(f"- **{c.get('field')}**: parser {c.get('regex_value')} "
                                     f"→ AI {c.get('ai_value')} — {c.get('reason', '')}")

                conflicts = [
                    (label, key, rv, av)
                    for label, key, _pk, _ak, _step in REPORT_FIELDS
                    for (rv, av) in [st.session_state.get("_rep_read_" + key, (None, None))]
                    if _reads_conflict(rv, av)
                ]
                if conflicts:
                    st.markdown("#### Parser vs AI — pick the correct reading")
                    for label, key, rv, av in conflicts:
                        pick = st.radio(
                            f"{label} — parser says {rv:g}, AI says {av:g}",
                            ["Parser", "AI"],
                            index=0 if st.session_state.get("_rep_pick_" + key) == "Parser" else 1,
                            key="_rep_pick_" + key, horizontal=True,
                        )
                        if st.session_state.get("_rep_applied_" + key) != pick:
                            st.session_state["_rep_applied_" + key] = pick
                            st.session_state[key] = float(rv if pick == "Parser" else av)

                st.markdown("#### Values used for assessment (editable)")
                fields = [(label, key, step) for label, key, _pk, _ak, step in REPORT_FIELDS] + [
                    ("Weight (kg)", "rep_weight", 0.1),
                    ("Height (cm)", "rep_height", 0.1),
                ]
                c1, c2 = st.columns(2)
                inputs = {}
                for i, (label, key, step) in enumerate(fields):
                    with (c1 if i % 2 == 0 else c2):
                        inputs[label] = st.number_input(label, key=key,
                                                        value=float(st.session_state[key]), step=step)
                dpf = st.number_input("DiabetesPedigreeFunction (family history score)", 0.0, 2.5,
                                      float(st.session_state["rep_dpf"]), 0.01, key="rep_dpf")

                if st.button("Assess from report", type="primary"):
                    w = inputs["Weight (kg)"]; h = inputs["Height (cm)"]
                    bmi_val = (float(w) / ((float(h) / 100.0) ** 2)) if (w and h) else medians["BMI"]
                    fasting = inputs["Fasting blood sugar (mg/dL)"] or None
                    postmeal = inputs["After-meal blood sugar (mg/dL)"] or None
                    hba1c = inputs["HbA1c (%)"] or None
                    clinical = clinical_stage(fasting, postmeal, hba1c)
                    values = {
                        "Pregnancies": inputs["Pregnancies"],
                        "Glucose": inputs["After-meal blood sugar (mg/dL)"],
                        "BloodPressure": inputs["Blood pressure (systolic)"],
                        "SkinThickness": inputs["Skin thickness"],
                        "Insulin": inputs["Insulin"],
                        "BMI": bmi_val,
                        "DiabetesPedigreeFunction": dpf,
                        "Age": inputs["Age"],
                    }
                    pred, prob = fix_and_predict(values, model, scaler, medians, threshold)
                    show_result(pred, prob, values, threshold, clinical=clinical)
                    st.caption(f"Decision threshold: {threshold:.2f}.")
                    if ai.mode != "offline":
                        with st.spinner("Generating AI interpretation..."):
                            interp = chat_agent([
                                {"role": "user", "content":
                                 f"Explain this diabetes screening result to the patient in plain, "
                                 f"reassuring language. Prediction: {'diabetic' if pred else 'not diabetic'}. "
                                 f"Risk probability: {prob:.0%}. Key values: {values}. Say what the main "
                                 f"drivers are and give 2-3 concrete next steps. Remind them this is not a diagnosis."}
                            ], ai)
                        st.markdown("#### AI interpretation")
                        st.write(interp)

    # ---------------- Tab 2: Guided Intake (agent asks) ----------------
    with tab2:
        st.subheader("Guided intake — talk to the assistant")
        if ai.mode != "offline":
            st.success(f"AI assistant online ({ai.mode})")
        else:
            st.warning("AI assistant is offline — " + ai.status_detail)
        st.write("No forms to fill. Just answer the assistant's questions in your own words — "
                 "it collects what it needs and runs the assessment for you.")

        intake_mode = st.radio(
            "How would you like to proceed?",
            ["I have test results (lab values)", "No tests — assess from lifestyle"],
            horizontal=True,
        )

        # ===== Lab mode: collect the 8 clinical features =====
        if intake_mode.startswith("I have test"):
            if "intake_history" not in st.session_state:
                st.session_state.intake_history = []
                st.session_state.intake_collected = {}
            collected = st.session_state.intake_collected
            done = len(collected)
            st.progress(done / len(INTAKE_FIELDS))
            st.caption(f"Collected {done}/{len(INTAKE_FIELDS)} clinical measurements")
            if collected:
                cols = st.columns(min(len(collected), 4))
                for i, (k, v) in enumerate(collected.items()):
                    cols[i % 4].metric(k, f"{v:g}")

            if ai.mode == "offline":
                st.info("Conversational intake needs the AI provider (Qwen). Enter values manually:")
                vals = {f: st.number_input(f, value=0.0, step=1.0) for f in INTAKE_FIELDS}
                if st.button("Assess", type="primary"):
                    pred, prob = fix_and_predict(vals, model, scaler, medians, threshold)
                    clinical = clinical_stage(None, vals.get("Glucose") or None, None)
                    show_result(pred, prob, vals, threshold, clinical=clinical)
            else:
                for m in st.session_state.intake_history:
                    with st.chat_message(m["role"]):
                        st.write(m["content"])
                if prompt := st.chat_input("Your answer..."):
                    st.session_state.intake_history.append({"role": "user", "content": prompt})
                    with st.chat_message("user"):
                        st.write(prompt)
                    with st.chat_message("assistant"):
                        with st.spinner("Assistant is asking..."):
                            sys_intake = (
                                "You are a warm, professional clinical intake assistant for a diabetes "
                                "risk screening. Collect these 8 values from the patient, ONE question at "
                                "a time: Pregnancies, Glucose (after-meal blood sugar, mg/dL), BloodPressure "
                                "(systolic), SkinThickness, Insulin, BMI, DiabetesPedigreeFunction (family "
                                "history score 0-2.5), Age. Briefly explain why each matters. Be concise and "
                                "friendly. Once all values are provided, tell the patient you will assess the risk."
                            )
                            reply = chat_agent(st.session_state.intake_history, ai, system=sys_intake)
                        st.write(reply)
                    st.session_state.intake_history.append({"role": "assistant", "content": reply})
                    with st.spinner("Updating record..."):
                        new = extract_patient_fields(st.session_state.intake_history, ai)
                    if new:
                        st.session_state.intake_collected.update(new)
                    st.rerun()
                if st.button("Run risk assessment", type="primary"):
                    values = {f: st.session_state.intake_collected.get(f, 0) for f in INTAKE_FIELDS}
                    clinical = clinical_stage(None, values.get("Glucose") or None, None)
                    pred, prob = fix_and_predict(values, model, scaler, medians, threshold)
                    show_result(pred, prob, values, threshold, clinical=clinical)
                    st.caption(f"Decision threshold: {threshold:.2f}. Missing values were filled with dataset medians.")

        # ===== Lifestyle mode: no lab tests required =====
        else:
            st.write("Perfect if you don't know your BMI or blood sugar. The assistant asks simple "
                     "lifestyle questions (age, height, weight, activity, diet, family history) and "
                     "estimates your risk — **no blood test needed**.")
            if "life_history" not in st.session_state:
                st.session_state.life_history = []
                st.session_state.life_collected = {}

            life = st.session_state.life_collected
            needed = ["age", "sex", "height_cm", "weight_kg", "activity_high", "veg_daily", "bp_issue", "high_sugar_history", "family_history"]
            done = sum(1 for k in needed if k in life)
            st.progress(done / len(needed))
            st.caption(f"Collected {done}/{len(needed)} lifestyle details")
            if life:
                chips = "".join(
                    f'<span class="chip"><b>{k}:</b> {life[k]}</span>' for k in needed if k in life
                )
                st.markdown(f'<div class="chip-row">{chips}</div>', unsafe_allow_html=True)

            symptoms = st.multiselect(
                "Any of these symptoms? (helps flag urgent cases)",
                options=list(RED_FLAG_SYMPTOMS.keys()),
                format_func=lambda s: RED_FLAG_SYMPTOMS[s],
            )

            if ai.mode == "offline":
                st.info("Conversational intake needs the AI provider (Qwen). Enter details manually:")
                age = st.number_input("Age", 0, 120, 45)
                sex = st.selectbox("Sex", ["male", "female"])
                h = st.number_input("Height (cm)", 100, 220, 165)
                w = st.number_input("Weight (kg)", 30, 250, 70)
                waist = st.number_input("Waist (cm, optional)", 0, 200, 0)
                activity_high = st.checkbox("Exercise >=30 min most days")
                veg_daily = st.checkbox("Eat vegetables/fruit daily")
                bp_issue = st.checkbox("High BP / on BP medication")
                high_sugar = st.checkbox("Ever told high blood sugar")
                fh = st.selectbox("Family history", ["none", "young", "older"])
                if st.button("Assess lifestyle risk", type="primary"):
                    life = {"age": age, "sex": sex, "height_cm": h, "weight_kg": w,
                            "waist_cm": waist or None, "activity_high": activity_high,
                            "veg_daily": veg_daily, "bp_issue": bp_issue,
                            "high_sugar_history": high_sugar, "family_history": fh}
                    run_lifestyle_assessment(life, symptoms, model, scaler, medians, threshold)
            else:
                for m in st.session_state.life_history:
                    with st.chat_message(m["role"]):
                        st.write(m["content"])
                if prompt := st.chat_input("Your answer..."):
                    st.session_state.life_history.append({"role": "user", "content": prompt})
                    with st.chat_message("user"):
                        st.write(prompt)
                    with st.chat_message("assistant"):
                        with st.spinner("Assistant is asking..."):
                            sys_life = (
                                "You are a warm, professional lifestyle-intake assistant for a diabetes "
                                "risk screen that needs NO lab tests. Collect these details from the patient, "
                                "ONE question at a time: age, sex, height, weight, waist (optional), whether "
                                "they exercise 30+ min most days, whether they eat vegetables/fruit daily, "
                                "whether they have high blood pressure or take BP medication, whether they were "
                                "ever told they had high blood sugar, and family history of diabetes (none / "
                                "relative diagnosed under 50 / relative diagnosed 50+ or on medication). "
                                "Never ask for blood sugar numbers. Be friendly and concise."
                            )
                            reply = chat_agent(st.session_state.life_history, ai, system=sys_life)
                        st.write(reply)
                    st.session_state.life_history.append({"role": "assistant", "content": reply})
                    with st.spinner("Updating record..."):
                        new = extract_lifestyle(st.session_state.life_history, ai)
                    if new:
                        st.session_state.life_collected.update(new)
                    st.rerun()
                if st.button("Assess lifestyle risk", type="primary"):
                    run_lifestyle_assessment(life, symptoms, model, scaler, medians, threshold)

    # ---------------- Tab 3: Model Analytics ----------------
    with tab3:
        st.markdown(
            """
            <div class="result-card">
              <h3>How accurate is the deployed model?</h3>
              <div class="risk-headline">
                <span class="risk-score">0.82</span>
                <span class="risk-cat cat-mod">ROC-AUC</span>
              </div>
              <p style="font-size:13px;color:#2B3A42;margin-top:8px;">
                On the 154-patient test set (54 actually diabetic), at threshold 0.31:
                <b>accuracy 76.6%</b>, <b>sensitivity 81.5%</b> (catches ~8 of 10 diabetics),
                <b>specificity 74.0%</b>, <b>precision 62.9%</b>, <b>NPV 88.1%</b>.
                This is a screening tool — a positive result should be confirmed with a
                fasting glucose / HbA1c test, per WHO &amp; IDF guidance.
              </p>
            </div>
            """,
            unsafe_allow_html=True,
        )
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

    # ---------------- Tab 4: AI Clinical Assistant ----------------
    with tab4:
        st.subheader("AI Clinical Assistant")
        provider = ai.mode if ai.mode != "offline" else "Offline fallback"
        if ai.mode == "offline":
            st.warning("AI assistant is offline — " + ai.status_detail)
        else:
            st.caption(f"AI engine: **{provider}** — conversational analysis, patient-context "
                       "enrichment, and live guideline research.")
        st.caption("🔒 Your messages go to the AI provider (Alibaba MaaS) only to generate a reply; "
                   "this app does not store them.")
        tool = st.radio("Choose a tool", ["Chat", "Enrich patient data", "Web research"])

        if tool == "Chat":
            st.write("Ask anything about diabetes risk, the screening features, or lifestyle.")
            report_img = st.file_uploader(
                "Attach a lab-report photo (optional) — it is read via OCR, never sent as an image",
                type=["png", "jpg", "jpeg"],
            )
            if report_img:
                with st.spinner("Reading photo with OCR..."):
                    ocr_text = extract_text_from_image(report_img)
                if ocr_text.strip():
                    st.session_state.ai_report_text = ocr_text
                    with st.expander("OCR text read from your photo"):
                        st.text(ocr_text[:2000])
                    st.caption("Photo read. Ask a question and the extracted values will be included.")
                else:
                    st.warning("Could not read text from that photo — use a clear, well-lit image or a scan.")
            for m in st.session_state.ai_messages:
                with st.chat_message(m["role"]):
                    st.write(m["content"])
            if prompt := st.chat_input("Type your question..."):
                content = prompt
                if st.session_state.get("ai_report_text"):
                    content = (
                        "The user attached a lab report photo. OCR-extracted text:\n"
                        + st.session_state.ai_report_text
                        + "\n\nUser question: " + prompt
                    )
                    st.session_state.ai_report_text = ""
                st.session_state.ai_messages.append({"role": "user", "content": content})
                with st.chat_message("user"):
                    st.write(prompt)
                with st.chat_message("assistant"):
                    with st.spinner("Thinking..."):
                        reply = chat_agent(st.session_state.ai_messages, ai)
                    st.write(reply)
                st.session_state.ai_messages.append({"role": "assistant", "content": reply})

        elif tool == "Enrich patient data":
            st.write("Describe the patient's lifestyle in your own words. The AI synthesizes "
                     "extra contextual risk factors and dynamic, personalized tips beyond the 8 screening values.")
            desc = st.text_area("Lifestyle description",
                                "45-year-old office worker, mostly sedentary, eats a lot of fast food, "
                                "smokes, sleeps about 5 hours, high stress.")
            base_glucose = st.number_input("Known after-meal glucose (optional, 0 = unknown)", 0, 300, 0)
            base_bmi = st.number_input("Known BMI (optional, 0 = unknown)", 0.0, 70.0, 0.0)
            if st.button("Enrich with AI", type="primary"):
                base = {}
                if base_glucose:
                    base["Glucose"] = base_glucose
                if base_bmi:
                    base["BMI"] = base_bmi
                with st.spinner("Synthesizing context..."):
                    enriched = enrich_patient_data(desc, base, ai)
                st.markdown("#### Synthesized context")
                cols = st.columns(3)
                labels = {
                    "physical_activity": "Activity", "diet_quality": "Diet",
                    "sleep_hours": "Sleep (h)", "stress_level": "Stress",
                    "smoking": "Smoking", "alcohol": "Alcohol",
                }
                for i, (k, lab) in enumerate(labels.items()):
                    with cols[i % 3]:
                        st.metric(lab, enriched.get(k, "—"))
                if enriched.get("summary"):
                    st.markdown(f"**Summary:** {enriched['summary']}")
                st.markdown("#### Dynamic, personalized tips")
                for tip in enriched.get("dynamic_tips", []):
                    st.write(f"- {tip}")

        elif tool == "Web research":
            st.write("Get the latest diabetes risk & prevention guidance from the web.")
            query = st.text_input("Research topic", "latest diabetes prevention guidelines 2025")
            if st.button("Search the web", type="primary"):
                with st.spinner("Researching..."):
                    research = web_research_agent(query, ai)
                st.markdown(research)

    st.markdown("---")
    st.caption("Diabetes Risk Intelligence · for screening & education only, not a diagnosis.")
    st.markdown("🔗 [View source on GitHub](https://github.com/sam-black007/diabetes-prediction)")

if __name__ == "__main__":
    main()