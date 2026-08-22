import os
import json
import re
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Chinese, cloud-based (no local install) providers. All are OpenAI-compatible,
# so we just point the OpenAI client at their base_url. Each offers a free tier
# (free credits / free monthly quota) — sign up and copy the API key.
#   AI_PROVIDER = deepseek | qwen | kimi | siliconflow | openai
#   AI_API_KEY  = your key from that provider  (OPENAI_API_KEY also accepted)
#   AI_MODEL    = model name (optional override)
PROVIDER = os.getenv("AI_PROVIDER", "qwen").lower()
API_KEY = os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY")
MODEL = os.getenv("AI_MODEL")
BASE_URL = os.getenv("AI_BASE_URL")

PROVIDER_PRESETS = {
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


class AIClient:
    """Cloud LLM client (no local model needed).

    Picks a Chinese provider by default (see PROVIDER_PRESETS). Falls back to a
    built-in offline rule-based responder if no API key is configured, so the
    app always runs.
    """

    def __init__(self):
        self.mode = "offline"
        self._client = None
        self._model = MODEL
        if API_KEY and PROVIDER in PROVIDER_PRESETS:
            try:
                from openai import OpenAI
                preset_base, default_model = PROVIDER_PRESETS[PROVIDER]
                base_url = BASE_URL or preset_base
                self._model = self._model or default_model
                self._client = OpenAI(api_key=API_KEY, base_url=base_url)
                self.mode = PROVIDER
            except Exception:
                self.mode = "offline"

    def chat(self, messages, system="You are a helpful medical assistant.", temperature=0.3):
        if self._client is not None:
            try:
                resp = self._client.chat.completions.create(
                    model=self._model,
                    messages=[{"role": "system", "content": system}] + messages,
                    temperature=temperature,
                )
                return resp.choices[0].message.content
            except Exception as e:
                return f"({PROVIDER} error: {e})\n\n" + offline_chat(messages)
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
    client = client or AIClient()
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
    raw = client.complete(prompt, system, temperature=0.0)
    data = _extract_json(raw)
    if not data:
        return {}
    out = {}
    for f in INTAKE_FIELDS:
        v = data.get(f)
        try:
            if v is not None:
                out[f] = float(v)
        except Exception:
            pass
    return out


LIFESTYLE_FIELDS = [
    "age", "sex", "height_cm", "weight_kg", "waist_cm",
    "activity_high", "veg_daily", "bp_issue", "high_sugar_history", "family_history",
]


def extract_lifestyle(history, client=None):
    """Pull easy, self-known lifestyle inputs from a conversation as a dict."""
    client = client or AIClient()
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
    raw = client.complete(prompt, system, temperature=0.0)
    data = _extract_json(raw)
    if not data:
        return {}
    out = {}
    for f in LIFESTYLE_FIELDS:
        if f in data and data[f] is not None:
            out[f] = data[f]
    return out




# ---------------------------------------------------------------------------
# Agent 2: Auto data enrichment (synthesize extra lifestyle context)
# ---------------------------------------------------------------------------
def enrich_patient_data(description, base_values=None, client=None):
    client = client or AIClient()
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
    raw = client.complete(prompt, system, temperature=0.4)
    data = _extract_json(raw)
    if data is None:
        return offline_enrich(description)
    data.setdefault("summary", "")
    data.setdefault("dynamic_tips", offline_enrich(description)["dynamic_tips"])
    return data


# ---------------------------------------------------------------------------
# Agent 3: Web research (latest diabetes guidelines / studies)
# ---------------------------------------------------------------------------
def fetch_web_snippets(query, max_results=5):
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
            return "\n".join(texts)
    except Exception:
        pass
    return ""


def web_research_agent(query, client=None):
    client = client or AIClient()
    snippets = fetch_web_snippets(query)
    if snippets:
        prompt = (
            "Summarize the latest, practical diabetes risk and prevention guidance "
            "based on these web search snippets. Be concise (bullet points), note "
            "that the info comes from a web search, and remind users to verify with "
            "a healthcare professional.\n\nSnippets:\n" + snippets
        )
    else:
        prompt = (
            f"Provide current, evidence-based diabetes risk and prevention guidance "
            f"about: {query}. Note this is based on model knowledge, not a live web "
            f"search. Be concise (bullet points) and add a disclaimer to consult a "
            f"healthcare professional."
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
                "after-meal value. (Offline mode — set OPENAI_API_KEY or run Ollama for "
                "full AI answers.)")
    if "bmi" in last:
        return ("BMI >=25 is overweight and >=30 is obese; both raise diabetes risk. "
                "(Offline mode — set OPENAI_API_KEY or run Ollama for full AI answers.)")
    if "prevent" in last or "reduce" in last or "tip" in last:
        return ("General ways to lower risk: maintain a healthy weight, exercise most "
                "days, eat more fibre and less refined sugar, and get regular screening. "
                "(Offline mode — set OPENAI_API_KEY or run Ollama for full AI answers.)")
    return ("I'm running in offline mode (no OpenAI key or Ollama detected). Set "
            "OPENAI_API_KEY or install Ollama (https://ollama.com) with `ollama pull "
            "llama3.1` for full conversational answers. Meanwhile: this app predicts "
            "diabetes risk from 8 screening values and is not a substitute for a doctor.")


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
