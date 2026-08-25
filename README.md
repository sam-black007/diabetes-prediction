# Diabetes Risk Intelligence

> **Try it live:** [diabetes-prediction-v0.streamlit.app](https://diabetes-prediction-v0.streamlit.app)

A diabetes risk screening tool that combines clinical rules (ADA 2026, AHA-ACC 2025) with a machine learning model (PIMA Random Forest) to help people understand their health measurements. Built with Python, Streamlit, and scikit-learn.

---

## What it does

- **Quick Health Check** — enter a few values (weight, height, glucose, blood pressure) and get an instant screening result with clinical classification
- **Medical Report Upload** — upload a PDF or photo of a lab report; OCR reads the values, the AI validates them, and you get a risk assessment
- **AI Clinical Assistant** — ask questions about diabetes risk, blood pressure, lifestyle, or anything health-related

The app works offline too — clinical rules run locally, the AI only explains the result.

---

## UI Enhancements

The interface was redesigned for clarity, trust, and mobile-friendliness:

- **Task-oriented landing page** — three entry points (Check My Health, Upload Report, Ask AI) instead of tab-first navigation
- **Step-by-step progress indicator** — 1, 2, 3 flow in Quick Health Check so users know where they are
- **Measurement result cards** — each value shows the number, unit, interpretation, and clinical source (e.g. ADA 2026)
- **OCR confidence indicators** — green (detected), yellow (please verify), red (could not read) for every field in a scanned report
- **Editable report review** — users can correct OCR mistakes before running the assessment
- **Completeness bar** — visual progress showing what was measured vs what's missing
- **Micro-explanations** — a short why under each result so users understand the classification
- **Emergency banner** — dedicated red banner for urgent symptoms (high BP + chest pain, etc.)
- **Suggested prompts** — clickable starter questions in the AI chat that trigger the agent immediately
- **Download summary** — plain-text screening report users can save or share with their doctor
- **Mobile-responsive** — stacked layout, scaled fonts, touch-friendly spacing on narrow screens
- **Focus-visible outlines** — keyboard navigation support for accessibility
- **Empty states** — friendly placeholder messages when no data is uploaded yet
- **Graceful error handling** — clear messages when the AI service is unavailable

---

## Clinical rules engine

Every verdict comes from a single, transparent, offline rules layer (`src/clinical_rules.py`), not from the LLM. The AI only explains the result in plain language.

- **Glucose is measurement-type aware.** Fasting, 2-hour post-meal, HbA1c, OGTT, and random glucose are classified by their own thresholds (ADA 2026), with explicit hypoglycemia tiers
- **Blood pressure uses independent SBP / DBP OR logic** (AHA/ACC 2025): a reading is Stage 2 if either number is high, and a severe reading with urgent symptoms is escalated to hypertensive emergency
- **BMI** is computed from height + weight
- **Lipids** (LDL-C, HDL-C, triglycerides) are scored independently when provided
- **Red-flag engine** surfaces emergencies (glucose 400+, BP emergency + symptoms) up front

The PIMA Random Forest model (`data/processed/best_model.joblib`) runs as a supplementary research/baseline score (77.9% accuracy, 61% recall).

---

## What's next

Planned for upcoming releases:

- **Multi-language support** — Hindi, Tamil, Telugu, and other regional languages for wider accessibility
- **PDF report generation** — download a formatted screening report with charts and clinical references
- **Trend tracking** — save results over time and show glucose/BP trends with charts
- **Family history module** — add family diabetes history as a risk factor
- **Medication interaction checker** — flag common diabetes medication interactions
- **Doctor share link** — generate a shareable link for your clinician to review results
- **Voice input** — speak your values instead of typing (accessibility improvement)
- **Dark mode** — alternative color scheme for low-light environments
- **Offline PWA** — install as a progressive web app for use without internet
- **Additional ML models** — XGBoost, neural networks, and ensemble methods for comparison
- **Integration with health apps** — import data from Google Fit, Apple Health, or Fitbit

---

## How to run

```bash
pip install -r requirements.txt
python -m streamlit run app.py
```

Open http://localhost:8501

---

## Configuration

Set these in `.env` (or Streamlit Cloud Secrets):

```bash
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-v1-...
AI_MODEL=deepseek/deepseek-chat-v3-0324:free
```

Supported providers: OpenRouter, Google Gemini, DeepSeek, Qwen, Kimi, SiliconFlow, OpenAI. The app auto-detects the provider from the API key prefix.

---

## Accuracy

| Model | Accuracy | Precision | Recall | F1 |
|-------|----------|-----------|--------|-----|
| Logistic Regression | 70.8% | 60.0% | 50.0% | 0.55 |
| SVM (tuned) | 74.0% | 65.2% | 55.6% | 0.60 |
| **Random Forest (tuned)** | **77.9%** | **71.7%** | **61.1%** | **0.66** |

This is screening, not diagnosis. A positive result means "worth confirming with a clinician."

---

## Project structure

```
src/
  ai_agents.py          AI agent layer (all agents + AIClient + offline fallbacks)
  clinical_rules.py     deterministic clinical engine (glucose, BP, BMI, lipids, red flags)
  ml_risk.py            PIMA Random-Forest inference
  report_parser.py      reads lab-report PDFs / images (OCR)
  risk_questionnaire.py FINDRISC lifestyle risk score
app.py                  Streamlit app
tests/
  test_clinical_rules.py  edge-case tests for clinical rules
  test_ml_risk.py         model loading and prediction tests
requirements.txt
```

---

## Safety

This tool provides **screening and education only — not a medical diagnosis**. Always confirm results with a clinician via fasting glucose / HbA1c test per WHO and IDF guidance.

---

## License

MIT License — free to use, modify, and share.
