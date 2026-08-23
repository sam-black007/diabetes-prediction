import os
import json
import re
import time
import hashlib
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Cloud LLM providers. All are OpenAI-compatible, so we just point the OpenAI
# client at their base_url.
#   AI_PROVIDER = google | deepseek | qwen | kimi | siliconflow | openai
#   AI_API_KEY  = your key from that provider  (OPENAI_API_KEY also accepted)
#   AI_MODEL    = model name (optional override)
#
# Google Gemini (recommended free tier): get a key at https://aistudio.google.com/apikey
#   AI_PROVIDER = "google", AI_API_KEY = "AIza...", AI_MODEL = "gemini-3.6-flash"
def _get(key, default=None):
    # Prefer real environment variables (loaded from .env locally), then fall
    # back to Streamlit secrets so the deployed app works when the key is only
    # set in the Streamlit Cloud "Secrets" panel.
    v = os.getenv(key)
    if v is None:
        try:
            import streamlit as st
            if hasattr(st, "secrets") and key in st.secrets:
                v = st.secrets[key]
        except Exception:
            pass
    if v is not None:
        try:
            v = str(v).strip()
        except Exception:
            pass
    return v if v is not None else default


PROVIDER = (_get("AI_PROVIDER") or "qwen").lower()
API_KEY = _get("AI_API_KEY") or _get("OPENAI_API_KEY")
MODEL = _get("AI_MODEL")
BASE_URL = _get("AI_BASE_URL")

PROVIDER_PRESETS = {
    # OpenRouter — one key, many models; ":free" models cost nothing.
    "openrouter": ("https://openrouter.ai/api/v1", "nvidia/nemotron-3-nano-30b-a3b:free"),
    # Google Gemini - generous free tier via AI Studio; OpenAI-compatible endpoint.
    "google":     ("https://generativelanguage.googleapis.com/v1beta/openai/", "gemini-3.6-flash"),
    "gemini":     ("https://generativelanguage.googleapis.com/v1beta/openai/", "gemini-3.6-flash"),
    # DeepSeek — cheap + free trial credits; strong medical/reasoning.
    "deepseek":   ("https://api.deepseek.com", "deepseek-chat"),
    # Qwen (Alibaba Tongyi) — free monthly quota; strong multilingual medical.
    "qwen":       ("https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-plus"),
    # Kimi (Moonshot) — long-context assistant, free tier.
    "kimi":       ("https://api.moonshot.cn/v1", "moonshot-v1-8k"),
    # SiliconFlow — genuinely free quota, many open Chinese + DeepSeek models.
    "siliconflow":("https://api.siliconflow.cn/v1", "deepseek-ai/DeepSeek-V3"),
    "openai":     (None, "gpt-4o-mini"),
}


# Cap generated tokens so the model stops early — shorter answers = faster
# responses (the main lever for staying under ~5s per call).
_MAX_TOKENS = 700
# In-memory cache so identical prompts (e.g. Streamlit script reruns) don't
# trigger a fresh, slow network call.
_RESPONSE_CACHE = {}
_RESPONSE_CACHE_MAX = 256


def _cache_key(system, messages, model):
    try:
        payload = json.dumps(
            [system, [[m.get("role"), m.get("content")] for m in messages]],
            ensure_ascii=False, sort_keys=True,
        ) + "|" + str(model)
    except Exception:
        return None
    return hashlib.md5(payload.encode("utf-8")).hexdigest()


class AIClient:
    """Cloud LLM client (no local model needed).

    Picks a Chinese provider by default (see PROVIDER_PRESETS). Falls back to a
    built-in offline rule-based responder if no API key is configured, so the
    app always runs.
    """

    def __init__(self):
        self.mode = "offline"
        self.status_detail = "not initialized"
        self._client = None
        self._model = MODEL
        # Alibaba MaaS workspace keys (sk-ws-...) ONLY work on the workspace
        # endpoint — not the public dashscope endpoint and not OpenAI's. Detect
        # by key prefix so it works regardless of AI_PROVIDER / AI_BASE_URL.
        maas_base = "https://ws-8jlpbvhjyuol9pn7.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"
        if not API_KEY:
            self.status_detail = "no AI_API_KEY / OPENAI_API_KEY set (add it in Streamlit secrets)"
            return
        if API_KEY.startswith("sk-ws-") and len(API_KEY) < 40:
            self.status_detail = (f"API key looks truncated (length {len(API_KEY)}) — "
                                  f"paste the FULL key copied from the CSV file")
        try:
            from openai import OpenAI
            if API_KEY.startswith("sk-or-"):
                # OpenRouter key — one API for many models; prefer ":free" models.
                base_url = PROVIDER_PRESETS["openrouter"][0]
                self._model = self._model if (self._model and "/" in self._model) \
                    else PROVIDER_PRESETS["openrouter"][1]
                self.mode = "openrouter"
            elif API_KEY.startswith(("AIza", "AQ.")):
                # Google AI Studio key ("AIza..." classic or "AQ." new format) —
                # use Gemini's OpenAI-compatible endpoint regardless of AI_PROVIDER.
                base_url = PROVIDER_PRESETS["google"][0]
                self._model = self._model or "gemini-3.6-flash"
                if not str(self._model).startswith("gemini"):
                    self._model = "gemini-3.6-flash"
                self.mode = "google"
            elif API_KEY.startswith("sk-ws-"):
                base_url = maas_base
                self._model = self._model or "qwen-plus"
                self.mode = "qwen"
            elif PROVIDER in PROVIDER_PRESETS:
                preset_base, default_model = PROVIDER_PRESETS[PROVIDER]
                base_url = BASE_URL or preset_base
                self._model = self._model or default_model
                self.mode = PROVIDER
            else:
                base_url = BASE_URL
                self.mode = PROVIDER
            if base_url:
                # Cap the client timeout/retries so a stalled endpoint fails fast
                # (default is ~600s + 2 retries, which makes the UI hang for minutes).
                # 15s keeps every AI response under the user's 15-second budget.
                self._client = OpenAI(
                    api_key=API_KEY,
                    base_url=base_url,
                    timeout=15,
                    max_retries=1,
                )
                trunc = f" [key looks truncated, len={len(API_KEY)}]" if len(API_KEY) < 40 else ""
                self.status_detail = f"connected to {base_url}{trunc}"
            else:
                self.mode = "offline"
                self.status_detail = "no base_url for this provider"
        except Exception as e:
            self.mode = "offline"
            self.status_detail = f"client init failed: {type(e).__name__}: {e}"

    def chat(self, messages, system="You are a helpful medical assistant.",
             temperature=0.3, use_cache=True):
        if self._client is not None:
            key = _cache_key(system, messages, self._model) if use_cache else None
            if key is not None and key in _RESPONSE_CACHE:
                return _RESPONSE_CACHE[key]
            last_err = None
            for attempt in range(3):
                try:
                    resp = self._client.chat.completions.create(
                        model=self._model,
                        messages=[{"role": "system", "content": system}] + messages,
                        temperature=temperature,
                        max_tokens=_MAX_TOKENS,
                    )
                    out = resp.choices[0].message.content
                    if key is not None:
                        if len(_RESPONSE_CACHE) >= _RESPONSE_CACHE_MAX:
                            _RESPONSE_CACHE.clear()
                        _RESPONSE_CACHE[key] = out
                    return out
                except Exception as e:
                    last_err = e
                    transient = ("429" in str(e) or "RateLimit" in type(e).__name__
                                 or "quota" in str(e).lower())
                    if transient and attempt < 2:
                        time.sleep(3 * (attempt + 1))
                        continue
                    break
            e = last_err
            if "429" in str(e) or "RateLimit" in type(e).__name__:
                print(f"[AIClient] {PROVIDER} rate-limited: {e}")
                return ("⏳ The free AI tier is busy right now — please wait about a "
                        "minute and try again.\n\n" + offline_chat(messages))
            print(f"[AIClient] {PROVIDER} error: {e}")
            return (
                f"⚠️ The AI service returned an error ({type(e).__name__}). If it's "
                f"401/403, your API key or endpoint is wrong; if it's a connection error, "
                f"the host is blocked. Falling back to general guidance.\n\n"
                + offline_chat(messages)
            )
        return offline_chat(messages)

    def complete(self, prompt, system="You are a helpful medical assistant.", temperature=0.3):
        return self.chat([{"role": "user", "content": prompt}], system, temperature)


def _strip_fences(text):
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


def _extract_json(text):
    text = _strip_fences(text)
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r"\{.*\}", text, re.S)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
    return None


def _ask_json(prompt, system, temperature=0.0, client=None):
    """One cached LLM call, returned as parsed JSON (or None when offline/unparseable)."""
    client = client or AIClient()
    if client.mode == "offline":
        return None
    return _extract_json(client.complete(prompt, system, temperature))


def _to_floats(obj):
    out = {}
    for k, v in (obj or {}).items():
        try:
            if v is not None:
                out[k] = float(v)
        except Exception:
            pass
    return out


# ---------------------------------------------------------------------------
# Agent 1: Conversational chat assistant
# ---------------------------------------------------------------------------
def chat_agent(messages, client=None, system=None):
    client = client or AIClient()
    if system is None:
        system = (
            "You are a friendly diabetes-awareness assistant for a screening app. "
            "Explain diabetes risk in plain language, answer questions about the 8 "
            "screening features (pregnancies, glucose, blood pressure, skin thickness, "
            "insulin, BMI, diabetes pedigree, age), and give general lifestyle guidance. "
            "You are NOT a doctor — always remind users to confirm with a healthcare "
            "professional for medical decisions. Keep replies concise."
        )
    return client.chat(messages, system)


INTAKE_FIELDS = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age",
]


def extract_patient_fields(history, client=None):
    """Pull the 8 screening values from a free-text conversation as a dict."""
    convo = "\n".join(f"{m['role']}: {m['content']}" for m in history)
    prompt = (
        "From the conversation below, extract the patient's known medical values. "
        "Return ONLY JSON (no prose) with these keys (use null if unknown): "
        + ", ".join(INTAKE_FIELDS) + ". "
        "All values must be numeric. Glucose/BloodPressure/Insulin/SkinThickness in "
        "their usual units, BMI as a number, Age in years, Pregnancies as a count, "
        "DiabetesPedigreeFunction as a family-history score (0-2.5). If a value is only "
        "described as 'high'/'normal'/'low' without a number, use null.\n\nConversation:\n"
        + convo
    )
    system = "You are a data-extraction assistant. Respond with valid JSON only."
    data = _ask_json(prompt, system, 0.0, client)
    if not data:
        return {}
    return {f: v for f, v in _to_floats(data).items() if f in INTAKE_FIELDS}


REPORT_VALUE_KEYS = [
    "fasting_glucose_mg_dl", "after_meal_glucose_mg_dl", "hba1c_pct",
    "blood_pressure_systolic", "age", "insulin", "skin_thickness",
    "pregnancies", "weight_kg", "height_cm", "bmi", "diabetes_pedigree_function",
]


def validate_and_explain_report(regex_parsed, outcome, values, ocr_text=None, client=None):
    """One LLM call that cross-checks the OCR/parser values, writes the
    patient-friendly explanation for the rule-based WHO/ADA outcome, AND returns
    personalized next-step tips.

    Pass the raw OCR text so the AI reads the report directly (not only the
    regex parser's output) — this catches values the parser missed.
    Returns (ai_values, corrections, explanation, next_steps) — a single network
    round-trip for the whole report conclusion.
    """
    prompt = (
        "Below is the raw OCR text of a medical lab report, the values a regex parser "
        "extracted from it, the rule-based WHO/ADA conclusion, and the patient's final "
        "values.\n\n"
        f"Raw OCR text:\n{ocr_text or ''}\n\n"
        f"Parser values: {json.dumps(regex_parsed)}\n"
        f"Clinical conclusion: {outcome.get('state', 'Inconclusive')} — "
        f"{outcome.get('detail', '')}\n"
        f"Patient values (for context): {json.dumps(values)}\n\n"
        "Do FOUR things and return ONLY one valid JSON object (no prose) with keys:\n"
        '1) "values": an object with numeric-or-null entries for exactly these keys: '
        + ", ".join(REPORT_VALUE_KEYS) + ". Re-read the RAW OCR text yourself and prefer "
        "it over the parser when they disagree. Normalize glucose to mg/dL (mmol/L * 18) "
        "and HbA1c to percent. Use null when truly absent.\n"
        '2) "corrections": a list of {"field", "regex_value", "ai_value", "reason"} for '
        "every field where your reading differs from the parser's (empty list if none).\n"
        '3) "explanation": 2-4 warm, plain sentences explaining the conclusion using the '
        "patient's actual numbers. End by noting this is screening, not a diagnosis.\n"
        '4) "next_steps": a JSON array of 3-5 short, personalized next-step tips that '
        "follow from these specific numbers (bullet-style strings, no numbering)."
    )
    system = ("You are a careful medical-data extraction and screening assistant. "
              "Respond with valid JSON only.")
    data = _ask_json(prompt, system, 0.2, client)
    if not data:
        return {}, [], "", []
    vals = _to_floats(data.get("values"))
    corr = data.get("corrections")
    corrections = corr if isinstance(corr, list) else []
    explanation = str(data.get("explanation") or "")
    steps = data.get("next_steps")
    next_steps = [str(t) for t in steps] if isinstance(steps, list) else []
    return vals, corrections, explanation, next_steps


def assess_diabetes_risk(values, client=None, context=None):
    """AI-agent diabetes verdict from the patient's screening values.

    Returns {verdict, probability, reasoning, next_steps, missing} where
    "missing" names the important values that were unknown — the app asks
    the user for those instead of guessing.
    """
    ctx = f"\nContext: {context}" if context else ""
    prompt = (
        "You are a diabetes screening assistant. Decide whether this person likely "
        "has diabetes based ONLY on the values below.\n"
        f"Patient values (0 or null means unknown): {json.dumps(values)}{ctx}\n\n"
        'Return ONLY valid JSON with these keys:\n'
        '  "verdict": "diabetic" or "not diabetic"\n'
        '  "probability": number 0-1 estimating probability of diabetes\n'
        '  "reasoning": 2-4 sentences citing the main drivers (glucose/HbA1c first)\n'
        '  "next_steps": array of 2-4 short actionable steps\n'
        '  "missing": array of names of IMPORTANT unknown values that would change '
        'confidence (e.g. "HbA1c", "fasting glucose") — empty if none\n\n'
        "Reference points (WHO/ADA): fasting >=126 mg/dL, after-meal >=200 mg/dL or "
        "HbA1c >=6.5% indicate the diabetes range; 100-125 / 140-199 / 5.7-6.4% "
        "indicate prediabetes. This is screening, not a diagnosis."
    )
    system = "You are a careful medical screening assistant. Respond with valid JSON only."
    data = _ask_json(prompt, system, 0.1, client)
    if not data:
        return {}
    v = str(data.get("verdict", "")).lower()
    out = {"verdict": "not diabetic" if ("not" in v or v in ("no", "negative")) else "diabetic"}
    try:
        p = float(data.get("probability"))
        out["probability"] = p / 100.0 if p > 1 else max(0.0, min(1.0, p))
    except Exception:
        out["probability"] = None
    out["reasoning"] = data.get("reasoning") or ""
    steps = data.get("next_steps")
    out["next_steps"] = [str(s) for s in steps][:5] if isinstance(steps, list) else []
    missing = data.get("missing")
    out["missing"] = [str(m) for m in missing][:6] if isinstance(missing, list) else []
    return out


def collect_missing_fields(answer_text, needed_list, client=None):
    """Parse a free-text patient answer into the specific values we asked for.

    needed_list contains keys like "age", "sex", "weight_kg", "height_cm",
    "hba1c". Returns a dict with only the successfully-parsed keys.
    """
    prompt = (
        "The patient was asked for some health details and replied in their own "
        "words. Extract ONLY these fields from the reply: "
        + ", ".join(needed_list) + ".\n"
        'Return ONLY valid JSON using exactly those keys (numbers as numbers; sex '
        'as "male"/"female"; use null for anything not mentioned).\n\n'
        f"Patient reply: {answer_text}"
    )
    system = "You are a data-extraction assistant. Respond with valid JSON only."
    data = _ask_json(prompt, system, 0.0, client)
    if not data:
        return {}
    out = {}
    for k in needed_list:
        v = data.get(k)
        if v is None or v == "":
            continue
        if k == "sex":
            s = str(v).lower()
            if s.startswith("m"):
                out[k] = "male"
            elif s.startswith("f"):
                out[k] = "female"
        else:
            try:
                out[k] = float(v)
            except Exception:
                pass
    return out


def suggest_next_steps(values, outcome, client=None):
    """Personalized, value-driven next-step suggestions after a screening result.

    One cached LLM call; returns a list of short tip strings (safe, general
    guidance — never a diagnosis).
    """
    client = client or AIClient()
    if client.mode == "offline":
        return []
    prompt = (
        "A diabetes screening app reached this conclusion for a patient: "
        f"{outcome.get('state', 'Inconclusive')} — {outcome.get('detail', '')}.\n"
        f"Patient values: {json.dumps(values)}\n\n"
        "Give 3-5 short, personalized, actionable next-step suggestions that follow "
        "from THESE specific numbers (e.g. if BMI is high suggest weight management; "
        "if glucose is borderline suggest a confirmatory HbA1c test; if age > 45 "
        "suggest annual screening). Bullet points only, one line each. This is "
        "screening, not a diagnosis — keep suggestions safe and general."
    )
    system = "You are a careful medical screening assistant."
    raw = client.complete(prompt, system, temperature=0.3)
    tips = [ln.lstrip("-*• ").strip() for ln in raw.splitlines() if ln.strip()]
    return [t for t in tips if t][:6]


def suggest_missing_values(missing_fields, known_values, client=None):
    """When the patient doesn't know a value, the AI proposes a plausible typical
    value so the screening isn't left blank. Returns {field: float}.

    The app asks the user first; this is only used when they answer 'don't know'.
    """
    if not missing_fields:
        return {}
    fields = ", ".join(missing_fields)
    prompt = (
        "A patient's diabetes screening is missing some values. Based on the known "
        f"values below, suggest PLAUSIBLE typical values for these missing fields: {fields}.\n"
        f"Known values: {json.dumps(known_values)}\n\n"
        "Return ONLY JSON with those exact keys and numeric estimates (no prose). "
        "These are reasonable guesses to avoid leaving blanks — label nothing as "
        "certain. Use common clinical/population typicals: pregnancies 0-3, age 30-55, "
        "BMI 22-28, blood pressure 110-130 (systolic), skin thickness 15-40, insulin "
        "5-20, glucose 90-140, HbA1c 5.0-5.7, DiabetesPedigreeFunction 0.2-0.6."
    )
    system = "You are a data-imputation assistant. Respond with valid JSON only."
    data = _ask_json(prompt, system, 0.2, client)
    if not data:
        return {}
    return {f: v for f, v in _to_floats(data).items() if f in missing_fields}


def screen_quick_glucose(age=None, sex=None, weight_kg=None, fasting_glucose=None,
                         post_glucose=None, client=None):
    """Quick risk screen from 5 easy self-known inputs (BMI NOT required):
    age, sex, weight (kg), fasting (before-meal) glucose and post-meal glucose (mg/dL).
    Returns (state, explanation, next_steps, missing).
    """
    fields = {"age": age, "sex": sex, "weight_kg": weight_kg,
              "fasting_glucose": fasting_glucose, "post_glucose": post_glucose}
    missing = [k for k, v in fields.items()
               if v is None or (isinstance(v, str) and str(v).strip() == "")]
    diabetic = (fasting_glucose is not None and fasting_glucose >= 126) or \
               (post_glucose is not None and post_glucose >= 200)
    prediab = (fasting_glucose is not None and 100 <= fasting_glucose <= 125) or \
              (post_glucose is not None and 140 <= post_glucose <= 199)
    state = "Diabetic range" if diabetic else ("Prediabetic range" if prediab else "Normal range")
    prompt = (
        "A person did a quick diabetes screen with these self-known values "
        f"(BMI was NOT used): age={age}, sex={sex}, weight_kg={weight_kg}, "
        f"fasting_glucose_mg_dl={fasting_glucose}, post_meal_glucose_mg_dl={post_glucose}.\n"
        f"Rule-based WHO/ADA glucose conclusion: {state}.\n\n"
        "Return ONLY valid JSON with two keys: 'explanation' (2-4 warm, plain sentences using "
        "the actual numbers, noting this is screening not a diagnosis) and 'next_steps' (3-5 short "
        "personalized tips). If glucose is in a warning range, suggest confirmatory HbA1c / OGTT "
        "lab tests; if weight looks high for the age, mention weight management."
    )
    system = "You are a careful medical screening assistant. Respond with valid JSON only."
    data = _ask_json(prompt, system, 0.2, client)
    explanation = str(data.get("explanation") or "") if data else ""
    steps = data.get("next_steps") if data else None
    next_steps = [str(t) for t in steps] if isinstance(steps, list) else []
    return state, explanation, next_steps, missing


LIFESTYLE_FIELDS = [
    "age", "sex", "height_cm", "weight_kg", "waist_cm",
    "activity_high", "veg_daily", "bp_issue", "high_sugar_history", "family_history",
]


def extract_lifestyle(history, client=None):
    """Pull easy, self-known lifestyle inputs from a conversation as a dict."""
    convo = "\n".join(f"{m['role']}: {m['content']}" for m in history)
    prompt = (
        "From the conversation below, extract the patient's LIFESTYLE details (no lab tests). "
        "Return ONLY JSON (no prose) with these keys:\n"
        "  age: number (years)\n"
        "  sex: \"male\" or \"female\"\n"
        "  height_cm: number\n"
        "  weight_kg: number\n"
        "  waist_cm: number or null if unknown\n"
        "  activity_high: true if they exercise >=30 min most days, else false\n"
        "  veg_daily: true if they eat vegetables/fruit daily, else false\n"
        "  bp_issue: true if told they have high blood pressure or take BP medication, else false\n"
        "  high_sugar_history: true if ever told they had high blood sugar, else false\n"
        "  family_history: \"none\" (no 1st-degree relative with diabetes), \"young\" "
        "(relative diagnosed <50 and not on meds/diet), or \"older\" (diagnosed >=50 or on meds/diet)\n"
        "Use null for genuinely unknown numeric fields. If a value is missing, omit it.\n\n"
        "Conversation:\n" + convo
    )
    system = "You are a data-extraction assistant. Respond with valid JSON only."
    data = _ask_json(prompt, system, 0.0, client)
    if not data:
        return {}
    return {f: data[f] for f in LIFESTYLE_FIELDS if f in data and data[f] is not None}




# ---------------------------------------------------------------------------
# Agent 2: Auto data enrichment (synthesize extra lifestyle context)
# ---------------------------------------------------------------------------
def enrich_patient_data(description, base_values=None, client=None):
    base_values = base_values or {}
    prompt = (
        "A user described a patient's lifestyle. Infer reasonable, NON-medical "
        "contextual risk factors and return ONLY valid JSON (no prose) with keys:\n"
        "  physical_activity: one of Sedentary | Light | Moderate | Active\n"
        "  diet_quality: one of Poor | Average | Good\n"
        "  sleep_hours: a number (4-10)\n"
        "  stress_level: one of Low | Medium | High\n"
        "  smoking: Yes or No\n"
        "  alcohol: Low | Moderate | High\n"
        "  summary: 2-3 sentence plain-language context for this patient\n"
        "  dynamic_tips: a JSON array of 3 short personalized lifestyle tips\n"
        "Do NOT invent clinical measurements. Only infer lifestyle context.\n\n"
        f"Known screening values: {json.dumps(base_values)}\n"
        f"Lifestyle description: {description}"
    )
    system = "You are a clinical decision-support assistant. Respond with valid JSON only."
    data = _ask_json(prompt, system, 0.4, client)
    if data is None:
        return offline_enrich(description)
    data.setdefault("summary", "")
    data.setdefault("dynamic_tips", offline_enrich(description)["dynamic_tips"])
    return data


# ---------------------------------------------------------------------------
# Agent 3: Web research (latest diabetes guidelines / studies)
# ---------------------------------------------------------------------------
# Authoritative health organizations we prefer when searching the web.
HEALTH_AUTHORITIES = [
    "who.int", "cdc.gov", "niddk.nih.gov", "idf.org",
    "diabetes.org", "diabetesatlas.org", "mayoclinic.org", "nhs.uk",
]


def _ddg_search(query, max_results=5):
    try:
        r = requests.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
        )
        if r.status_code == 200:
            results = re.findall(r'result__snippet"[^>]*>(.*?)</a>', r.text, re.S)
            texts = []
            for res in results[:max_results]:
                clean = re.sub(r"<[^>]+>", "", res).strip()
                if clean:
                    texts.append(clean)
            return texts
    except Exception:
        pass
    return []


def fetch_web_snippets(query, max_results=6):
    # Prefer authoritative health organizations (WHO, CDC, NIDDK, IDF, ADA...).
    out = []
    for dom in HEALTH_AUTHORITIES:
        out += _ddg_search(f"{query} site:{dom}", 2)
        if len(out) >= max_results:
            break
    if len(out) < max_results:
        out += _ddg_search(query, max_results - len(out))
    # de-duplicate while keeping order
    seen, uniq = set(), []
    for t in out:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    return "\n".join(uniq[:max_results])


def web_research_agent(query, client=None):
    client = client or AIClient()
    snippets = fetch_web_snippets(query)
    if snippets:
        prompt = (
            "Summarize the latest, practical diabetes risk and prevention guidance based "
            "on these web search snippets. Prefer and explicitly cite guidance from "
            "authoritative health organizations (WHO, CDC, NIDDK/NIH, IDF, American Diabetes "
            "Association) when present. Be concise (bullet points), add a one-line note that "
            "the info comes from a web search, and remind users to verify with a healthcare "
            "professional.\n\nSnippets:\n" + snippets
        )
    else:
        prompt = (
            f"Provide current, evidence-based diabetes risk and prevention guidance about: "
            f"{query}. If relevant, reference widely accepted criteria from WHO, CDC, or the "
            f"IDF. Note this is based on model knowledge, not a live web search. Be concise "
            f"(bullet points) and add a disclaimer to consult a healthcare professional."
        )
    system = "You are a medical research assistant summarizing diabetes guidance."
    return client.complete(prompt, system, temperature=0.3)


# ---------------------------------------------------------------------------
# Offline fallbacks (so the app works with no API / no Ollama)
# ---------------------------------------------------------------------------
def offline_chat(messages):
    last = messages[-1]["content"].lower() if messages else ""
    if "glucose" in last or "sugar" in last:
        return ("Higher blood glucose raises diabetes risk. A fasting level >=126 mg/dL "
                "or after-meal >=200 mg/dL is in the diabetes range. This app uses the "
                "after-meal value.")
    if "bmi" in last:
        return "BMI >=25 is overweight and >=30 is obese; both raise diabetes risk."
    if "prevent" in last or "reduce" in last or "tip" in last:
        return ("General ways to lower risk: maintain a healthy weight, exercise most "
                "days, eat more fibre and less refined sugar, and get regular screening.")
    return ("The AI assistant is temporarily unavailable, so here is general guidance: "
            "this app predicts diabetes risk from 8 screening values and is not a "
            "substitute for a doctor. For personalised advice, try again shortly.")


def offline_enrich(description):
    text = description.lower()
    activity = "Sedentary" if any(w in text for w in ["sedentary", "sit", "no exercise", "inactive"]) else "Average"
    smoking = "Yes" if "smok" in text else "No"
    diet = "Poor" if any(w in text for w in ["poor diet", "junk", "fast food", "sugary"]) else "Average"
    tips = [
        "Aim for at least 150 minutes of moderate activity per week.",
        "Prioritize whole foods, vegetables, and limit refined sugar.",
        "Get 7-8 hours of sleep and manage stress.",
    ]
    if smoking == "Yes":
        tips.append("Quitting smoking improves insulin sensitivity.")
    return {
        "physical_activity": activity,
        "diet_quality": diet,
        "sleep_hours": 7,
        "stress_level": "Medium",
        "smoking": smoking,
        "alcohol": "Low",
        "summary": "(Offline heuristic enrichment — set OPENAI_API_KEY or run Ollama for AI-generated context.)",
        "dynamic_tips": tips,
    }

