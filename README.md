# Diabetes Risk Intelligence

A clinical-grade diabetes risk screening platform that combines **ADA 2026 / AHA-ACC 2025 clinical rules** with a **calibrated soft-voting machine learning ensemble** (Logistic Regression, SVM, Random Forest, Gradient Boosting, XGBoost) trained on the PIMA dataset.

Built as a **Next.js 14 + FastAPI monorepo**, deployed as a split architecture: Next.js frontend on Vercel, ML API in a container on Render. Hospital and lab systems can integrate results through **FHIR R4 / CDA** exports and a **scoped third-party API**.

> ⚠️ **Screening and education only — not a medical diagnosis.** Always confirm results with a clinician.

---

## Live Demo

| Component | URL |
|-----------|-----|
| **Frontend** | https://diabetes-prediction-ka8j5q753-thavina-s-projects.vercel.app/ |
| **ML API** | https://diabetes-prediction-api-lemv.onrender.com/health |

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [ML Model](#ml-model--performance)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Contributing](#contributing)
- [Contributors](#contributors)
- [License](#license)
- [Medical Disclaimer](#medical-disclaimer)

---

## Architecture

The system uses a split-host deployment to fit within free-tier resource limits while maintaining a same-origin client experience:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    VERCEL — Frontend (Free Tier)                       │
│                                                                         │
│  Next.js 14 · React 18 · TypeScript · Tailwind · shadcn/ui              │
│  Root Directory: /app                                                   │
│                                                                         │
│  Browser only ever talks to Next.js.                                    │
│  next.config.js rewrites /api/v1/* → internal API proxy.                │
│                                                                         │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                    (Same-origin rewrite)
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     RENDER — API (Free Tier, 512 MB)                   │
│                                                                         │
│  FastAPI · Python 3.11 · uvicorn                                       │
│  scikit-learn · XGBoost (native pred_contribs)                         │
│  Platt sigmoid calibration · reportlab                                 │
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐                          │
│  │  Neon Postgres   │    │  Clerk (Auth)    │                          │
│  │  (optional)      │    │  (optional)      │                          │
│  └──────────────────┘    └──────────────────┘                          │
│                                                                         │
│  ┌──────────────────┐                                                   │
│  │  Upstash Redis   │                                                   │
│  │  (rate limit)    │                                                   │
│  └──────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why split?** Render's free tier provides 512 MB RAM — sufficient for the Python ML stack (~266 MB) but not for Next.js + Python together. Vercel's serverless functions cap Python bundles at 500 MB, which the scikit-learn + XGBoost stack (~1 GB unpacked) exceeds. Running both services separately avoids both constraints.

## ML Pipeline

```text
┌────────────────────────────────────────────────────┐
│          PIMA Diabetes Dataset (768 records)     │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│          Preprocessing & Scaling                   │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│    5 Models:                                         │
│    - Logistic Regression                           │
│    - SVM                                           │
│    - Random Forest                                 │
│    - Gradient Boosting                             │
│    - XGBoost                                       │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│          Soft Voting Ensemble (weights: uniform) │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│          Platt Sigmoid Calibration                 │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│         Split-Conformal 90% Prediction Intervals   │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│            Tree-SHAP Explanations (XGBoost native) │
└────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **State** | TanStack Query (server), Zustand (client) |
| **Forms** | React Hook Form + Zod |
| **Backend** | FastAPI, Pydantic v2, uvicorn |
| **Database** | Neon Postgres (serverless, optional) |
| **Auth** | Clerk (optional) |
| **Rate Limiting** | Upstash Redis (optional) |
| **ML** | scikit-learn, XGBoost (native tree-SHAP) |
| **PDF** | reportlab (server), @react-pdf/renderer (client) |
| **PWA** | next-pwa (Workbox), idb |
| **Deploy** | Vercel (frontend) + Render (API) |
| **CI/CD** | GitHub Actions |

---

## ML Model & Performance

**Architecture:** Calibrated soft-voting ensemble trained on the PIMA Indians Diabetes Database (768 records, 8 features).

- **Members:** Logistic Regression, SVM, Random Forest, Gradient Boosting, XGBoost
- **Calibration:** Platt sigmoid (`calibrator.joblib`)
- **Uncertainty:** Split-conformal 90% prediction intervals
- **Explanations:** Tree-SHAP values via XGBoost native `pred_contribs` — no external `shap` dependency

### Performance Metrics

| Model | F1 | AUC | Notes |
|-------|----|-----|-------|
| Gradient Boosting (baseline) | 0.592 | 0.823 | Fallback scorer |
| Soft-voting ensemble | 0.681 | 0.825 | Decision threshold 0.26 |
| **+ Platt calibration** (deployed) | **0.727** | **0.825** | Calibrated probability |
| Conformal interval (90%) | — | — | `q ≈ 0.696`, coverage 0.883 |

### Model Evaluation

<img src="plots/5_model_comparison.png" alt="Model Comparison" width="700" style="border-radius:8px;margin:12px 0"/>
<img src="plots/7_feature_importance.png" alt="Feature Importance" width="700" style="border-radius:8px;margin:12px 0"/>
<img src="plots/6_roc_curves.png" alt="ROC Curves" width="700" style="border-radius:8px;margin:12px 0"/>
<img src="plots/4_boxplots_by_outcome.png" alt="Boxplots by Outcome" width="700" style="border-radius:8px;margin:12px 0"/>
<img src="plots/5_glucose_vs_bmi.png" alt="Glucose vs BMI" width="700" style="border-radius:8px;margin:12px 0"/>

---

## Project Structure

```
diabetes-prediction/
├── app/                          # Next.js 14 frontend
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   ├── components/           # UI, screening, charts, PDF
│   │   ├── lib/                  # API client, auth, validation
│   │   ├── hooks/                # React hooks
│   │   └── types/                # TypeScript types
│   ├── next.config.js            # Vercel rewrite config
│   └── package.json
├── api/
│   └── python/                   # FastAPI backend
│       ├── main.py               # Entry point
│       ├── config.py             # Pydantic settings
│       ├── routes/               # Route handlers
│       ├── services/             # Business logic
│       ├── models/               # Pydantic v2 models
│       ├── db/                   # asyncpg database layer
│       └── requirements.txt
├── scripts/
│   └── train_ensemble.py         # Model training
├── data/
│   └── processed/                # Model artifacts (joblib)
├── plots/                        # Evaluation visualizations
├── Dockerfile                    # Single-container build
├── api/python/Dockerfile         # API-only container build
├── render.yaml                   # Render Blueprint
├── docker-compose.yml            # Local Postgres + Redis
├── deploy/oracle/                # Oracle Always-Free VM bootstrap
├── docs/documentation.md         # Full documentation
├── turbo.json                    # Turborepo pipeline
└── package.json                  # Root workspace
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (optional, for local Postgres + Redis)

### 1. Clone

```bash
git clone https://github.com/sam-black007/diabetes-prediction.git
cd diabetes-prediction
```

### 2. Install Dependencies

```bash
# Frontend
cd app && npm install

# Backend
cd ../api/python && pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
```

| Variable | Purpose | Required |
|----------|---------|----------|
| `API_INTERNAL_URL` | Backend URL for Vercel rewrite | Yes (split deploy) |
| `DATABASE_URL` | Neon Postgres connection string | No |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | No |
| `CLERK_SECRET_KEY` | Clerk backend key | No |
| `CLERK_ISSUER` | Clerk issuer URL | No |
| `CLERK_WEBHOOK_SECRET` | Svix webhook secret | No |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | No |
| `CRON_SECRET` | Cron endpoint protection | No |
| `MODEL_PATH` | Model artifact path | No |

### 4. Run Locally

**Backend:**
```bash
cd api/python
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run Tests

```bash
# Backend
cd api/python
pytest --cov=services --cov=routes

# Frontend
cd app
npm run lint
npm run typecheck
```

---

## Deployment

### Option 1: Split Deployment (Recommended)

**Frontend:** Vercel (free, no card)  
**API:** Render free tier (512 MB, no card)

**Step 1 — Deploy API on Render:**
1. Go to [render.com](https://render.com) → Sign up with GitHub
2. **New +** → **Blueprint** → select `sam-black007/diabetes-prediction` → **Apply**
3. Wait ~5–10 min, copy the API URL

**Step 2 — Deploy Frontend on Vercel:**
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. **Add New → Project** → Import `sam-black007/diabetes-prediction`
3. **Root Directory → Edit → `app`**
4. **Settings → Environment Variables → Production:**
   - `API_INTERNAL_URL` = `https://<your-render-api>.onrender.com`
5. **Deploy**

**Live demo:** https://diabetes-prediction-ka8j5q753-thavina-s-projects.vercel.app/

### Option 2: Single Container

For hosts with 2 GB RAM (e.g., Oracle Cloud Always-Free ARM):

```bash
docker build -t diabetes-prediction .
docker run -p 3000:3000 \
  --env ENVIRONMENT=development \
  --env DEV_AUTH_BYPASS=true \
  diabetes-prediction
```

---

## API Reference

All endpoints are available under `/api/v1/`.

### Screening

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/screening` | Full clinical screening |
| `GET` | `/api/v1/screening/{id}` | Get screening result |

**Request:**
```json
{
  "age": 54,
  "sex": "M",
  "glucose_mg_dl": 148,
  "sbp": 138,
  "dbp": 86,
  "height_cm": 175,
  "weight_kg": 88,
  "ldl_mg_dl": 142,
  "hdl_mg_dl": 38,
  "triglycerides_mg_dl": 190,
  "family_history": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "health_score": 42,
  "risk_category": "very_high",
  "ml_result": {
    "score": 0.473,
    "shap_values": {
      "Pregnancies": 0.080,
      "Glucose": 0.372,
      "BloodPressure": -0.064,
      "SkinThickness": -0.065,
      "Insulin": -0.549,
      "BMI": -0.271,
      "DiabetesPedigreeFunction": 0.048,
      "Age": 0.587
    },
    "shap_base_value": 0.083
  }
}
```

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Service health check |

Response: `{"status":"healthy","version":"2.0.0"}`

### Third-Party API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/third-party/api-keys` | Create API key |
| `POST` | `/api/v1/third-party/screening` | Screening via API key |
| `GET` | `/api/v1/third-party/history` | History via API key |

```bash
curl -H "Authorization: Bearer <api_key>" \
  https://<api-url>/api/v1/third-party/screening \
  -d '{"age":54,"sex":"M",...}'
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "feat: your description"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

Ensure tests pass and follow existing code style conventions.

---

## Contributors

<table>
  <tr>
    <td align="center"><a href="https://github.com/sam-black007"><img src="https://github.com/sam-black007.png" width="80px" alt="sam-black007"/><br /><sub><b>sam-black007</b></sub><br /><sub>SAM JOSEPH . B</sub></a></td>
    <td align="center"><a href="https://github.com/Thavina22"><img src="https://github.com/Thavina22.png" width="80px" alt="Thavina22"/><br /><sub><b>Thavina22</b></sub><br /><sub>Thavina A</sub></a></td>
  </tr>
</table>

---

## License

MIT License — free to use, modify, and share.

---

## Medical Disclaimer

This tool provides **screening and education only — not a medical diagnosis**. Always confirm results with a clinician via fasting glucose / HbA1c testing per WHO and IDF guidance. Do not use this tool to make clinical decisions without professional medical supervision.

---
