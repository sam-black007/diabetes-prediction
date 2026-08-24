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
from clinical_rules import (
    classify_glucose, classify_bp, compute_bmi, classify_lipids,
    aggregate_evidence, severity_rank,
)
from ml_risk import predict_with_model

# Resilient AI-module binding: during a Streamlit Cloud rebuild the app can
# momentarily load against a stale module version. Bind each function
# individually so only genuinely-missing features degrade — never the app.
import importlib as _importlib
_ai_mod = None
_ai_missing = []
try:
    import ai_agents as _ai_mod
    _ai_mod = _importlib.reload(_ai_mod)
except Exception as _e:
    _ai_missing.append(f"module load: {type(_e).__name__}: {_e}")


class _OfflineAIClient:
    mode = "offline"
    status_detail = "AI module unavailable on this server"

    def chat(self, messages, system="", temperature=0.3):
        return "The AI assistant is temporarily unavailable on this server."

    def complete(self, prompt, system="", temperature=0.3):
        return "The AI assistant is temporarily unavailable on this server."


INTAKE_FIELDS = ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
                 "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"]


def _bind(name, fallback):
    if _ai_mod is not None and hasattr(_ai_mod, name):
        return getattr(_ai_mod, name)
    _ai_missing.append(name)
    return fallback


AIClient = _bind("AIClient", _OfflineAIClient)
chat_agent = _bind("chat_agent",
                   lambda *a, **k: "The AI assistant is temporarily unavailable on this server.")
enrich_patient_data = _bind("enrich_patient_data", lambda *a, **k: {})
web_research_agent = _bind("web_research_agent",
                           lambda *a, **k: "Web research is temporarily unavailable.")
extract_patient_fields = _bind("extract_patient_fields", lambda *a, **k: {})
extract_lifestyle = _bind("extract_lifestyle", lambda *a, **k: {})
assess_diabetes_risk = _bind("assess_diabetes_risk", lambda *a, **k: {})
collect_missing_fields = _bind("collect_missing_fields", lambda *a, **k: {})
validate_and_explain_report = _bind("validate_and_explain_report",
                                    lambda *a, **k: ({}, [], "", []))
suggest_next_steps = _bind("suggest_next_steps", lambda *a, **k: [])
suggest_missing_values = _bind("suggest_missing_values", lambda *a, **k: {})
if _ai_mod is not None:
    INTAKE_FIELDS = getattr(_ai_mod, "INTAKE_FIELDS", INTAKE_FIELDS)

if _ai_missing:
    st.warning("Some AI features are still updating on the server (missing: "
               + ", ".join(sorted(set(_ai_missing))) + "). Everything else keeps "
               "working — reboot from Manage app if this message persists.")
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

def determine_verdict(fasting, postmeal, hba1c):
    """Rule-based WHO/ADA conclusion via the centralized clinical engine.

    Returns {"state", "detail", "need"} where state is one of
    "Diabetic" | "Prediabetic" | "Normal" | "Inconclusive".
    """
    rules = []
    if fasting is not None:
        rules.append(classify_glucose(fasting, "fasting"))
    if postmeal is not None:
        rules.append(classify_glucose(postmeal, "postmeal2h"))
    if hba1c is not None:
        rules.append(classify_glucose(hba1c, "hba1c"))
    if not rules:
        return {"state": "Inconclusive",
                "detail": "No blood-sugar values (glucose or HbA1c) were found.",
                "need": ["fasting glucose, after-meal glucose or HbA1c"]}
    worst = max(rules, key=lambda r: severity_rank(r["severity"]))
    cat = worst["category"]
    if cat == "diabetes_range":
        state = "Diabetic"
    elif cat in ("prediabetes", "needs_confirmation"):
        state = "Prediabetic"
    else:
        state = "Normal"
    need = [] if (hba1c is not None and hba1c >= 5.7) else ["HbA1c"]
    return {"state": state, "detail": worst["interpretation"], "need": need}


def clinical_stage(fasting, postmeal, hba1c):
    """Back-compat wrapper returning (stage_label, explanation).

    Delegates to the centralized engine so thresholds live in one place.
    """
    dv = determine_verdict(fasting, postmeal, hba1c)
    label = {"Diabetic": "Diabetes range", "Prediabetic": "Prediabetes range",
             "Normal": "Normal / low range", "Inconclusive": "Inconclusive"}.get(dv["state"], "Normal / low range")
    return (label, dv["detail"])


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
        known = rv is not None or av is not None
        st.session_state["_rep_known_" + key] = known
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


# Values the AI needs for a confident verdict; 0/None means "not provided".
REQUIRED_FOR_ASSESSMENT = ["Glucose", "Age"]


def _missing_required(values):
    return [k for k in REQUIRED_FOR_ASSESSMENT
            if not values.get(k) or float(values.get(k) or 0) <= 0]


def _assumed_values(values):
    """Fields we filled with typical averages because the report lacked them."""
    return [k for k, v in values.items()
            if k not in REQUIRED_FOR_ASSESSMENT and (not v or float(v or 0) == 0)]


def ai_assess(values, ai, context=None):
    """AI-agent diabetes verdict; asks for missing data instead of guessing.

    Returns (res, missing_names). res is {} when required values are absent.
    Falls back to WHO/ADA threshold rules if the AI service is offline.
    """
    missing = _missing_required(values)
    if missing:
        return {}, missing
    res = {}
    if ai.mode != "offline":
        try:
            res = assess_diabetes_risk(values, ai, context=context) or {}
        except Exception:
            res = {}
    if not res.get("verdict"):
        stage, _detail = clinical_stage(None, values.get("Glucose") or None,
                                        values.get("HbA1c") or None)
        pred = "diabetic" if stage == "Diabetes range" else "not diabetic"
        prob = {"Diabetes range": 0.85, "Prediabetes range": 0.55}.get(stage, 0.15)
        res = {"verdict": pred, "probability": prob,
               "reasoning": f"Offline rule-based check ({stage}). Configure the "
                            f"Google API key for the full AI assessment.",
               "next_steps": [], "missing": []}
    assumed = _assumed_values(values)
    if assumed and res.get("reasoning"):
        res["reasoning"] += (" Note: " + ", ".join(assumed) +
                             " was not provided, so a typical average was assumed.")
    return res, []


def show_result(pred, prob, values, threshold, clinical=None, ml=None):
    """Render the result: clinical rules + AI verdict + separate ML screening estimate."""
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
      <h3>AI screening result</h3>
      <div class="risk-headline">
        <span class="risk-score">{prob:.0%}</span>
        <span class="risk-cat {cat_class}">{label}</span>
      </div>
      <p>Estimated probability of diabetes — assessed by the AI agent from your values.</p>
      <div class="bar-track"><div class="bar-fill" style="width:{int(prob * 100)}%"></div></div>
      <div class="chip-row">{chips}</div>
    </div>
    ''', unsafe_allow_html=True)
    if ml is not None:
        ml_label = ("Elevated model-estimated risk" if ml["score"] >= threshold
                    else "Lower model-estimated risk")
        ml_class = "cat-high" if ml["score"] >= threshold else "cat-low"
        st.markdown(f'''
        <div class="result-card" style="border-left:4px solid #6C5CE7">
          <h3>ML screening model (PIMA Random Forest)</h3>
          <div class="risk-headline">
            <span class="risk-score">{ml['score']:.0%}</span>
            <span class="risk-cat {ml_class}">{ml_label}</span>
          </div>
          <p>Model-estimated risk score only — NOT a diagnosis and NOT clinically
          validated. Recall is weak (~61%); treat as a supplementary screen.</p>
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

/* Landing page */
.landing-hero { text-align: center; padding: 48px 20px 32px; }
.landing-hero h1 { font-size: 34px; font-weight: 700; color: #16242B; margin: 0 0 8px; letter-spacing: -0.5px; }
.landing-hero .sub { font-size: 17px; color: #7A8B93; margin: 0 auto 36px; max-width: 520px; line-height: 1.5; }
.landing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin: 0 auto 32px; max-width: 720px; }
.landing-card {
    background: #FFFFFF; border: 1px solid #E3EBEF; border-radius: 16px;
    padding: 28px 18px; text-align: center; cursor: pointer;
    transition: all 0.2s ease; text-decoration: none; display: block;
}
.landing-card:hover { border-color: #0E7C86; box-shadow: 0 8px 24px rgba(14,124,134,0.12); transform: translateY(-2px); }
.landing-card .icon { font-size: 38px; margin-bottom: 14px; display: block; }
.landing-card h3 { margin: 0 0 6px; font-size: 16px; color: #16242B; font-weight: 600; }
.landing-card p { margin: 0; font-size: 13px; color: #7A8B93; line-height: 1.4; }
.landing-quick { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; margin-bottom: 28px; }
.landing-pill {
    background: #F2F6F8; border: 1px solid #E3EBEF; border-radius: 999px;
    padding: 8px 16px; font-size: 13px; color: #41565F; cursor: pointer;
    transition: all 0.15s ease; text-decoration: none;
}
.landing-pill:hover { background: #0E7C86; color: #FFFFFF; border-color: #0E7C86; }
.back-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.back-bar button { background: #F2F6F8; border: 1px solid #E3EBEF; border-radius: 8px; padding: 6px 14px; font-size: 13px; color: #41565F; cursor: pointer; font-weight: 500; }
.back-bar button:hover { background: #0E7C86; color: #FFFFFF; border-color: #0E7C86; }

/* Mobile-first responsive */
@media (max-width: 768px) {
    .landing-grid { grid-template-columns: 1fr; max-width: 100%; }
    .landing-hero h1 { font-size: 26px; }
    .landing-hero .sub { font-size: 15px; }
    .hero { flex-direction: column; text-align: center; padding: 20px 16px; }
    .hero h1 { font-size: 22px; }
    .hero-art { margin: 0 auto; width: 100px; }
    .trust-strip { flex-direction: column; gap: 6px; }
    .step-strip { flex-direction: column; }
    .result-card { padding: 16px 14px; }
    .risk-score { font-size: 32px; }
    .chip-row { gap: 6px; }
    .chip { font-size: 12px; padding: 4px 8px; }
    [data-testid="stMetric"] { padding: 8px 10px; }
    .stTabs [data-baseweb="tab"] { padding: 7px 12px; font-size: 13px; }
}
@media (max-width: 480px) {
    .landing-hero h1 { font-size: 22px; }
    .landing-card { padding: 18px 12px; }
    .landing-card .icon { font-size: 28px; }
    .landing-card h3 { font-size: 14px; }
}

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

    # AI-agent lifestyle estimate (no lab values in this flow, by design)
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
    res = {}
    if ai.mode != "offline":
        with st.spinner("AI agent is assessing lifestyle risk..."):
            try:
                res = assess_diabetes_risk(
                    values, ai,
                    context="No lab tests available — lifestyle-only screening estimate.",
                ) or {}
            except Exception:
                res = {}
    prob = res.get("probability")
    if prob is None:
        prob = {"High risk": 0.70, "Moderate": 0.50, "Slightly elevated": 0.35}.get(fr["category"], 0.20)

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
      <h3>AI lifestyle estimate</h3>
      <p>AI-agent probability of diabetes (lifestyle only, no lab values): <b>{prob:.0%}</b></p>
      <div class="bar-track"><div class="bar-fill" style="width:{int(prob*100)}%"></div></div>
      <p style="font-size:12.5px;color:#7A8B93;margin-top:8px">Indicative only — a blood test (fasting glucose or HbA1c) gives a far more reliable answer.</p>
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

    if "page" not in st.session_state:
        st.session_state.page = "home"
    page = st.session_state.page

    if page == "home":
        # ---- Landing page ----
        st.markdown(
            '<div class="landing-hero">'
            '<h1>Diabetes Risk Intelligence</h1>'
            '<p class="sub">Understand your health measurements, identify risk factors, '
            'and know what to check next.</p>'
            '</div>',
            unsafe_allow_html=True,
        )

        c1, c2, c3 = st.columns(3)
        with c1:
            if st.button("Check My Health", key="home_check", use_container_width=True):
                st.session_state.page = "check"
                st.rerun()
        with c2:
            if st.button("Upload Medical Report", key="home_report", use_container_width=True):
                st.session_state.page = "report"
                st.rerun()
        with c3:
            if st.button("Ask AI Assistant", key="home_ai", use_container_width=True):
                st.session_state.page = "assistant"
                st.rerun()

        st.markdown(
            '<div class="landing-grid">'
            '<div class="landing-card" style="pointer-events:none;">'
            '<span class="icon">🩸</span><h3>Glucose</h3>'
            '<p>Fasting, post-meal, HbA1c, OGTT</p></div>'
            '<div class="landing-card" style="pointer-events:none;">'
            '<span class="icon">🫀</span><h3>Blood Pressure</h3>'
            '<p>SBP / DBP with OR-logic</p></div>'
            '<div class="landing-card" style="pointer-events:none;">'
            '<span class="icon">🧪</span><h3>Lab Report</h3>'
            '<p>Upload PDF or image — OCR reads it</p></div>'
            '</div>',
            unsafe_allow_html=True,
        )

        st.markdown(
            '<div style="text-align:center;margin-top:8px;">'
            '<span style="font-size:13px;color:#7A8B93;">Screening only — not a diagnosis &nbsp;·&nbsp; '
            'Based on ADA 2026 &amp; AHA/ACC 2025 &nbsp;·&nbsp; No registration required</span>'
            '</div>',
            unsafe_allow_html=True,
        )

    else:
        # ---- Module pages with back button ----
        if st.button("← Home", key="back_home"):
            st.session_state.page = "home"
            st.rerun()

    # ---------------- Module: Medical Report ----------------
    if page == "report":
        st.subheader("Import lab report (PDF / image)")
        st.write("Upload a blood test report — **PDF, photo, or scanned image** (PNG/JPG). "
                 "Values are read automatically (OCR) and a risk assessment is generated instantly, "
                 "with an AI interpretation of the result. Your image is processed with OCR on our "
                 "server and is **never sent to the AI model** (it has no vision).")
        report = st.file_uploader("Choose a report (PDF or image)", type=["pdf", "png", "jpg", "jpeg"])
        pasted = st.text_area("…or paste the report text / values here if the photo won't read",
                              key="report_paste")
        if not report and not pasted.strip():
            st.markdown(
                '<div style="background:#F2F6F8;border:1px solid #D8E2E7;border-radius:12px;'
                'padding:24px 20px;text-align:center;margin:12px 0;">'
                '<div style="font-size:28px;margin-bottom:8px;">📄</div>'
                '<div style="font-size:15px;font-weight:600;color:#16242B;margin-bottom:4px;">No report uploaded yet</div>'
                '<div style="font-size:13px;color:#7A8B93;">Upload a PDF or photo, or paste the report text above to get started.</div>'
                '</div>',
                unsafe_allow_html=True,
            )
        if report is not None or pasted.strip():
            is_image = bool(report) and report.name.lower().endswith((".png", ".jpg", ".jpeg"))
            if is_image:
                st.image(report, caption="Uploaded report photo", width=400)
            sig = (report.name, getattr(report, "size", None)) if report is not None else ("pasted", hash(pasted.strip()))
            if st.session_state.get("_rep_sig") != sig:
                with st.spinner("Step 1/3 — Reading report with OCR..."):
                    text = ""
                    if report is not None:
                        text = extract_text_from_image(report) if is_image else extract_text_from_pdf(report)
                    if pasted.strip():
                        text = (text + "\n" + pasted.strip()).strip() if text else pasted.strip()
                    parsed = parse_report(text)
                    # The AI review (validation cross-check + explanation) is done
                    # ONCE at the conclusion step below, so a report needs only a
                    # single LLM call instead of two.
                    ai_vals, corrections = {}, []
                    st.session_state.update({
                        "_rep_sig": sig, "_rep_text": text, "_rep_parsed": parsed,
                        "_rep_ai_vals": ai_vals, "_rep_corrections": corrections,
                    })
                    _init_report_fields(parsed, ai_vals, medians)
                    for k in list(st.session_state.keys()):
                        if k.startswith("_ans_") or k in ("_rep_expl", "_rep_comb"):
                            del st.session_state[k]
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
                st.markdown(
                    '<div style="background:#E6F4EA;border:1px solid #B7E1C7;border-radius:10px;'
                    'padding:12px 16px;margin-bottom:14px;font-size:14px;color:#1E7A3C;font-weight:500;">'
                    'Report analyzed — review detected values below, then adjust if needed.</div>',
                    unsafe_allow_html=True,
                )
                # Per-field confidence indicators
                conf_rows = []
                for label, _sk, pk, ak, _step in REPORT_FIELDS:
                    pv = parsed.get(pk)
                    av = ai_vals.get(ak)
                    if pv is not None and av is not None:
                        if _reads_conflict(pv, av):
                            icon, note = "🟡", "parser & AI disagree — please verify"
                        else:
                            icon, note = "🟢", "clearly detected"
                        val = f"{pv:g}"
                    elif pv is not None:
                        icon, note = "🟢", "detected"
                        val = f"{pv:g}"
                    elif av is not None:
                        icon, note = "🟡", "AI estimated — please verify"
                        val = f"{av:g}"
                    else:
                        icon, note = "🔴", "could not read"
                        val = "—"
                    conf_rows.append(
                        f'<div style="display:flex;justify-content:space-between;align-items:center;'
                        f'padding:7px 0;border-bottom:1px solid #F0F2F4;">'
                        f'<div style="font-size:13px;color:#41565F;">{icon} {label}</div>'
                        f'<div style="font-size:14px;font-weight:600;color:#16242B;">{val}'
                        f' <span style="font-size:11px;color:#7A8B93;font-weight:400;">{note}</span></div>'
                        f'</div>'
                    )
                n_found = sum(1 for r in conf_rows if "🟢" in r or "🟡" in r)
                st.markdown(
                    f'<div style="background:#fff;border:1px solid #E3EBEF;border-radius:12px;'
                    f'padding:12px 18px;margin:0 0 14px;">'
                    f'<div style="font-size:13px;color:#7A8B93;margin-bottom:6px;">'
                    f'{n_found}/{len(conf_rows)} values detected</div>'
                    + "".join(conf_rows) + '</div>',
                    unsafe_allow_html=True,
                )

                # ---- §25 Review detected values ----
                st.markdown(
                    '<div style="font-size:14px;font-weight:600;color:#16242B;margin:12px 0 8px;">'
                    'Review detected values — adjust if OCR read incorrectly</div>',
                    unsafe_allow_html=True,
                )
                _rev_cols = st.columns(3)
                _rev_idx = 0
                for label, key, pk, ak, step in REPORT_FIELDS:
                    pv = parsed.get(pk)
                    av = ai_vals.get(ak)
                    current = st.session_state.get(key)
                    val_to_show = current if current not in (None, 0) else (pv if pv is not None else av)
                    with _rev_cols[_rev_idx % 3]:
                        new_val = st.number_input(
                            label, min_value=0.0, max_value=9999.0,
                            value=float(val_to_show) if val_to_show else 0.0,
                            step=step, key=f"_rev_{key}",
                            help="Detected from report — edit if incorrect",
                        )
                        if new_val and new_val > 0:
                            st.session_state[key] = new_val
                    _rev_idx += 1

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

                # ---- Smart-minimal missing set: what the report didn't say ----
                def _known(k):
                    return bool(st.session_state.get("_rep_known_" + k))

                has_bmi = bool(parsed.get("bmi") or ai_vals.get("bmi"))
                sex_rep = parsed.get("sex")

                def _known_ctx():
                    """Values the AI already knows, to ground missing-value suggestions."""
                    ctx = {}
                    for rk, fk in [("rep_age", "age"), ("rep_fasting", "fasting"),
                                   ("rep_postmeal", "postmeal"), ("rep_hba1c", "hba1c")]:
                        if _known(rk):
                            ctx[fk] = st.session_state[rk]
                    if sex_rep:
                        ctx["sex"] = sex_rep
                    for f in ("age", "sex", "height", "weight", "hba1c", "postmeal"):
                        av = st.session_state.get("_ans_" + f)
                        if av not in (None, "", 0):
                            ctx[f] = float(av) if isinstance(av, (int, float)) else av
                    return ctx
                fasting_v = st.session_state["rep_fasting"] if _known("rep_fasting") else None
                postmeal_v = st.session_state["rep_postmeal"] if _known("rep_postmeal") else None
                hba1c_v = st.session_state["rep_hba1c"] if _known("rep_hba1c") else None
                pre_outcome = determine_verdict(fasting_v, postmeal_v, hba1c_v)

                missing_items = []  # (field_id, question)
                if not sex_rep and st.session_state.get("_ans_sex") is None:
                    missing_items.append(("sex", "Are you male or female?"))
                if not _known("rep_age"):
                    missing_items.append(("age", "What is your age?"))
                if not has_bmi:
                    missing_items.append(("height", "Your height (in cm)?"))
                    missing_items.append(("weight", "Your weight (in kg)?"))
                if pre_outcome["state"] == "Prediabetic" and "HbA1c" in pre_outcome["need"]:
                    missing_items.append(("hba1c", "Your glucose is borderline — do you know your HbA1c (%)? (leave 0 if unknown)"))
                if pre_outcome["state"] == "Inconclusive":
                    missing_items.append(("postmeal", "No blood-sugar value was found on the report. What was your latest after-meal glucose (mg/dL)? (0 = don't know)"))

                # Chat Q&A: the agent parses a free-text reply into the same slots
                if missing_items:
                    chat_reply = st.chat_input("…or just answer in your own words")
                    if chat_reply:
                        with st.spinner("Reading your answer..."):
                            try:
                                got = collect_missing_fields(
                                    chat_reply, [fid for fid, _q in missing_items], ai
                                ) or {}
                            except Exception:
                                got = {}
                            # Unknown values are intentionally NOT fabricated — if the
                            # user doesn't know, the slot simply stays blank and the
                            # screen proceeds with the values it has.
                            if not got:
                                low = chat_reply.lower()
                                if any(w in low for w in
                                       ["don't know", "dont know", "unknown",
                                        "not sure", "idk", "no idea", "skip"]):
                                    st.info("No problem — the values you don't know are "
                                            "left blank; the screen uses what you provided.")
                        for k, v in got.items():
                            st.session_state["_ans_" + k] = v

                # Compact form listing ONLY the items still unanswered
                still_open = [f for f, _q in missing_items
                              if st.session_state.get("_ans_" + f) in (None, "", 0)]
                if still_open:
                    st.markdown("#### 🤖 The assistant needs a few more details")
                    st.caption("Answer in your own words above, or fill the quick fields "
                               "below. Values you leave blank stay unknown — the screen "
                               "uses only what you provide.")
                    for fid, q in missing_items:
                        if fid not in still_open:
                            continue
                        if fid == "sex":
                            st.radio(q, ["male", "female"], horizontal=True, key="_ans_sex")
                        elif fid == "age":
                            st.number_input(q, 1, 120, key="_ans_age")
                        elif fid == "height":
                            st.number_input(q, 50.0, 250.0, key="_ans_height")
                        elif fid == "weight":
                            st.number_input(q, 10.0, 300.0, key="_ans_weight")
                        elif fid == "hba1c":
                            st.number_input(q, 0.0, 20.0, step=0.1, key="_ans_hba1c")
                        elif fid == "postmeal":
                            st.number_input(q, 0.0, 600.0, key="_ans_postmeal")
                    st.info("Tip: leave a field blank if you don't know it — the screen "
                            "uses only the values you provide and flags the rest.")

                def _val(fid):
                    v = st.session_state.get("_ans_" + fid)
                    if v in (None, "", 0):
                        return None
                    return float(v) if isinstance(v, (int, float)) else v

                age_eff = st.session_state["rep_age"] if _known("rep_age") else _val("age")
                sex_eff = sex_rep or _val("sex")
                h_eff = st.session_state["rep_height"] if has_bmi else _val("height")
                w_eff = st.session_state["rep_weight"] if has_bmi else _val("weight")
                bmi_val = (float(w_eff) / ((float(h_eff) / 100.0) ** 2)) if (w_eff and h_eff) else medians["BMI"]
                eff_fast = fasting_v
                eff_pp = postmeal_v or _val("postmeal")
                eff_a1c = hba1c_v or _val("hba1c")

                outcome = determine_verdict(eff_fast, eff_pp, eff_a1c)

                # ---- Conclude card: thresholds decided, AI explains ----
                state_styles = {"Diabetic": ("cat-high", "🩸 Diabetes range"),
                                "Prediabetic": ("cat-mod", "⚠️ Prediabetes range"),
                                "Normal": ("cat-low", "✅ Normal range")}
                chips = "".join(f'<span class="chip"><b>{k}:</b> {v}</span>'
                                for k, v in {
                                    "Age": age_eff, "Sex": sex_eff,
                                    "BMI": round(bmi_val, 1),
                                    "Fasting": eff_fast, "After-meal": eff_pp,
                                    "HbA1c": eff_a1c}.items() if v not in (None, 0))
                if outcome["state"] in state_styles:
                    cat, badge = state_styles[outcome["state"]]
                    st.markdown(f'''
                    <div class="result-card">
                      <h3>Clinical conclusion (WHO/ADA)</h3>
                      <div class="risk-headline">
                        <span class="risk-cat {cat}">{badge}</span>
                      </div>
                      <p>{outcome["detail"]}</p>
                      <div class="chip-row">{chips}</div>
                    </div>
                    ''', unsafe_allow_html=True)
                    if ai.mode != "offline":
                        # Single combined AI call: validates the parser values AND
                        # explains the WHO/ADA conclusion (was two separate calls).
                        comb_key = str(hash((outcome["state"], outcome["detail"],
                                             eff_fast, eff_pp, eff_a1c,
                                             age_eff, sex_eff, bmi_val,
                                             json.dumps(parsed, sort_keys=True))))
                        cached = st.session_state.get("_rep_comb") or ()
                        comb = cached[1] if cached and cached[0] == comb_key else None
                        if not comb:
                            with st.spinner("Step 2/3 — AI agent validating detected values..."):
                                try:
                                    comb = validate_and_explain_report(
                                        parsed, outcome,
                                        {"age": age_eff, "sex": sex_eff, "bmi": bmi_val,
                                         "fasting_glucose_mg_dl": eff_fast,
                                         "after_meal_glucose_mg_dl": eff_pp,
                                         "hba1c_pct": eff_a1c},
                                        ocr_text=text, client=ai)
                                except Exception as e:
                                    comb = ({}, [], "", [])
                                    st.warning("AI validation unavailable — results are based on OCR only. "
                                               "Try again or check your API key.")
                            st.session_state["_rep_comb"] = (comb_key, comb)
                        ai_vals2, corrections2, expl, next_steps = comb
                        if corrections2:
                            with st.expander("Show AI corrections (parser vs AI)"):
                                for c in corrections2:
                                    st.write(f"- **{c.get('field')}**: parser {c.get('regex_value')} "
                                             f"→ AI {c.get('ai_value')} — {c.get('reason', '')}")
                        if expl:
                            st.markdown("#### AI agent explanation")
                            st.write(expl)
                        # Personalized next steps come from the SAME AI call above
                        # (keeps the whole conclusion under the 15s budget).
                        if next_steps:
                            st.markdown("#### ✅ Your personalized next steps")
                            for t in next_steps:
                                st.write(f"- {t}")
                else:
                    st.warning("Inconclusive — " + outcome["detail"])
                    skip = st.button("Assess anyway (low confidence)", type="secondary")

    # ---------------- Module: Quick Health Check ----------------
    if page == "check":
        st.subheader("Quick Health Check")
        st.write("A fast screen from a few self-known values. Clinical rules run locally "
                 "and deterministically; the AI only explains the result. This is screening, "
                 "not a diagnosis.")
        st.markdown(
            '<div style="display:flex;align-items:center;gap:0;margin:8px 0 18px;">'
            '<div style="text-align:center;flex:1;">'
            '<div style="width:28px;height:28px;border-radius:50%;background:#0E7C86;color:#fff;'
            'display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;">1</div>'
            '<div style="font-size:12px;color:#16242B;font-weight:600;margin-top:4px;">Basics</div></div>'
            '<div style="flex:0 0 auto;width:40px;height:2px;background:#D8E2E7;margin:0 -4px 18px;"></div>'
            '<div style="text-align:center;flex:1;">'
            '<div style="width:28px;height:28px;border-radius:50%;background:#F2F6F8;border:2px solid #D8E2E7;'
            'color:#7A8B93;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;">2</div>'
            '<div style="font-size:12px;color:#7A8B93;margin-top:4px;">Optional details</div></div>'
            '<div style="flex:0 0 auto;width:40px;height:2px;background:#D8E2E7;margin:0 -4px 18px;"></div>'
            '<div style="text-align:center;flex:1;">'
            '<div style="width:28px;height:28px;border-radius:50%;background:#F2F6F8;border:2px solid #D8E2E7;'
            'color:#7A8B93;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;">3</div>'
            '<div style="font-size:12px;color:#7A8B93;margin-top:4px;">Results</div></div>'
            '</div>',
            unsafe_allow_html=True,
        )
        with st.expander("Basic check", expanded=True):
            st.write("Just a few values — fill what you know, leave the rest blank.")
            c1, c2 = st.columns(2)
            with c1:
                q_weight = st.number_input("Weight (kg)", min_value=2.0, max_value=400.0,
                                           value=None, step=0.5, key="qc_weight")
                q_height = st.number_input("Height (cm)", min_value=50.0, max_value=260.0,
                                           value=None, step=0.5, key="qc_height")
                q_bp = st.text_input("Blood pressure (e.g. 120/80)", key="qc_bp",
                                     placeholder="120/80")
            with c2:
                q_fast = st.number_input("Fasting glucose (mg/dL)", min_value=20,
                                         max_value=600, value=None, step=1, key="qc_fast")
                q_post = st.number_input("2-hour post-meal glucose (mg/dL)", min_value=20,
                                         max_value=600, value=None, step=1, key="qc_post")
        with st.expander("Advanced / Diagnostic (for more accurate results)"):
            st.write("Add any you have — each one sharpens the screen.")
            c3, c4 = st.columns(2)
            with c3:
                q_age = st.number_input("Age (years)", min_value=1, max_value=120,
                                        value=None, step=1, key="qc_age")
                q_sex = st.radio("Sex", ["male", "female"], horizontal=True, key="qc_sex")
                q_hba1c = st.number_input("HbA1c (%)", min_value=3.0, max_value=16.0,
                                          value=None, step=0.1, key="qc_hba1c")
            with c4:
                q_ogtt = st.number_input("2-hour OGTT glucose (mg/dL)", min_value=20,
                                         max_value=600, value=None, step=1, key="qc_ogtt")
                q_rand = st.number_input("Random glucose (mg/dL)", min_value=20,
                                         max_value=600, value=None, step=1, key="qc_rand")
                q_ldl = st.number_input("LDL-C (mg/dL)", min_value=20, max_value=400,
                                        value=None, step=1, key="qc_ldl")
                q_hdl = st.number_input("HDL-C (mg/dL)", min_value=10, max_value=150,
                                        value=None, step=1, key="qc_hdl")
                q_trig = st.number_input("Triglycerides (mg/dL)", min_value=20,
                                         max_value=1000, value=None, step=1, key="qc_trig")
            symptoms = st.multiselect(
                "Any urgent symptoms now? (a high reading + symptoms can be an emergency)",
                ["chest pain", "shortness of breath", "vision changes", "weakness/numbness",
                 "difficulty speaking", "altered mental status", "confusion/seizure",
                 "vomiting/dehydration"],
            )

        if st.button("Check my health", key="qc_run"):
            age = q_age if q_age else None
            sex = q_sex
            weight = q_weight if q_weight else None
            height = q_height if q_height else None
            fast = q_fast if q_fast else None
            post = q_post if q_post else None
            hba1c = q_hba1c if q_hba1c else None
            # Parse BP from "120/80" or "120\80" text input
            sbp, dbp = None, None
            if q_bp and q_bp.strip():
                bp_text = q_bp.replace(" ", "").replace("\\", "/")
                bp_parts = bp_text.split("/")
                if len(bp_parts) == 2:
                    try:
                        sbp = int(bp_parts[0])
                        dbp = int(bp_parts[1])
                    except ValueError:
                        pass
            ogtt = q_ogtt if q_ogtt else None
            rand = q_rand if q_rand else None

            glucose_rules = []
            if fast is not None:
                glucose_rules.append(classify_glucose(fast, "fasting"))
            if post is not None:
                glucose_rules.append(classify_glucose(post, "postmeal2h"))
            if hba1c is not None:
                glucose_rules.append(classify_glucose(hba1c, "hba1c"))
            if ogtt is not None:
                glucose_rules.append(classify_glucose(ogtt, "ogtt2h"))
            if rand is not None:
                glucose_rules.append(classify_glucose(rand, "random"))
            bp_rule = classify_bp(sbp, dbp, symptoms) if (sbp or dbp) else None
            bmi_rule = compute_bmi(weight, height) if (weight and height) else None
            lipid_rules = classify_lipids(
                ldl=q_ldl if q_ldl else None, hdl=q_hdl if q_hdl else None,
                trig=q_trig if q_trig else None)

            bmi_val = bmi_rule["value"] if (bmi_rule and bmi_rule["category"] != "missing") else 0
            ml_in = {}
            if age and age > 0:
                ml_in["Age"] = age
            if fast and fast > 0:
                ml_in["Glucose"] = fast
            if sbp and sbp > 0:
                ml_in["BloodPressure"] = sbp
            if bmi_val and bmi_val > 0:
                ml_in["BMI"] = bmi_val
            ml = predict_with_model(ml_in, model, medians, threshold) if model else None

            ev = aggregate_evidence(
                glucose_rules=glucose_rules, bp_rule=bp_rule, bmi_rule=bmi_rule,
                lipid_rules=lipid_rules, ml=ml)

            # ---- Headline ----
            all_sevs = [r["severity"] for r in glucose_rules]
            if bp_rule:
                all_sevs.append(bp_rule["severity"])
            if bmi_rule:
                all_sevs.append(bmi_rule["severity"])
            for r in lipid_rules:
                all_sevs.append(r["severity"])
            worst_sev = max(all_sevs, key=lambda s: severity_rank(s)) if all_sevs else "normal"
            headline_map = {
                "emergency": ("🚨 Critical — seek medical attention", "#C0392B"),
                "critical":  ("🚨 Critical — seek medical attention", "#C0392B"),
                "severe":    ("🔴 Very high risk", "#C0392B"),
                "high":      ("🟠 Elevated risk", "#E67E22"),
                "stage2":    ("🟠 Elevated risk", "#E67E22"),
                "stage1":    ("🟡 Attention needed", "#F9A825"),
                "moderate":  ("🟡 Attention needed", "#F9A825"),
                "elevated":  ("🟡 Attention needed", "#F9A825"),
                "low":       ("🟠 Low blood pressure detected", "#E67E22"),
                "normal":    ("🟢 Within normal range", "#2E7D32"),
            }
            hl_text, hl_color = headline_map.get(worst_sev, ("Screening result", "#41565F"))
            st.markdown(
                f'<div style="background:#fff;border:1px solid #E3EBEF;border-left:4px solid {hl_color};'
                f'border-radius:12px;padding:18px 20px;margin:8px 0 18px;">'
                f'<div style="font-size:12px;color:#7A8B93;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px;">Your screening result</div>'
                f'<div style="font-size:20px;font-weight:700;color:{hl_color};">{hl_text}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

            # ---- Measurements ----
            def _m_row(label, value, unit, status, color, source="", why=""):
                src = f'<span style="font-size:11px;color:#7A8B93;margin-left:6px;">({source})</span>' if source else ""
                why_html = ""
                if why:
                    why_html = (
                        f'<div style="font-size:12px;color:#5F7080;padding:4px 0 6px 2px;">'
                        f'💬 {why}</div>'
                    )
                return (
                    f'<div style="padding:10px 0;border-bottom:1px solid #F0F2F4;">'
                    f'<div style="display:flex;justify-content:space-between;align-items:center;">'
                    f'<div><div style="font-size:13px;color:#7A8B93;">{label}{src}</div>'
                    f'<div style="font-size:18px;font-weight:600;color:#16242B;">{value} <span style="font-size:13px;color:#7A8B93;">{unit}</span></div></div>'
                    f'<div style="font-size:13px;font-weight:600;color:{color};">{status}</div>'
                    f'</div>{why_html}</div>'
                )
            rows = []
            for r in glucose_rules:
                why = r.get("interpretation", "")
                rows.append(_m_row(
                    f"Glucose ({r['measurement_type']})", r["value"],
                    "mg/dL" if r["measurement_type"] != "hba1c" else "%",
                    r["status"], r["color"], r.get("source", ""), why))
            if bp_rule:
                rows.append(_m_row(
                    "Blood pressure", f"{sbp}/{dbp}" if sbp and dbp else str(sbp or dbp),
                    "mmHg", bp_rule["status"], bp_rule["color"], bp_rule.get("source", ""),
                    bp_rule.get("interpretation", "")))
            if bmi_rule:
                rows.append(_m_row(
                    "BMI", f'{bmi_rule["value"]:.1f}', "kg/m²",
                    bmi_rule["status"], bmi_rule["color"], why=bmi_rule.get("message", "")))
            for r in lipid_rules:
                rows.append(_m_row(
                    r["measurement_type"], r["value"], "mg/dL",
                    r["status"], r["color"], r.get("source", ""), r.get("interpretation", "")))
            if rows:
                st.markdown(
                    '<div style="background:#fff;border:1px solid #E3EBEF;border-radius:12px;'
                    'padding:8px 18px;margin:0 0 16px;">'
                    + "".join(rows) + '</div>',
                    unsafe_allow_html=True,
                )
            elif not glucose_rules and not bp_rule and not bmi_rule and not lipid_rules:
                st.info("No measurements provided — add values above to see your result.")

            # ---- §19 Red-flag emergency banner ----
            if ev["red_flags"]:
                flags_html = "".join(
                    f'<div style="padding:4px 0;font-size:14px;">🚨 {f["message"]}</div>'
                    for f in ev["red_flags"]
                )
                st.markdown(
                    f'<div style="background:#FDECEA;border:2px solid #C0392B;border-radius:12px;'
                    f'padding:16px 20px;margin:0 0 16px;">'
                    f'<div style="font-size:15px;font-weight:700;color:#C0392B;margin-bottom:6px;">'
                    f'⚠ URGENT — Seek medical attention</div>'
                    f'{flags_html}'
                    f'<div style="font-size:12px;color:#7A8B93;margin-top:6px;">'
                    f'These symptoms combined with a high reading can indicate a medical emergency.</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

            # ---- ML score ----
            if ml:
                ml_label = "Elevated" if ml["score"] >= threshold else "Lower"
                ml_color = "#E67E22" if ml["score"] >= threshold else "#2E7D32"
                st.markdown(
                    f'<div style="background:#fff;border:1px solid #E3EBEF;border-radius:12px;'
                    f'padding:14px 18px;margin:0 0 16px;">'
                    f'<div style="font-size:12px;color:#7A8B93;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">ML model estimate</div>'
                    f'<div style="font-size:22px;font-weight:700;color:{ml_color};">{ml["score"]:.0%} — {ml_label}</div>'
                    f'<div style="font-size:12px;color:#7A8B93;">Research/baseline only — not a diagnosis</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

            # ---- Next steps ----
            next_steps = []
            if glucose_rules:
                worst_g = max(glucose_rules, key=lambda r: severity_rank(r["severity"]))
                if worst_g["severity"] in ("high", "critical", "emergency", "stage2"):
                    next_steps.append("Confirm with a fasting glucose or HbA1c test")
            if bp_rule and bp_rule["severity"] in ("high", "stage2", "emergency", "severe"):
                next_steps.append("Monitor your blood pressure regularly")
            if bmi_rule and bmi_rule["severity"] in ("high", "moderate"):
                next_steps.append("Consider weight management — even small changes help")
            if any(r["severity"] in ("high", "critical") for r in lipid_rules):
                next_steps.append("Discuss cholesterol results with your doctor")
            if not next_steps:
                next_steps.append("Keep up your current healthy habits")
            next_steps.append("Discuss results with a clinician for personalised advice")
            st.markdown(
                '<div style="font-size:14px;font-weight:600;color:#16242B;margin:8px 0 6px;">What to do next</div>'
                + "".join(f'<div style="font-size:13px;color:#41565F;padding:4px 0;">{i+1}. {s}</div>'
                           for i, s in enumerate(next_steps)),
                unsafe_allow_html=True,
            )

            # ---- Completeness card (§22) ----
            provided, missing = [], []
            if fast is not None: provided.append("Fasting glucose")
            else: missing.append("fasting glucose")
            if hba1c is not None: provided.append("HbA1c")
            elif fast is None: missing.append("fasting glucose or HbA1c")
            if sbp is not None and dbp is not None: provided.append("Blood pressure")
            elif sbp is None and dbp is None: missing.append("blood pressure")
            if weight is not None and height is not None: provided.append("BMI")
            else: missing.append("weight & height (for BMI)")
            total = len(provided) + len(missing)
            pct = int(len(provided) / total * 100) if total else 0
            prov_html = "".join(
                f'<span style="display:inline-block;background:#E6F4EA;color:#1E7A3C;border-radius:6px;'
                f'padding:3px 10px;font-size:12px;font-weight:500;margin:2px 4px 2px 0;">✓ {v}</span>'
                for v in provided
            )
            miss_html = "".join(
                f'<span style="display:inline-block;background:#FFF3E0;color:#E65100;border-radius:6px;'
                f'padding:3px 10px;font-size:12px;font-weight:500;margin:2px 4px 2px 0;">✗ {m}</span>'
                for m in missing
            )
            bar_color = "#2E7D32" if pct >= 75 else ("#F9A825" if pct >= 50 else "#E65100")
            st.markdown(
                f'<div style="background:#fff;border:1px solid #E3EBEF;border-radius:12px;'
                f'padding:14px 18px;margin:0 0 16px;">'
                f'<div style="font-size:12px;color:#7A8B93;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:8px;">Screen completeness</div>'
                f'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
                f'<div style="flex:1;height:6px;background:#F0F2F4;border-radius:3px;">'
                f'<div style="width:{pct}%;height:100%;background:{bar_color};border-radius:3px;"></div></div>'
                f'<div style="font-size:13px;font-weight:600;color:#16242B;">{pct}%</div></div>'
                f'<div>{prov_html}{miss_html}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
            if missing and ai.mode != "offline":
                ask = chat_agent([{"role": "user", "content":
                    f"The user did a quick health check but did not provide: "
                    f"{', '.join(missing)}. Politely ask them to add those values. "
                    f"2 sentences."}], client=ai)
                st.info(ask)

            st.caption("Screening only — not a diagnosis. Confirm with a clinician via "
                       "fasting glucose / HbA1c / OGTT.")

            # ---- Download summary (§43) ----
            lines = ["Diabetes Risk Intelligence — Screening Summary", "=" * 48, ""]
            lines.append(f"Headline: {hl_text}")
            lines.append(f"Worst severity: {worst_sev}")
            lines.append("")
            lines.append("Measurements:")
            for r in glucose_rules:
                lines.append(f"  Glucose ({r['measurement_type']}): {r['value']} mg/dL — {r['status']}")
            if bp_rule:
                lines.append(f"  Blood pressure: {sbp}/{dbp} mmHg — {bp_rule['status']}")
            if bmi_rule:
                lines.append(f"  BMI: {bmi_rule['value']:.1f} kg/m² — {bmi_rule['status']}")
            for r in lipid_rules:
                lines.append(f"  {r['measurement_type']}: {r['value']} mg/dL — {r['status']}")
            if ml:
                lines.append(f"  ML model: {ml['score']:.0%} — {'Elevated' if ml['score'] >= threshold else 'Lower'}")
            lines.append("")
            if ev["red_flags"]:
                lines.append("Red flags:")
                for f in ev["red_flags"]:
                    lines.append(f"  ⚠ {f['message']}")
                lines.append("")
            lines.append("What to do next:")
            for i, s in enumerate(next_steps):
                lines.append(f"  {i+1}. {s}")
            lines.append("")
            lines.append("Screening only — not a diagnosis. Generated by Diabetes Risk Intelligence.")
            lines.append(f"Clinical rules: ADA 2026 glucose thresholds, AHA-ACC 2025 BP classification.")
            lines.append(f"ML model: PIMA Random Forest (77.9% accuracy, 61% recall).")
            lines.append("")
            lines.append("⚠ IMPORTANT: This tool is for screening and education only.")
            lines.append("Always consult a healthcare professional for diagnosis and treatment.")

            st.download_button(
                "⬇ Download screening summary",
                data="\n".join(lines),
                file_name="screening_summary.txt",
                mime="text/plain",
                key="dl_summary",
            )

            if ai.mode != "offline":
                summary = {
                    "glucose": [r["status"] for r in glucose_rules],
                    "bp": bp_rule["status"] if bp_rule else "not provided",
                    "bmi": bmi_rule["status"] if bmi_rule else "not provided",
                    "ml_score": round(ml["score"], 2) if ml else None,
                    "red_flags": [f["message"] for f in ev["red_flags"]],
                }
                with st.spinner("Step 3/3 — AI generating explanation..."):
                    try:
                        explain = chat_agent([{"role": "user", "content":
                            "Explain this screening summary to the patient in 2-4 plain, warm "
                            "sentences. Do NOT diagnose. Highlight any urgent flag. Summary: "
                            + json.dumps(summary)}], client=ai)
                    except Exception:
                        explain = ""
                        st.info("AI explanation unavailable — check the results above for your screening.")
                if explain:
                    st.markdown("#### AI explanation")
                    st.write(explain)

        with st.expander("Glucose reference (mg/dL)"):
            st.table(pd.DataFrame([
                {"Range": "<40", "Category": "Extremely low", "Status": "🔴 Critical hypoglycemia"},
                {"Range": "40-53", "Category": "Level 2 hypoglycemia", "Status": "🔴 Severe low"},
                {"Range": "54-69", "Category": "Level 1 hypoglycemia", "Status": "🟠 Low"},
                {"Range": "70-99", "Category": "Normal fasting", "Status": "🟢 Normal"},
                {"Range": "100-125", "Category": "Prediabetes (IFG)", "Status": "🟡 Prediabetes range"},
                {"Range": "126-199", "Category": "Diabetes-range*", "Status": "🟠 Needs confirmation"},
                {"Range": ">=200", "Category": "Diabetes-range", "Status": "🔴 Diabetes-range"},
                {"Range": ">250", "Category": "Markedly high", "Status": "🔴 Very high"},
                {"Range": ">=300", "Category": "Severe hyperglycemia", "Status": "🔴 Critical/high-risk"},
                {"Range": ">=400", "Category": "Extremely high", "Status": "🔴 Emergency-level"},
            ]))
        with st.expander("Blood pressure reference (mmHg)"):
            st.table(pd.DataFrame([
                {"Reading": "<90 / <60", "Category": "Low BP", "Status": "🟠 Low"},
                {"Reading": "90-119 / <80", "Category": "Normal", "Status": "🟢 Normal"},
                {"Reading": "120-129 / <80", "Category": "Elevated", "Status": "🟡 Elevated"},
                {"Reading": "130-139 / 80-89", "Category": "Stage 1", "Status": "🟠 High"},
                {"Reading": ">=140 or >=90", "Category": "Stage 2", "Status": "🔴 Very high"},
                {"Reading": ">180 and/or >120", "Category": "Severe", "Status": "🔴 Critical"},
                {"Reading": ">180 and/or >120 + symptoms", "Category": "Emergency", "Status": "🔴 Emergency"},
            ]))

    # ---------------- Module: AI Clinical Assistant ----------------
    if page == "assistant":
        st.subheader("AI Clinical Assistant")
        tool = st.radio("Choose a tool", ["Chat", "Enrich patient data", "Web research"])

        if tool == "Chat":
            st.write("Ask anything about diabetes risk, the screening features, or lifestyle.")
            if not st.session_state.ai_messages:
                st.markdown(
                    '<div style="background:#F2F6F8;border:1px solid #D8E2E7;border-radius:12px;'
                    'padding:24px 20px;text-align:center;margin:12px 0;">'
                    '<div style="font-size:28px;margin-bottom:8px;">💬</div>'
                    '<div style="font-size:15px;font-weight:600;color:#16242B;margin-bottom:4px;">Start a conversation</div>'
                    '<div style="font-size:13px;color:#7A8B93;">Ask about diabetes risk, blood pressure, lifestyle tips, or anything health-related.</div>'
                    '</div>',
                    unsafe_allow_html=True,
                )
            # Suggested prompts (§23)
            if not st.session_state.ai_messages:
                st.markdown(
                    '<div style="font-size:13px;color:#7A8B93;margin-bottom:6px;">Try a question:</div>',
                    unsafe_allow_html=True,
                )
                suggested = [
                    "What does fasting glucose of 110 mean?",
                    "How can I lower my risk?",
                    "Is my blood pressure normal?",
                    "What foods should I avoid?",
                    "Do I need medication?",
                ]
                cols = st.columns(len(suggested))
                for i, q in enumerate(suggested):
                    with cols[i]:
                        if st.button(q, key=f"sug_{i}", use_container_width=True):
                            st.session_state.ai_messages.append({"role": "user", "content": q})
                            st.rerun()
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