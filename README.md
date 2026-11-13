# 🩺 DiabetesRisk Intelligence V2.0

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/sam-black007/diabetes-prediction?style=for-the-badge&color=0ea5e9)
![GitHub license](https://img.shields.io/github/license/sam-black007/diabetes-prediction?style=for-the-badge&color=22c55e)
![Last commit](https://img.shields.io/github/last-commit/sam-black007/diabetes-prediction?style=for-the-badge&color=10b981)
![Next.js 14](https://img.shields.io/badge/Next.js%2014-black?style=for-the-badge&logo=next.js)
![Python 3.11](https://img.shields.io/badge/Python%203.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini%203.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase%20Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel%20Production-000000?style=for-the-badge&logo=vercel&logoColor=white)

**A clinical-grade, offline-first diabetes screening and metabolic intelligence platform** combining ADA 2026 / AHA-ACC 2025 clinical rules, a calibrated 5-algorithm soft-voting machine learning ensemble, Google Gemini 3.5 Flash generative endocrinology, wearable CGM telemetry, and hospital-ready FHIR R4 / CDA exports.

<br />

[🚀 **Explore Live Web App**](https://diabetes-prediction-ten-eta.vercel.app) •
[📚 **View API Docs**](https://diabetes-prediction-api-9hx8.onrender.com/docs) •
[🐛 **Report an Issue**](https://github.com/sam-black007/diabetes-prediction/issues)

</div>

---

> ⚠️ **Clinical Education & Screening Notice** — This platform is designed for preventive risk stratification, educational triage, and physician discussion. It does **not** provide a definitive medical diagnosis. Clinical findings should be confirmed via venous plasma fasting glucose or standardized HbA1c tests. Always consult a licensed healthcare provider before making medical decisions.

---

## 📑 Table of Contents

- [✨ What's New in V2.0](#-whats-new-in-v20)
- [🌟 Key Features](#-key-features)
- [📸 Visual Showcase](#-visual-showcase)
- [🏗️ System Architecture](#️-system-architecture)
- [🤖 Machine Learning Ensemble & Calibration](#-machine-learning-ensemble--calibration)
- [⌚ Wearable CGM & Biometric Telemetry](#-wearable-cgm--biometric-telemetry)
- [🧠 Generative Endocrinology (Google Gemini)](#-generative-endocrinology-google-gemini)
- [🥗 ADA 2026 Diet & Lifestyle Action Engine](#-ada-2026-diet--lifestyle-action-engine)
- [🏥 Hospital EHR Export & Interoperability](#-hospital-ehr-export--interoperability)
- [💻 Tech Stack](#-tech-stack)
- [📂 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [🚢 Deployment Architecture](#-deployment-architecture)
- [📡 API Reference](#-api-reference)
- [👥 Contributors & Acknowledgements](#-contributors--acknowledgements)
- [📄 License](#-license)
- [📖 Citation](#-citation)

---

## ✨ What's New in V2.0

| Area | Enhancement |
| :--- | :--- |
| **ML Pipeline** | Calibrated 5-model soft-voting ensemble (LR, RF, GB, SVM, XGBoost) with Platt sigmoid calibration + 90% split-conformal intervals |
| **Explainability** | Native XGBoost Tree-SHAP (`pred_contribs`) for per-patient feature attribution |
| **Generative AI** | Google Gemini 3.5 Flash "Ask Dr. Gemini" conversational endocrinology agent with ADA 2026 guardrails |
| **Wearables** | Dexcom G7/Stelo, FreeStyle Libre 2/3, Apple HealthKit, Google Fit/Health Connect with 1-click auto-fill |
| **Offline-First** | Workbox PWA service worker + IndexedDB sync queue that flushes on reconnect |
| **EHR Export** | Hospital-grade PDF, HL7 FHIR STU3/R4, and CDA R2 clinical document exports |
| **UI/UX** | Tailwind + shadcn/ui + Radix, dark/light mode, responsive dashboard |

---

## 🌟 Key Features

| Capability | Implementation | Highlights |
| :--- | :--- | :--- |
| **Calibrated 5-Model ML Ensemble** | Soft-voting: Logistic Regression, Random Forest, Gradient Boosting, SVM, XGBoost + Platt Sigmoid Calibration + 90% split-conformal intervals | F1: **0.727** • AUC: **0.825** • Threshold: **0.26** • Uncertainty `q ≈ 0.696` |
| **SHAP Explainability** | XGBoost native `pred_contribs` Tree-SHAP | Instant per-patient feature attribution, no heavy external dependency |
| **Google Gemini AI** | `gemini-3.5-flash` via Next.js server route + local key manager | Executive synthesis, pathophysiology, physician talking points, **"Ask Dr. Gemini"** Q&A |
| **Wearable CGM Telemetry** | Dexcom G7/Stelo, FreeStyle Libre 2/3, Apple HealthKit, Google Fit / Health Connect | Real-time glucose streaming, HR, BP, steps, sleep + **1-click auto-fill** |
| **Offline-First PWA** | Workbox Service Worker, IndexedDB (`idb`), `local-store.ts` | Full offline use; background sync queue flushes pending screenings on reconnect |
| **ADA 2026 Nutrition Engine** | ADA 2026 Standards of Care macros | Daily calorie targets, carb/protein/fat grams, exercise prescriptions, metabolic roadmap |
| **Lab Report OCR** | Tesseract-compatible parsing + regex heuristics | Extracts FPG, HbA1c, lipid panel (Total/HDL/LDL/TG), BP from PDF/image |
| **Hospital EHR Export** | `@react-pdf/renderer` + ReportLab, FHIR STU3/R4, CDA R2 XML | 2-page clinical PDF, Epic/Cerner-ready FHIR bundles, CDA documents |
| **Dark/Light UI/UX** | Tailwind CSS, shadcn/ui, Radix UI, Lucide icons | Persistent theme preference, responsive desktop/tablet/mobile |

---

## 📸 Visual Showcase

<div align="center">

| | |
| :--- | :--- |
| ![Gemini Synthesis](assets/screenshots/01_gemini_dynamic_synthesis.png) | **Generative Endocrinology** — Dynamic clinical synthesis with Gemini 3.5 Flash |
| ![Ask Dr. Gemini](assets/screenshots/02_ask_dr_gemini_chat.png) | **"Ask Dr. Gemini" Q&A** — Context-aware conversational endocrinology chat |
| ![Devices](assets/screenshots/03_connected_devices_telemetry.png) | **Wearable Connectors** — Dexcom, Libre, Apple Health, Google Fit auto-fill |
| ![ADA Plan](assets/screenshots/04_ada_action_plan_diet.png) | **ADA 2026 Nutrition Plan** — Calorie, macro, exercise & metabolic roadmap |
| ![Results](assets/screenshots/05_clinical_results_shap_simulator.png) | **Results & SHAP** — Risk gauge, conformal intervals, Tree-SHAP waterfall |
| ![Lab OCR](assets/screenshots/06_lab_report_ocr_extractor.png) | **Lab Report OCR** — Auto-extract biomarkers from PDF/image uploads |
| ![Dark Mode](assets/screenshots/07_modern_dark_landing.png) | **Dark Mode Dashboard** — High-contrast clinical UI for night-time use |
| ![Gemini Settings](assets/screenshots/08_gemini_settings_configuration.png) | **Gemini API Center** — Secure key management & live model verification |

</div>

---

## 🏗️ System Architecture

### 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph CLIENT["Client Layer — Next.js 14 PWA (Vercel)"]
        direction TB
        UI["Modern Clinical UI — Tailwind + shadcn/ui"]
        Wizard["3-Step Screening Wizard"]
        DevicesUI["Wearable Devices & CGM Center"]
        GeminiChatUI["Ask Dr. Gemini Interactive Chat"]
        LocalStore["Offline Engine — IndexedDB + localStorage"]
        SyncQueue["Background Sync Queue"]
    end

    subgraph WEARABLES["Wearables & Biometric Inputs"]
        direction TB
        Dexcom["Dexcom G7 / Stelo CGM"]
        Libre["FreeStyle Libre 2/3"]
        AppleHealth["Apple HealthKit"]
        GoogleFit["Google Fit / Health Connect"]
        LabOCR["Lab Report OCR Extractor"]
    end

    subgraph BACKEND["Backend ML & API — FastAPI (Render)"]
        direction TB
        APIRouter["FastAPI API Router (/api/v1/*)"]
        RulesEngine["ADA 2026 / AHA Rules Engine"]
        MLEnsemble["5-Model Soft Voting Ensemble"]
        PlattCalib["Platt Sigmoid Calibrator"]
        ConformalEval["Split-Conformal 90% Intervals"]
        TreeSHAP["Native Tree-SHAP Explainer"]
        ExportEngine["EHR Export — FHIR R4 / CDA / PDF"]
    end

    subgraph AI_SERVICES["Generative AI Layer"]
        direction TB
        GeminiAPI["Google Gemini 3.5 Flash API"]
        PromptEngine["ADA Endocrinology Clinical Prompts"]
    end

    subgraph CLOUD["Cloud Persistence & Auth (Optional)"]
        direction TB
        SupabaseDB["Supabase PostgreSQL — RLS Enforced"]
        ClerkAuth["Clerk JWT Authentication"]
        UpstashRedis["Upstash Redis — Rate Limiting"]
    end

    Dexcom -->|Realtime Glucose| DevicesUI
    Libre -->|Flash Glucose| DevicesUI
    AppleHealth -->|BP & Vitals| DevicesUI
    GoogleFit -->|Steps & Activity| DevicesUI
    LabOCR -->|Extracted Biomarkers| Wizard

    DevicesUI -->|1-Click Auto-fill| Wizard
    Wizard -->|Local Save| LocalStore
    LocalStore -->|Offline Enqueue| SyncQueue

    Wizard -->|POST /api/v1/screening| APIRouter
    SyncQueue -.->|Flush On Reconnect| APIRouter

    APIRouter --> RulesEngine
    RulesEngine --> MLEnsemble
    MLEnsemble --> PlattCalib
    PlattCalib --> ConformalEval
    ConformalEval --> TreeSHAP
    TreeSHAP --> APIRouter

    Wizard -->|Vitals + SHAP JSON| PromptEngine
    GeminiChatUI -->|Question + Context| PromptEngine
    PromptEngine --> GeminiAPI
    GeminiAPI -->|Clinical Insights| Wizard
    GeminiAPI -->|Conversational Answer| GeminiChatUI

    APIRouter -.->|Persist Screenings| SupabaseDB
    APIRouter -.->|Verify JWT| ClerkAuth
    APIRouter -.->|Throttle Requests| UpstashRedis
```

### 2. End-to-End ML Inference Pipeline

```mermaid
flowchart LR
    subgraph INGESTION["1. Ingestion"]
        ManualInput["Manual Vitals Entry"]
        DeviceFeed["CGM / Wearable Telemetry"]
        OCRFeed["Lab OCR Extraction"]
    end

    subgraph TRIAGE["2. Clinical Rules (ADA 2026)"]
        EmergencyCheck{"Fasting Glucose ≥ 300 or SBP ≥ 180?"}
        CriticalFlag["Immediate Triage Alert"]
        StandardCheck["Standard Stratification"]
    end

    subgraph ENSEMBLE["3. ML Ensemble"]
        Scaler["StandardScaler (PIMA Calibrated)"]
        LR["Logistic Regression"]
        RF["Random Forest (n=100)"]
        GB["Gradient Boosting (n=100)"]
        SVM["SVM (RBF)"]
        XGB["XGBoost (native)"]
        SoftVoting["Uniform Soft-Voting Fusion"]
    end

    subgraph UNCERTAINTY["4. Calibration & Uncertainty"]
        Platt["Platt Sigmoid Scaling"]
        Conformal["Split-Conformal 90% (q ≈ 0.696)"]
        SHAP["Tree-SHAP pred_contribs"]
    end

    subgraph SYNTHESIS["5. Synthesis & Delivery"]
        GeminiAgent["Gemini 3.5 Flash Synthesis"]
        NutritionEngine["ADA 2026 Macro Planner"]
        ReportDelivery["UI + Hospital PDF + FHIR"]
    end

    INGESTION --> EmergencyCheck
    EmergencyCheck -->|Yes| CriticalFlag
    EmergencyCheck -->|No| StandardCheck
    CriticalFlag --> StandardCheck
    StandardCheck --> Scaler
    Scaler --> LR & RF & GB & SVM & XGB
    LR & RF & GB & SVM & XGB --> SoftVoting
    SoftVoting --> Platt
    Platt --> Conformal
    Conformal --> SHAP
    SHAP --> GeminiAgent & NutritionEngine
    GeminiAgent & NutritionEngine --> ReportDelivery
```

### 3. Wearable Telemetry & Offline-First Sync Flow

```mermaid
flowchart TD
    StartPair["User Selects Device: Dexcom, Libre, Apple Health, or Google Fit"]
    CheckMode{"Remote DB Configured?"}

    StartPair --> CheckMode
    CheckMode -->|Yes| RemotePersist["Save to Supabase PostgreSQL"]
    CheckMode -->|No| LocalPersist["Save to Browser Local Storage"]

    RemotePersist --> PollStream["Poll / Stream Telemetry"]
    LocalPersist --> PollStream

    PollStream --> ShowVitals["Display: Glucose, BP, Steps, HR, Sleep"]
    ShowVitals --> ClickAutofill["Click 'Auto-fill New Screening'"]
    ClickAutofill --> PopulateWizard["Populate Step 1 & 2 Forms"]

    PopulateWizard --> SubmitScreening["Submit Screening"]
    SubmitScreening --> CheckOnline{"Device Online?"}

    CheckOnline -->|Online| CallAPI["Live Inference via FastAPI"]
    CheckOnline -->|Offline| QueueLocal["IndexedDB Queue + Offline Fallback"]

    QueueLocal --> ReconnectEvent["Browser 'online' Event"]
    ReconnectEvent --> FlushQueue["Flush Pending Queue to Server"]
    FlushQueue --> UpdateHistory["Refresh Screening History"]
    CallAPI --> UpdateHistory
```

### 4. "Ask Dr. Gemini" Conversational Agent

```mermaid
sequenceDiagram
    autonumber
    actor Patient as User / Patient
    participant UI as Screening Result UI
    participant Route as Next.js API Route (/api/gemini)
    participant Engine as Prompt Formatter (ADA 2026)
    participant Gemini as Google Gemini 3.5 Flash

    Patient->>UI: Submits screening with vitals & biomarkers
    UI->>Route: POST /api/gemini (action: synthesize)
    Route->>Engine: Inject Age, BMI, Glucose, HbA1c, BP, Lipids, ML Score, SHAP
    Engine->>Gemini: Request structured clinical synthesis (JSON)
    Gemini-->>Route: Executive Summary, Pathophysiology, Priorities, Talking Points
    Route-->>UI: Render Dynamic Clinical Insights Card

    Note over Patient,UI: Patient requests clarification
    Patient->>UI: Types: "How does fasting glucose affect my heart?"
    UI->>Route: POST /api/gemini (action: chat)
    Route->>Engine: Context + chat history + clinical guardrails
    Engine->>Gemini: Stream query per ADA 2026 guidelines
    Gemini-->>Route: Natural-language clinical explanation
    Route-->>UI: Render real-time Dr. Gemini response
```

---

## 🤖 Machine Learning Ensemble & Calibration

The predictive engine is trained on the curated **PIMA Indians Diabetes Database** (768 observations, 8 diagnostic biomarkers).

### Ensemble Model Comparison

| Model | F1 | ROC AUC | Sensitivity | Specificity | Role |
| :--- | :---: | :---: | :---: | :---: | :--- |
| Gradient Boosting (Baseline) | 0.592 | 0.823 | 0.612 | 0.841 | Fallback engine |
| Random Forest (100 trees) | 0.648 | 0.819 | 0.655 | 0.832 | Non-linear interactions |
| SVM (RBF) | 0.624 | 0.812 | 0.630 | 0.825 | Max-margin separator |
| Logistic Regression (L2) | 0.635 | 0.821 | 0.642 | 0.838 | Linear baseline |
| XGBoost (Histogram / Exact) | 0.672 | 0.826 | 0.680 | 0.846 | Gradient boosted trees |
| Soft-Voting Ensemble | 0.681 | 0.825 | 0.694 | 0.852 | Blended probability |
| **⭐ Ensemble + Platt Calibration** | **0.727** | **0.825** | **0.741** | **0.867** | **Active Production** |
| Split-Conformal 90% Bounds | — | — | — | — | `q ≈ 0.696`, coverage **88.3%** |

<div align="center">

| Model Comparison | Feature Importance (SHAP) |
| :---: | :---: |
| <img src="plots/5_model_comparison.png" width="420" alt="Model Comparison" /> | <img src="plots/7_feature_importance.png" width="420" alt="Feature Importance" /> |

| ROC Curve | Biomarker Boxplots |
| :---: | :---: |
| <img src="plots/6_roc_curves.png" width="420" alt="ROC Curves" /> | <img src="plots/4_boxplots_by_outcome.png" width="420" alt="Boxplots" /> |

</div>

---

## ⌚ Wearable CGM & Biometric Telemetry

- **Dexcom G7 / Stelo CGM** — Continuous interstitial glucose streaming with trend arrows and hyper/hypoglycemia alerts.
- **Abbott FreeStyle Libre 2 & 3** — Flash glucose monitoring with variability estimates and Time-in-Range (TIR).
- **Apple HealthKit** — Resting HR, step count, active calories, sleep duration, blood pressure.
- **Google Fit / Health Connect** — Android sensor metrics and cardiovascular activity.
- **1-Click Auto-Fill** — Push live sensor values directly into the screening wizard.

---

## 🧠 Generative Endocrinology (Google Gemini)

Powered by **`gemini-3.5-flash`**, the platform layers clinical context over ML scores:

1. **Executive Endocrinology Assessment** — Physician-calibrated clinical synthesis.
2. **Pathophysiological Mechanics** — Why specific glucose, BMI, and family history drive the risk profile.
3. **Target Metabolic Priorities** — Top 3 interventions ranked by risk-reduction potential.
4. **Physician Discussion Points** — Questions and topics for the next doctor appointment.
5. **"Ask Dr. Gemini" Q&A** — In-session chat on medications, diet, and lab values, bounded by ADA 2026 guidelines.

---

## 🥗 ADA 2026 Diet & Lifestyle Action Engine

Individualized intervention per the **ADA 2026 Standards of Medical Care**:

- **Calorie & Macro Breakdown** — TDEE-based targets with gram-level carbs (≥30 g fiber), lean protein (1.2–1.5 g/kg), and heart-healthy fats.
- **Exercise Prescription** — ≥150 mins/week aerobic plus resistance training.
- **Sleep & Stress Targets** — Circadian guidance to lower cortisol and nocturnal insulin resistance.

---

## 🏥 Hospital EHR Export & Interoperability

- **Hospital-Ready PDF** — 2-page clinical report: demographics, gauges, SHAP chart, Gemini synthesis, physician sign-off.
- **HL7 FHIR STU3 / R4** — `Observation`, `RiskAssessment`, `Patient` bundles for Epic/Cerner ingestion.
- **CDA R2** — HL7 Clinical Document Architecture XML.

---

## 💻 Tech Stack

```text
Frontend:              Next.js 14 (App Router) • React 18 • TypeScript • Tailwind CSS • shadcn/ui
State & Offline:       TanStack Query v5 • Zustand • idb (IndexedDB) • next-pwa (Workbox)
Backend ML Engine:     FastAPI • Python 3.11 • Uvicorn • Pydantic v2 • NumPy • Pandas
Machine Learning:      scikit-learn • XGBoost (native Tree-SHAP) • Platt Calibration • Joblib
Generative AI:         Google Gemini 3.5 Flash (@google/generative-ai & REST)
Cloud & Auth:          Supabase PostgreSQL (pgvector, RLS) • Clerk JWT (optional) • Upstash Redis
Deployment:            Vercel (Frontend) + Render (Containerized ML API)
Testing:               Pytest • Coverage.py • Playwright E2E • ESLint • TypeScript strict
```

---

## 📂 Project Structure

```text
diabetes-prediction/
├── app/                          # Next.js 14 PWA frontend
│   ├── src/
│   │   ├── app/                  # App Router (screening, devices, history, settings)
│   │   │   ├── api/gemini/route.ts   # Server-side Gemini route
│   │   │   └── (dashboard)/          # Protected dashboard views
│   │   ├── components/           # screening, devices, history, settings
│   │   ├── hooks/                # useScreening, useDevices, useHistory, useOfflineStore
│   │   └── lib/                  # gemini.ts, api.ts, local-store.ts, pdf-generate.tsx
│   ├── public/                   # PWA manifest, service worker, icons
│   └── next.config.js            # API rewrites & headers
├── api/python/                   # FastAPI backend
│   ├── main.py                   # App entry point
│   ├── routes/                   # screening, devices, history, third_party
│   ├── services/                 # screening_engine, device_sync, export_engine
│   ├── models/                   # Pydantic v2 schemas
│   ├── db/                       # Supabase asyncpg connection & migrations
│   └── requirements.txt          # Python dependencies
├── data/
│   ├── raw/diabetes.csv          # PIMA Indians Diabetes Database
│   └── processed/                # Serialized ensemble & calibrator joblib files
├── plots/                        # ML evaluation charts
├── assets/screenshots/           # Documentation screenshots
├── scripts/train_ensemble.py     # Train, calibrate & export models
└── tests/                        # Backend unit & integration tests
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v20.x or later
- **Python** 3.11.x
- **Git**

### 1. Clone

```bash
git clone https://github.com/sam-black007/diabetes-prediction.git
cd diabetes-prediction
```

### 2. Environment Variables

```bash
cp .env.example .env
```

```env
# Gemini API Key (also configurable in /settings)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000
API_INTERNAL_URL=http://localhost:8000

# Database (optional; app defaults to offline-first local mode)
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
```

### 3. Backend (FastAPI)

```bash
cd api/python
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Health: `http://localhost:8000/health` • Docs: `http://localhost:8000/docs`

### 4. Frontend (Next.js)

```bash
cd app
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🚢 Deployment Architecture

```text
┌─────────────────────────────────────┐       ┌─────────────────────────────────────┐
│     VERCEL — Frontend PWA           │       │     RENDER — Containerized API      │
│  • Next.js 14 Edge/Serverless       │  HTTPS│  • FastAPI Python 3.11              │
│  • Global Anycast Edge CDN          │ ─────►│  • Uvicorn ASGI Worker              │
│  • Gemini 3.5 Flash Server Proxy    │       │  • scikit-learn + XGBoost           │
│  • Client-side PDF Generation       │       │  • 512 MB Low-Footprint Container   │
└─────────────────────────────────────┘       └─────────────────────────────────────┘
           │                                         │
           ▼                                         ▼
┌─────────────────────────────────────┐       ┌─────────────────────────────────────┐
│   BROWSER LOCAL ENGINE              │       │   SUPABASE POSTGRESQL               │
│  • IndexedDB Pending Sync Queue     │       │  • Row-Level Security (RLS)         │
│  • Local Device Pairing Persistence │       │  • Screenings & Wearable Storage    │
│  • Workbox PWA Service Worker       │       │  • ap-northeast-1                   │
└─────────────────────────────────────┘       └─────────────────────────────────────┘
```

- **Frontend:** [Vercel](https://diabetes-prediction-ten-eta.vercel.app)
- **Backend ML API:** [Render](https://diabetes-prediction-api-9hx8.onrender.com)
- **Database:** Supabase

---

## 📡 API Reference

All endpoints prefixed with `/api/v1/`.

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/screening` | 5-model ensemble evaluation + calibration + rules | Optional |
| `GET` | `/api/v1/screening/{id}` | Retrieve screening result by UUID | Optional |
| `GET` | `/api/v1/devices` | List paired wearable sensors | Yes |
| `POST` | `/api/v1/devices` | Pair a new wearable connector | Yes |
| `POST` | `/api/v1/devices/{id}/sync` | Sync telemetry from a device | Yes |
| `DELETE`| `/api/v1/devices/{id}` | Unpair a device connector | Yes |
| `GET` | `/api/v1/history` | Historical screenings, paginated & filtered | Yes |
| `POST` | `/api/v1/export/pdf` | Hospital-grade clinical PDF | No |
| `POST` | `/api/v1/export/fhir` | HL7 FHIR STU3/R4 bundle | No |
| `POST` | `/api/v1/export/cda` | CDA R2 clinical document XML | No |
| `GET` | `/api/v1/health` | Health, version, model status | No |

---

## 👥 Contributors & Acknowledgements

<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://github.com/sam-black007">
        <img src="https://github.com/sam-black007.png" width="100" alt="sam-black007"/><br />
        <sub><b>SAM JOSEPH . B</b></sub><br />
        <sub>Lead Developer & Architect</sub>
      </a>
    </td>
    <td align="center" width="50%">
      <a href="https://github.com/Thavina22">
        <img src="https://github.com/Thavina22.png" width="100" alt="Thavina22"/><br />
        <sub><b>Thavina A</b></sub><br />
        <sub>Collaborator & Researcher</sub>
      </a>
    </td>
  </tr>
</table>

- **Dataset:** National Institute of Diabetes and Digestive and Kidney Diseases — PIMA Indians Diabetes Database.
- **Clinical Guidelines:** American Diabetes Association (ADA) 2026 Standards of Medical Care; ACC/AHA 2025 Prevention Guidelines.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 📖 Citation

If you use this project in research or clinical work, please cite:

> Sam Joseph B. & Thavina A. *DiabetesRisk Intelligence V2.0 — Clinical-grade offline-first diabetes screening platform.* GitHub, 2026. https://github.com/sam-black007/diabetes-prediction

---

<div align="center">

**DiabetesRisk Intelligence V2.0** • Built with precision for clinical triage & proactive metabolic health.

[⭐ Star this repo](https://github.com/sam-black007/diabetes-prediction/stargazers) • [🔗 Live Demo](https://diabetes-prediction-ten-eta.vercel.app) • [🐛 Issues](https://github.com/sam-black007/diabetes-prediction/issues)

</div>
