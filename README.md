# 🩺 DiabetesRisk Intelligence V2.0

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/sam-black007/diabetes-prediction?style=for-the-badge&color=0ea5e9)
![GitHub license](https://img.shields.io/github/license/sam-black007/diabetes-prediction?style=for-the-badge&color=22c55e)
![Next.js 14](https://img.shields.io/badge/Next.js%2014-black?style=for-the-badge&logo=next.js)
![Python 3.11](https://img.shields.io/badge/Python%203.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini%203.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase%20Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel%20Production-000000?style=for-the-badge&logo=vercel&logoColor=white)

**A clinical-grade, offline-first diabetes screening and metabolic intelligence platform combining ADA 2026 / AHA-ACC 2025 clinical rules, a calibrated 5-algorithm soft-voting machine learning ensemble, Google Gemini 3.5 Flash generative endocrinology, wearable CGM telemetry, and hospital-ready FHIR R4 / CDA exports.**

[Explore Live Web App](https://diabetes-prediction-ten-eta.vercel.app) • [View API Docs](https://diabetes-prediction-api-9hx8.onrender.com/docs) • [Report an Issue](https://github.com/sam-black007/diabetes-prediction/issues)

</div>

> ⚠️ **Clinical Education & Screening Notice:** This platform is designed for preventive risk stratification, educational triage, and physician discussion. It does not provide a definitive medical diagnosis. Clinical findings should be confirmed via venous plasma fasting glucose or standardized HbA1c tests.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Visual Showcase & Gallery](#-visual-showcase--gallery)
- [System Architecture & Flowcharts](#-system-architecture--flowcharts)
  - [1. High-Level System Architecture](#1-high-level-system-architecture)
  - [2. End-to-End Clinical & ML Inference Pipeline](#2-end-to-end-clinical--ml-inference-pipeline)
  - [3. Wearable Telemetry & Offline-First Sync Flow](#3-wearable-telemetry--offline-first-sync-flow)
  - [4. Conversational "Ask Dr. Gemini" Endocrinology Agent](#4-conversational-ask-dr-gemini-endocrinology-agent)
- [Machine Learning Ensemble & Calibration](#-machine-learning-ensemble--calibration)
- [Wearable CGM & Biometric Telemetry](#-wearable-cgm--biometric-telemetry)
- [Generative Endocrinology with Google Gemini](#-generative-endocrinology-with-google-gemini)
- [ADA 2026 Diet & Lifestyle Action Engine](#-ada-2026-diet--lifestyle-action-engine)
- [Hospital EHR Export & Interoperability](#-hospital-ehr-export--interoperability)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Deployment Architecture](#-deployment-architecture)
- [API Reference](#-api-reference)
- [Contributors & License](#-contributors--license)

---

## 🌟 Key Features

| Capability | Technical Implementation | Highlights |
| :--- | :--- | :--- |
| **Calibrated 5-Model ML Ensemble** | Soft-voting ensemble: Logistic Regression, Random Forest, Gradient Boosting, SVM, and native XGBoost with Platt Sigmoid Calibration and 90% split-conformal prediction intervals. | F1-score: **0.727**, AUC: **0.825**, decision threshold **0.26**, uncertainty quantification (`q ≈ 0.696`). |
| **SHAP Explainability** | XGBoost native `pred_contribs` Tree-SHAP computation. | Instant feature attribution breakdown per patient without external heavy dependency overhead. |
| **Google Gemini AI Intelligence** | Integration with `gemini-3.5-flash` model via Next.js server route and local key manager. | Real-time clinical executive synthesis, pathophysiological mechanics breakdown, physician talking points, and interactive **"Ask Dr. Gemini"** Q&A. |
| **Wearable CGM & Device Telemetry** | Connectors for Dexcom G7/Stelo, FreeStyle Libre 2/3, Apple HealthKit, and Google Fit / Health Connect. | Real-time glucose streaming, resting HR, blood pressure, sleep duration, and **1-click auto-fill** into the screening wizard. |
| **Offline-First PWA Architecture** | Workbox Service Worker, IndexedDB (`idb`), and resilient local store (`local-store.ts`). | Full functionality without internet. Background synchronization queue automatically flushes pending screenings on reconnect. |
| **ADA 2026 Nutrition & Action Plan** | Dynamic macronutrient engine based on American Diabetes Association 2026 Standards of Care. | Personalized daily caloric targets, carb/protein/fat distribution grams, structured exercise prescriptions, and metabolic priority roadmap. |
| **Lab Report OCR Extractor** | Tesseract-compatible optical biomarker parsing and regex heuristics. | Instant extraction of Fasting Plasma Glucose, HbA1c, Lipid profile (Total, HDL, LDL, Triglycerides), and Blood Pressure from PDF/image reports. |
| **Hospital-Grade EHR Exports** | Client-side `@react-pdf/renderer` + Server-side ReportLab, HL7 FHIR STU3, and CDA R2 XML. | Clinical PDF summaries formatted for hospital records, clinical notes, and physician referral. |
| **Modern Dark/Light UI/UX** | Tailwind CSS, Radix UI primitives, shadcn/ui components, and Lucide icons. | Smooth theme toggling with persistent user preference and responsive design across desktop, tablet, and mobile. |

---

## 📸 Visual Showcase & Gallery

<div align="center">

### 1. Generative Endocrinology & Dynamic Clinical Synthesis (Google Gemini 3.5 Flash)
*Dynamic executive risk assessment, pathophysiology explanation, target metabolic priorities, and physician talking points.*

![Gemini Dynamic Clinical Synthesis](assets/screenshots/01_gemini_dynamic_synthesis.png)

---

### 2. Interactive "Ask Dr. Gemini" Endocrinology Q&A Chat
*Context-aware conversational patient assistant conditioned on patient vitals, SHAP attributions, and ADA 2026 guidelines.*

![Ask Dr. Gemini Chat](assets/screenshots/02_ask_dr_gemini_chat.png)

---

### 3. Wearable Device Connectors & Live Telemetry Stream
*Real-time pairing with Dexcom CGM, FreeStyle Libre, Apple Health, and Android Health Connect with 1-click wizard auto-fill.*

![Connected Devices & Telemetry](assets/screenshots/03_connected_devices_telemetry.png)

---

### 4. ADA 2026 Personalized Nutrition & Lifestyle Action Plan
*Target daily calories, macro distribution (carbs, proteins, fats), resistance & aerobic plans, and metabolic roadmaps.*

![ADA Action Plan & Diet](assets/screenshots/04_ada_action_plan_diet.png)

---

### 5. Multi-Metric Clinical Results, SHAP Importance & Risk Simulator
*Calibrated risk gauge, conformal confidence intervals, Tree-SHAP waterfall contribution, and interactive lifestyle simulator.*

![Clinical Results & SHAP](assets/screenshots/05_clinical_results_shap_simulator.png)

---

### 6. Automated Lab Report OCR & Biomarker Extraction
*Upload lab documents or images to automatically extract and populate fasting glucose, lipid panels, and blood pressure.*

![Lab Report OCR](assets/screenshots/06_lab_report_ocr_extractor.png)

---

### 7. Modern Dark Mode Clinical Dashboard
*High-contrast dark mode tailored for clinical and night-time operation.*

![Dark Mode Dashboard](assets/screenshots/07_modern_dark_landing.png)

---

### 8. Gemini API Key Configuration & Verification Center
*Secure client-side and server-side API key management with live model diagnostics and connectivity verification.*

![Gemini Settings](assets/screenshots/08_gemini_settings_configuration.png)

</div>

---

## 🏗️ System Architecture & Flowcharts

### 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph CLIENT["Client Layer (Next.js 14 PWA on Vercel)"]
        direction TB
        UI["Modern Clinical UI (Tailwind + shadcn/ui)"]
        Wizard["3-Step Screening Wizard"]
        DevicesUI["Wearable Devices & CGM Center"]
        GeminiChatUI["Ask Dr. Gemini Interactive Chat"]
        LocalStore["Offline Engine (IndexedDB + localStorage)"]
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

    subgraph BACKEND["Backend ML & API Layer (FastAPI on Render)"]
        direction TB
        APIRouter["FastAPI API Router (/api/v1/*)"]
        RulesEngine["ADA 2026 / AHA Rules Engine"]
        MLEnsemble["5-Model Soft Voting Ensemble"]
        PlattCalib["Platt Sigmoid Calibrator"]
        ConformalEval["Split-Conformal 90% Intervals"]
        TreeSHAP["Native Tree-SHAP Explainer"]
        ExportEngine["EHR Export (FHIR R4 / CDA / PDF)"]
    end

    subgraph AI_SERVICES["Generative AI Layer"]
        direction TB
        GeminiAPI["Google Gemini 3.5 Flash API"]
        PromptEngine["ADA Endocrinology Clinical Prompts"]
    end

    subgraph CLOUD_PERSISTENCE["Cloud Persistence & Auth Layer (Optional)"]
        direction TB
        SupabaseDB["Supabase PostgreSQL (RLS Enforced)"]
        ClerkAuth["Clerk User Authentication"]
        UpstashRedis["Upstash Redis (Rate Limiting)"]
    end

    %% Client Interactions
    Dexcom -->|Realtime Glucose| DevicesUI
    Libre -->|Flash Glucose| DevicesUI
    AppleHealth -->|Blood Pressure & Vitals| DevicesUI
    GoogleFit -->|Steps & Activity| DevicesUI
    LabOCR -->|Extracted Biomarkers| Wizard

    DevicesUI -->|1-Click Auto-fill| Wizard
    Wizard -->|Local Save| LocalStore
    LocalStore -->|Offline Enqueue| SyncQueue

    %% Client to Backend
    Wizard -->|POST /api/v1/screening| APIRouter
    SyncQueue -.->|Flush On Reconnect| APIRouter

    %% Backend ML Pipeline
    APIRouter --> RulesEngine
    RulesEngine --> MLEnsemble
    MLEnsemble --> PlattCalib
    PlattCalib --> ConformalEval
    ConformalEval --> TreeSHAP
    TreeSHAP --> APIRouter

    %% Generative AI
    Wizard -->|Vitals + SHAP JSON| PromptEngine
    GeminiChatUI -->|Patient Question + Context| PromptEngine
    PromptEngine --> GeminiAPI
    GeminiAPI -->|Structured Clinical Insights| Wizard
    GeminiAPI -->|Conversational Answer| GeminiChatUI

    %% Cloud Storage
    APIRouter -.->|Persist Screenings| SupabaseDB
    APIRouter -.->|Verify JWT| ClerkAuth
    APIRouter -.->|Throttle Requests| UpstashRedis
```

---

### 2. End-to-End Clinical & ML Inference Pipeline

```mermaid
flowchart LR
    subgraph INGESTION["1. Ingestion"]
        direction TB
        ManualInput["Manual Vitals Entry"]
        DeviceFeed["CGM / Wearable Telemetry"]
        OCRFeed["Lab OCR Extraction"]
    end

    subgraph TRIAGE["2. Clinical Rules (ADA 2026)"]
        direction TB
        EmergencyCheck{"Fasting Glucose >= 300 or SBP >= 180?"}
        CriticalFlag["Immediate Medical Triage Alert"]
        StandardCheck["Standard Stratification"]
    end

    subgraph ENSEMBLE["3. Machine Learning Ensemble"]
        direction TB
        Scaler["StandardScaler (PIMA Calibrated)"]
        LR["Logistic Regression"]
        RF["Random Forest (n=100)"]
        GB["Gradient Boosting (n=100)"]
        SVM["Support Vector Machine (RBF)"]
        XGB["XGBoost (native)"]
        SoftVoting["Uniform Soft-Voting Fusion"]
    end

    subgraph UNCERTAINTY["4. Calibration & Uncertainty"]
        direction TB
        Platt["Platt Sigmoid Scaling (calibrator.joblib)"]
        Conformal["Split-Conformal 90% Bounds (q ≈ 0.696)"]
        SHAP["XGBoost pred_contribs Tree-SHAP"]
    end

    subgraph SYNTHESIS["5. Synthesis & Delivery"]
        direction TB
        GeminiAgent["Gemini 3.5 Flash Clinical Synthesis"]
        NutritionEngine["ADA 2026 Macro & Diet Planner"]
        ReportDelivery["Interactive UI + Hospital PDF + FHIR"]
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

    SHAP --> GeminiAgent
    SHAP --> NutritionEngine
    GeminiAgent & NutritionEngine --> ReportDelivery
```

---

### 3. Wearable Telemetry & Offline-First Sync Flow

```mermaid
flowchart TD
    StartPair["User Selects Device: Dexcom, Libre, Apple Health, or Google Fit"]
    CheckMode{"Remote Database Configured?"}
    
    StartPair --> CheckMode
    CheckMode -->|Yes| RemotePersist["Save Connection to Supabase PostgreSQL"]
    CheckMode -->|No| LocalPersist["Save Connection to Browser Local Storage Engine"]
    
    RemotePersist --> PollStream["Poll / Stream Telemetry Data"]
    LocalPersist --> PollStream
    
    PollStream --> ShowVitals["Display Real-time Telemetry: Glucose, BP, Steps, HR, Sleep"]
    ShowVitals --> ClickAutofill["User Clicks 'Auto-fill New Screening'"]
    ClickAutofill --> PopulateWizard["Transfer Sensor Values directly into Step 1 & Step 2 Forms"]
    
    PopulateWizard --> SubmitScreening["Submit Screening Assessment"]
    CheckOnline{"Device Online?"}
    SubmitScreening --> CheckOnline
    
    CheckOnline -->|Online| CallAPI["Execute Live Inference via FastAPI API"]
    CheckOnline -->|Offline| QueueLocal["Save to IndexedDB Offline Queue + Offline Fallback Assessment"]
    
    QueueLocal --> ReconnectEvent["Browser Detects 'online' Event"]
    ReconnectEvent --> FlushQueue["Automatically Post Pending Queue to Server"]
    FlushQueue --> UpdateHistory["Refresh Screening History Table"]
    CallAPI --> UpdateHistory
```

---

### 4. Conversational "Ask Dr. Gemini" Endocrinology Agent

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
    Gemini-->>Route: Return Executive Summary, Pathophysiology, Priorities, Talking Points
    Route-->>UI: Render Dynamic Clinical Insights Card
    
    Note over Patient,UI: Patient wants deeper clarification
    Patient->>UI: Types question: "How does my fasting glucose affect my heart?"
    UI->>Route: POST /api/gemini (action: chat)
    Route->>Engine: Combine patient context + chat history + clinical guardrails
    Engine->>Gemini: Stream query with ADA 2026 endocrinology guidelines
    Gemini-->>Route: Stream natural-language clinical explanation
    Route-->>UI: Render real-time conversational response from Dr. Gemini
```

---

## 🤖 Machine Learning Ensemble & Calibration

The core predictive engine is trained on the curated **PIMA Indians Diabetes Database** (768 clinical observations across 8 diagnostic biomarkers).

### Ensemble Model Comparison & Metrics

| Model Architecture | F1 Score | ROC AUC | Sensitivity (Recall) | Specificity | Role in Production |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Gradient Boosting (Baseline)** | 0.592 | 0.823 | 0.612 | 0.841 | Fallback single-tree engine |
| **Random Forest (100 Trees)** | 0.648 | 0.819 | 0.655 | 0.832 | Non-linear feature interactions |
| **Support Vector Machine (RBF)** | 0.624 | 0.812 | 0.630 | 0.825 | Maximum margin separator |
| **Logistic Regression (L2)** | 0.635 | 0.821 | 0.642 | 0.838 | Linear baseline probability |
| **XGBoost (Histogram / Exact)** | 0.672 | 0.826 | 0.680 | 0.846 | Gradient boosted decision trees |
| **Soft-Voting Ensemble** | 0.681 | 0.825 | 0.694 | 0.852 | Blended probability aggregation |
| **⭐️ Ensemble + Platt Sigmoid Calibration** | **0.727** | **0.825** | **0.741** | **0.867** | **Active Production Pipeline** |
| **Split-Conformal 90% Bounds** | — | — | — | — | $q \approx 0.696$, empirical coverage **88.3%** |

### Evaluation Visualizations

<div align="center">

| Model Comparison | Feature Importance (SHAP) |
| :---: | :---: |
| <img src="plots/5_model_comparison.png" width="440" alt="Model Comparison" /> | <img src="plots/7_feature_importance.png" width="440" alt="Feature Importance" /> |

| ROC Curve Trajectory | Biomarker Boxplots |
| :---: | :---: |
| <img src="plots/6_roc_curves.png" width="440" alt="ROC Curves" /> | <img src="plots/4_boxplots_by_outcome.png" width="440" alt="Boxplots" /> |

</div>

---

## ⌚ Wearable CGM & Biometric Telemetry

DiabetesRisk Intelligence pairs seamlessly with modern continuous glucose monitoring (CGM) sensors and fitness ecosystems:

- **Dexcom G7 / Stelo CGM:** Direct continuous interstitial glucose telemetry streaming with trend arrows and hyper/hypoglycemia event monitoring.
- **Abbott FreeStyle Libre 2 & 3:** Flash glucose monitoring with estimated glucose variability and Time-in-Range (TIR).
- **Apple HealthKit:** Pulls resting heart rate, daily walking step count, active calories, sleep duration, and blood pressure via HealthKit export.
- **Google Fit / Health Connect:** Pulls Android sensor metrics and cardiovascular activity.
- **1-Click Auto-Fill:** Transfer live biometric data directly into the screening form to eliminate manual data entry.

---

## 🧠 Generative Endocrinology with Google Gemini

Powered by Google's flagship **`gemini-3.5-flash`** model, the platform enhances quantitative ML scores with deep clinical context:

1. **Executive Endocrinology Assessment:** High-level clinical synthesis written in clear, physician-calibrated language.
2. **Pathophysiological Mechanics:** Explains *why* the patient's specific glucose, BMI, and family history produce their calculated risk profile.
3. **Target Metabolic Priorities:** Three prioritized, actionable interventions ranked by potential risk reduction.
4. **Physician Discussion Points:** Formatted questions and clinical topics prepared for the patient's next doctor appointment.
5. **Interactive "Ask Dr. Gemini" Q&A:** In-session conversational chatbot that answers questions about medications, diet adjustments, and lab values while adhering strictly to ADA 2026 clinical guidelines.

---

## 🥗 ADA 2026 Diet & Lifestyle Action Engine

Generates an individualized evidence-based lifestyle intervention following the **American Diabetes Association 2026 Standards of Medical Care**:

- **Calorie & Macro Breakdown:** Dynamically estimates Total Daily Energy Expenditure (TDEE) and sets caloric intake with exact gram targets for:
  - Complex carbohydrates (low glycemic index, $\geq 30\text{g}$ dietary fiber)
  - Lean proteins ($1.2\text{--}1.5\text{g/kg}$ target)
  - Heart-healthy monounsaturated and polyunsaturated fats
- **Exercise Prescription:** Structured weekly aerobic exercise ($\geq 150\text{ mins/week}$) and resistance training regimens.
- **Sleep & Stress Targets:** Circadian guidance aimed at reducing cortisol and nocturnal insulin resistance.

---

## 🏥 Hospital EHR Export & Interoperability

Export clinical screening documentation in standard health informatics formats:

- **Hospital-Ready PDF:** Comprehensive 2-page clinical report including patient demographics, biometric gauges, SHAP attribution chart, Gemini synthesis, and physician sign-off block.
- **HL7 FHIR STU3 / R4:** Generates structured FHIR `Observation`, `RiskAssessment`, and `Patient` resource bundles ready for EHR ingestion (Epic, Cerner).
- **CDA R2 (Clinical Document Architecture):** XML-based structured health document compliant with HL7 CDA standard.

---

## 💻 Tech Stack

```text
Frontend:              Next.js 14 (App Router) • React 18 • TypeScript • Tailwind CSS • shadcn/ui
State & Offline:       TanStack Query v5 • Zustand • idb (IndexedDB) • next-pwa (Workbox)
Backend ML Engine:     FastAPI • Python 3.11 • Uvicorn • Pydantic v2 • NumPy • Pandas
Machine Learning:      scikit-learn • XGBoost (native Tree-SHAP) • Platt Calibration • Joblib
Generative AI:         Google Gemini 3.5 Flash (@google/generative-ai & REST)
Cloud Database & Auth: Supabase PostgreSQL (pgvector, RLS) • Clerk JWT (optional) • Upstash Redis
Deployment:            Vercel (Frontend CDN/Serverless) + Render (Containerized ML API)
Testing:               Pytest • Coverage.py • Playwright E2E • ESLint • TypeScript strict
```

---

## 📂 Project Structure

```text
diabetes-prediction/
├── app/                                 # Next.js 14 PWA frontend
│   ├── src/
│   │   ├── app/                         # App Router (screening, devices, history, settings)
│   │   │   ├── api/gemini/route.ts      # Server-side Gemini API route
│   │   │   └── (dashboard)/             # Protected dashboard layouts & views
│   │   ├── components/
│   │   │   ├── screening/               # Wizard, ResultView, GeminiDynamicInsights, ActionPlan
│   │   │   ├── devices/                 # DevicesClient, sensor telemetry streamers
│   │   │   ├── history/                 # HistoryTable, trend charts
│   │   │   └── settings/                # GeminiSettingsCard, theme toggles, API keys
│   │   ├── hooks/                       # useScreening, useDevices, useHistory, useOfflineStore
│   │   └── lib/                         # gemini.ts, api.ts, local-store.ts, pdf-generate.tsx
│   ├── public/                          # PWA manifest, service worker, icons
│   └── next.config.js                   # API rewrites & headers
├── api/
│   └── python/                          # FastAPI backend
│       ├── main.py                      # FastAPI application entry point
│       ├── routes/                      # screening, devices, history, third_party
│       ├── services/                    # screening_engine, device_sync, export_engine
│       ├── models/                      # Pydantic v2 schema definitions
│       ├── db/                          # Supabase PostgreSQL asyncpg connection & migrations
│       └── requirements.txt             # Python dependencies
├── data/
│   ├── raw/diabetes.csv                 # PIMA Indians Diabetes Database
│   └── processed/                       # Serialized ensemble & calibrator joblib files
├── plots/                               # ML evaluation charts & feature importance plots
├── assets/
│   └── screenshots/                     # Showcase screenshots for documentation
├── scripts/
│   └── train_ensemble.py                # Pipeline script to train, calibrate & export models
└── tests/                               # Backend unit & integration test suites
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites

- **Node.js:** `v20.x` or later
- **Python:** `3.11.x`
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/sam-black007/diabetes-prediction.git
cd diabetes-prediction
```

### 2. Configure Environment Variables

Create `.env` in the root (or copy from `.env.example`):

```bash
cp .env.example .env
```

Key environment configurations:

```env
# Gemini API Key for Generative AI (can also be entered in /settings)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Backend URL (for frontend API rewrites)
NEXT_PUBLIC_API_URL=http://localhost:8000
API_INTERNAL_URL=http://localhost:8000

# Database (optional - app defaults to offline-first local mode if omitted)
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
```

### 3. Start Backend ML Engine (FastAPI)

```bash
cd api/python
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Verify backend health at `http://localhost:8000/health`. Interactive Swagger docs are available at `http://localhost:8000/docs`.

### 4. Start Frontend Application (Next.js 14)

In a new terminal:

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deployment Architecture

The application is deployed using a production-grade split architecture:

```text
┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
│       VERCEL (Frontend PWA)          │          │      RENDER (Containerized API)      │
│  • Next.js 14 Edge/Node Serverless   │  HTTPS   │  • FastAPI Python 3.11               │
│  • Global Anycast Edge CDN           │ ───────> │  • Uvicorn ASGI Worker               │
│  • Gemini 3.5 Flash Server Proxy     │          │  • scikit-learn + XGBoost Ensemble   │
│  • Client-side PDF Generation        │          │  • 512 MB Low-Footprint Container    │
└──────────────────────────────────────┘          └──────────────────────────────────────┘
                   │                                                 │
                   ▼                                                 ▼
┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
│         BROWSER LOCAL ENGINE         │          │         SUPABASE POSTGRESQL          │
│  • IndexedDB (Pending Sync Queue)    │          │  • Row-Level Security (RLS)          │
│  • Local Device Pairing Persistence  │          │  • Screenings & Wearable Storage     │
│  • Workbox PWA Service Worker        │          │  • Active-Healthy in ap-northeast-1  │
└──────────────────────────────────────┘          └──────────────────────────────────────┘
```

- **Frontend:** Hosted on Vercel ([https://diabetes-prediction-ten-eta.vercel.app](https://diabetes-prediction-ten-eta.vercel.app))
- **Backend ML API:** Hosted on Render ([https://diabetes-prediction-api-9hx8.onrender.com](https://diabetes-prediction-api-9hx8.onrender.com))
- **Cloud Database:** Hosted on Supabase (`sam-black007's Project`, ref `odhjvhwpfpmdcahzxbcz`)

---

## 📡 API Reference

All backend endpoints are prefixed with `/api/v1/`.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/screening` | Evaluates patient input via 5-model ensemble, calibration, and rules. | Optional |
| `GET` | `/api/v1/screening/{id}` | Retrieves full screening result by UUID. | Optional |
| `GET` | `/api/v1/devices` | Lists paired wearable sensors and biometrics. | Yes |
| `POST` | `/api/v1/devices` | Pairs a new wearable device connector. | Yes |
| `POST` | `/api/v1/devices/{id}/sync` | Triggers a fresh telemetry sync from a paired device. | Yes |
| `DELETE`| `/api/v1/devices/{id}` | Unpairs and disconnects a device connector. | Yes |
| `GET` | `/api/v1/history` | Fetches historical screenings with pagination & risk filters. | Yes |
| `POST` | `/api/v1/export/pdf` | Generates a 2-page hospital-grade clinical PDF. | No |
| `POST` | `/api/v1/export/fhir` | Exports screening as HL7 FHIR STU3 / R4 bundle. | No |
| `POST` | `/api/v1/export/cda` | Exports screening as Clinical Document Architecture (CDA) XML. | No |
| `GET` | `/api/v1/health` | Service health, version, and model status check. | No |

---

## 👥 Contributors & Acknowledgements

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/sam-black007">
        <img src="https://github.com/sam-black007.png" width="100px" alt="sam-black007"/><br />
        <sub><b>SAM JOSEPH . B</b></sub><br />
        <sub>Lead Developer & Architect</sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Thavina22">
        <img src="https://github.com/Thavina22.png" width="100px" alt="Thavina22"/><br />
        <sub><b>Thavina A</b></sub><br />
        <sub>Collaborator & Researcher</sub>
      </a>
    </td>
  </tr>
</table>

- **Dataset:** National Institute of Diabetes and Digestive and Kidney Diseases (PIMA Indians Diabetes Database).
- **Clinical Guidelines:** American Diabetes Association (ADA) 2026 Standards of Medical Care in Diabetes, ACC/AHA 2025 Prevention Guidelines.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).

---

<div align="center">
<b>DiabetesRisk Intelligence V2.0</b> • Built with precision for clinical triage & proactive metabolic health.
</div>
