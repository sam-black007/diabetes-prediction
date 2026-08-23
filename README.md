# Diabetes Risk Intelligence — AI Agent

> 🚀 **Try it live:** [diabetes-prediction-v0.streamlit.app](https://diabetes-prediction-v0.streamlit.app)

This project is powered by a **multi-agent AI layer** (`src/ai_agents.py`) that turns a
diabetes-screening web app into a conversational, explainable assistant. The AI does the
talking: it reads lab reports, asks follow-up questions, explains verdicts in plain language,
and pulls the latest prevention guidance from authoritative health sources.

Everything below describes the **AI agent** — how it's built, what each agent does, how to
configure it, and how we keep it fast.

---

## What the AI agent does

The agent is a collection of small, single-purpose functions, each calling a cloud LLM
through one OpenAI-compatible client. No local model is required — it always works, even
falling back to built-in offline rules if no API key is set.

| Agent | Function | What it does |
|-------|----------|--------------|
| **Chat assistant** | `chat_agent` | Friendly Q&A about diabetes risk, the 8 screening features, and lifestyle. Reminds users it's not a doctor. |
| **Report reviewer** | `validate_and_explain_report` | In ONE call, re-reads the OCR text, cross-checks the parser's numbers (listing corrections) AND writes the patient-friendly explanation of the WHO/ADA conclusion — halves the report tab's AI calls. |
| **Field extractor** | `extract_patient_fields` | Pulls the 8 screening values from a free-text conversation as structured JSON. |
| **Lifestyle extractor** | `extract_lifestyle` | Pulls self-known lifestyle details (age, sex, activity, diet…) from a chat. |
| **Missing-field collector** | `collect_missing_fields` | Parses a free-text reply into exactly the values the app still needs. |
| **Risk assessor** | `assess_diabetes_risk` | Returns a JSON verdict (diabetic / not), probability, reasoning, next steps, and which important values are still missing. |
| **Data enricher** | `enrich_patient_data` | Infers non-clinical lifestyle context (activity, diet, sleep, stress, tips) from a description. |
| **Web researcher** | `web_research_agent` | Summarizes the latest diabetes guidance, preferring WHO / CDC / NIDDK / IDF / ADA sources. |
| **Next-step advisor** | `suggest_next_steps` | After a result, returns personalized, value-driven next-step tips (one cached call). |
| **Missing-value suggester** | `suggest_missing_values` | When a user doesn't know a value, the AI proposes a plausible typical value so the screening isn't left blank. |

---

## How it works

A single `AIClient` wraps an OpenAI-compatible client. It auto-detects the provider from the
API key prefix, so you only set credentials — no code changes:

- `sk-or-…` → **OpenRouter** (many models, `:free` models cost nothing)
- `AIza…` / `AQ.…` → **Google Gemini** (free tier, fast)
- `sk-ws-…` → **Alibaba MaaS workspace** (custom endpoint)
- Otherwise → uses `AI_PROVIDER` to pick a preset (`deepseek`, `qwen`, `kimi`, `siliconflow`, `openai`)

Built-in presets (in `PROVIDER_PRESETS`):

| Provider | Default model | Base URL |
|----------|---------------|----------|
| `openrouter` | `nvidia/nemotron-3-nano-30b-a3b:free` | `https://openrouter.ai/api/v1` |
| `google` / `gemini` | `gemini-3.6-flash` | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `deepseek` | `deepseek-chat` | `https://api.deepseek.com` |
| `qwen` | `qwen-turbo` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `kimi` | `moonshot-v1-8k` | `https://api.moonshot.cn/v1` |
| `siliconflow` | `deepseek-ai/DeepSeek-V3` | `https://api.siliconflow.cn/v1` |
| `openai` | `gpt-4o-mini` | (official) |

All providers are OpenAI-compatible, so the agent just points the client at the right `base_url`.

### Reading lab reports (OCR)

Report photos/PDFs are read with the **strongest OCR engine available**, tried in
this order: **EasyOCR** (preferred, if installed) → **RapidOCR** → **Tesseract**, over
several preprocessed image variants, then merged. The raw OCR text is handed to the
AI so it can read the report directly and catch values the parser misses. Enable the
stronger engine with `pip install easyocr` (the app falls back automatically if it's
absent).

---

## Configuration

Set these in `.env` (or Streamlit Cloud → **Secrets**). Only `AI_API_KEY` is required.

```bash
# Which provider preset to use (google | deepseek | qwen | kimi | siliconflow | openai)
AI_PROVIDER=qwen

# Your API key for that provider (OPENAI_API_KEY also accepted)
AI_API_KEY=sk-...

# Optional: override the model name
AI_MODEL=qwen-turbo

# Optional: override the base URL (needed for custom endpoints like Alibaba MaaS)
AI_BASE_URL=https://ws-....maas.aliyuncs.com/compatible-mode/v1
```

If no key is present, the app runs in **offline mode** using built-in rule-based responses,
so it never breaks.

---

## Performance — keeping responses under ~5 seconds

Slow AI responses are the #1 usability problem, so the agent is tuned for speed:

1. **Fast model by default** — ships on `qwen-turbo` (or `gemini-3.6-flash` for Google),
   not the heavier `qwen-plus`, to cut per-call latency.
2. **Capped output** — every completion is limited to `_MAX_TOKENS` (700) so the model
   stops generating early instead of rambling.
3. **Response cache** — identical prompts (common when Streamlit re-runs the script on every
   widget interaction) are served from an in-memory cache, skipping the network call entirely.
4. **Fail-fast timeouts** — the client uses `timeout=45` and `max_retries=1` instead of the
   SDK defaults (~600s), so a stalled endpoint fails quickly rather than hanging the UI.
5. **Short backoff** — on rate-limit it waits 3s / 6s (was 8s / 16s) before retrying.

Each interaction is one or two LLM calls, so with a fast model + caching the typical reply
lands well under 5 seconds.

---

## Offline fallbacks

If the AI service is unavailable, rate-limited, or unconfigured, every agent degrades
gracefully:

- `offline_chat()` — general diabetes Q&A guidance.
- `offline_enrich()` — heuristic lifestyle enrichment (activity / diet / smoking / tips).
- The risk verdict falls back to **WHO/ADA threshold rules** (fasting ≥126, after-meal ≥200,
  HbA1c ≥6.5% → diabetes range).

The app always works — the AI just makes it smarter.

---

## Project layout (AI-focused)

```
src/
  ai_agents.py          the AI agent layer (all agents + AIClient + offline fallbacks)
  report_parser.py      reads lab-report PDFs / images (OCR text fed to the AI)
  risk_questionnaire.py FINDRISC lifestyle risk score
app.py                  Streamlit app that wires the agents into the UI
tests/
  test_project.py       automated sanity checks
requirements.txt
```

---

## Run it

```bash
pip install -r requirements.txt
python -m streamlit run app.py
```

Open **http://localhost:8501**. The app shows the AI status (online provider or offline)
and never blocks on a missing key.

---

## Safety

The AI agent provides **screening and education only — not a medical diagnosis**. Its chat
replies are general guidance, not personalized medical advice. A positive result should
always be confirmed with a clinician via a fasting glucose / HbA1c test per WHO & IDF guidance.

---

## License

Released under the **MIT License** — free to use, modify, and share.
See [LICENSE](LICENSE).
