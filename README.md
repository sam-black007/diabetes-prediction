# Diabetes Risk Intelligence

> **Try it live:** [diabetes-prediction-v0.streamlit.app](https://diabetes-prediction-v0.streamlit.app)

A diabetes risk screening tool that combines clinical rules (ADA 2026, AHA-ACC 2025) with a machine learning model (PIMA Random Forest) to help people understand their health measurements. Built with Python, Streamlit, and scikit-learn.

---

## Version History

### v1.0 — Core Screening Engine
*Initial release*

- **Quick Health Check** — enter glucose, blood pressure, BMI, lipids → instant clinical screening
- **Medical Report Upload** — OCR reads PDF/lab reports, AI validates values
- **AI Clinical Assistant** — ask questions about diabetes, BP, lifestyle
- **Clinical rules engine** — ADA 2026 glucose thresholds, AHA/ACC 2025 BP guidelines
- **PIMA Random Forest model** — 77.9% accuracy, supplementary risk score
- **Offline-capable** — clinical rules run locally, AI only explains results

### v1.1 — UI/UX Overhaul
*Task-oriented redesign*

- **Task-oriented landing page** — 3 entry points (Check, Upload, Ask AI)
- **Step-by-step progress indicator** — 1→2→3 flow in Health Check
- **Measurement result cards** — value + unit + interpretation + source
- **OCR confidence indicators** — green/yellow/red per field
- **Editable report review** — correct OCR mistakes before assessment
- **Completeness bar** — visual progress of measured vs missing values
- **Micro-explanations** — 💬 why under each result
- **Emergency banner** — red banner for urgent symptoms
- **Suggested prompts** — clickable AI chat starters
- **Download summary** — plain-text screening report
- **Mobile-responsive** — stacked layout, scaled fonts
- **Focus-visible outlines** — keyboard accessibility
- **Empty states** — friendly placeholders
- **Graceful error handling** — clear AI failure messages

### v1.2 — Clinical Accuracy
*Blood pressure & red flags*

- **Single blood pressure input** — supports `120/80` and `120\80` formats
- **Independent SBP/DBP OR-logic** — Stage 2 if either number is high
- **Hypertensive emergency detection** — BP + symptoms = urgent escalation
- **Red-flag engine** — glucose 400+, emergency BP, critical values
- **Source citations** — ADA 2026, AHA-ACC 2025 on every measurement
- **19 edge-case tests** — clinical rules fully tested

### v1.3 — AI & Accessibility
*AI reliability & user experience*

- **Resilient AI module binding** — app works even if AI module fails to load
- **Offline AI fallback** — clear "unavailable" message instead of crash
- **AI timeout increase** — 30s timeout with 2 retries
- **Graceful provider errors** — AuthenticationError, NotFoundError handled
- **Multi-provider support** — OpenRouter, Google Gemini, DeepSeek, Qwen, Kimi
- **CSS animation removal** — no hover effects, transitions, or keyframes

### v1.4 — Health Score & Sharing
*Scoring & export*

- **Health Score (0-100)** — single number combining all metrics
- **SVG circular gauge** — animated visual risk indicator
- **Shareable Health Card** — text export with all results
- **PDF Report Export** — clean one-page clinical screening PDF
- **Print-friendly CSS** — hides sidebar/buttons on Ctrl+P

### v1.5 — Unit Converter & Dark Mode
*User preferences*

- **Blood sugar unit converter** — toggle mg/dL ↔ mmol/L
- **Glucose values auto-convert** — input in either unit, results show correctly
- **Dark mode toggle** — 🌙 switch between light and dark themes
- **Auto-save results** — screening saved to local history

### v2.0 — Database & Authentication (Planned)
*Cloud sync & user accounts*

- Supabase PostgreSQL integration
- Google OAuth + email/password login
- Screening history saved to cloud
- Trend charts (glucose/BP/weight over time)
- Achievement badges
- Daily health challenges
- Family history module
- Medication checker

### v3.0 — AI-Powered Wellness (Planned)
*Smart health coaching*

- AI meal photo analysis (snap a plate → estimate carbs)
- Personalized meal plans based on risk profile
- Predictive glucose alerts (30-min lookahead)
- Sleep-glucose correlation tracking
- Stress management suggestions
- What If Simulator (sliders → live risk changes)
- A1C ↔ average glucose calculator

### v4.0 — Social & Community (Planned)
*Engagement & motivation*

- Anonymous leaderboard
- Accountability partner system
- Community challenges (30-day step challenge)
- Patient success stories
- Daily health challenges with streaks
- Shareable health cards (WhatsApp/Telegram)
- Health Score history wall

---

## Clinical Rules Engine

Every verdict comes from a single, transparent, offline rules layer (`src/clinical_rules.py`), not from the LLM.

- **Glucose** — measurement-type aware (fasting, post-meal, HbA1c, OGTT, random) with ADA 2026 thresholds
- **Blood pressure** — independent SBP/DBP OR-logic (AHA/ACC 2025)
- **BMI** — computed from height + weight
- **Lipids** — LDL-C, HDL-C, triglycerides scored independently
- **Red-flag engine** — glucose 400+, BP emergency + symptoms surfaced first

---

## ML Model Accuracy

| Model | Accuracy | Precision | Recall | F1 |
|-------|----------|-----------|--------|-----|
| Logistic Regression | 70.8% | 60.0% | 50.0% | 0.55 |
| SVM (tuned) | 74.0% | 65.2% | 55.6% | 0.60 |
| **Random Forest (tuned)** | **77.9%** | **71.7%** | **61.1%** | **0.66** |

This is screening, not diagnosis. A positive result means "worth confirming with a clinician."

---

## How to Run

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

Supported providers: OpenRouter, Google Gemini, DeepSeek, Qwen, Kimi, SiliconFlow, OpenAI.

---

## Project Structure

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
