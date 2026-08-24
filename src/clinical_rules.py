"""Centralized, deterministic clinical rule engine for the diabetes-risk screener.

Design principles
-----------------
* Deterministic and testable: every classification is a pure function of its
  numeric inputs plus a named measurement type.
* Measurement-type aware: fasting glucose, HbA1c, 75-g OGTT, random glucose and
  an ordinary 2-hour post-meal glucose are interpreted with DIFFERENT logic.
* The LLM never overrides these rules; it only explains the structured result.
* This is a SCREENING / EDUCATIONAL system, NOT a diagnostic medical device.

Sources (current authoritative guidance at implementation time)
-------------------------------------------------------------
* American Diabetes Association. *Standards of Care in Diabetes—2026*.
  - Diagnosis: FPG >=126 mg/dL; 2-h 75-g OGTT >=200 mg/dL; A1C >=6.5%;
    random >=200 mg/dL with classic hyperglycaemic symptoms.
  - Hypoglycaemia: Level 1 = <70 and >=54 mg/dL; Level 2 = <54 mg/dL;
    Level 3 = a severe event with altered mental/physical status requiring
    assistance (symptom-driven, irrespective of the exact value).
* American Heart Association / American College of Cardiology 2025 hypertension
  guideline (adult): Normal <120/<80; Elevated 120-129/<80; Stage 1
  130-139 or 80-89; Stage 2 >=140 or >=90; Hypertensive crisis >180 and/or >120.
* WHO and CDC are used as cross-checks where organisational thresholds differ.
"""

# Severity ranking (higher = more clinically urgent).
SEVERITY_ORDER = [
    "normal", "low", "elevated", "prediabetes", "stage1", "high",
    "needs_confirmation", "stage2", "very_high", "diabetes_range", "severe",
    "critical", "emergency",
]
_SEVERITY_RANK = {s: i for i, s in enumerate(SEVERITY_ORDER)}

COLOR = {
    "normal": "🟢", "low": "🟠", "elevated": "🟡", "prediabetes": "🟡",
    "stage1": "🟠", "high": "🟠", "needs_confirmation": "🟠", "stage2": "🔴",
    "very_high": "🔴", "diabetes_range": "🔴", "severe": "🔴",
    "critical": "🔴", "emergency": "🔴",
}


def _severity_rank(sev):
    return _SEVERITY_RANK.get(sev, 0)


def severity_rank(sev):
    """Public helper: numeric rank of a severity label (higher = more urgent)."""
    return _severity_rank(sev)


def _rule(metric, mtype, value, category, severity, status, interpretation,
          is_diagnostic=False, requires_confirmation=True, red_flag=False,
          source=""):
    return {
        "metric": metric,
        "measurement_type": mtype,
        "value": value,
        "category": category,
        "severity": severity,
        "status": status,
        "color": COLOR.get(severity, "🟢"),
        "interpretation": interpretation,
        "is_diagnostic": is_diagnostic,
        "requires_confirmation": requires_confirmation,
        "red_flag": red_flag,
        "source": source,
    }


def _missing(metric, mtype):
    return _rule(metric, mtype, None, "missing", "normal",
                 "Not provided", "No value was provided.",
                 requires_confirmation=True)


def _invalid(metric, mtype, note="Value could not be interpreted."):
    return _rule(metric, mtype, None, "invalid", "normal", "Invalid", note,
                 requires_confirmation=True)


# ---------------------------------------------------------------------------
# Glucose
# ---------------------------------------------------------------------------
_GLUCOSE_SRC = "ADA Standards of Care in Diabetes 2026"


def _glucose_high_layer(v):
    """Hyperglycaemic severity overlay for very high values."""
    if v >= 400:
        return ("emergency", "Emergency-level concern",
                "Glucose is extremely high — this is an emergency-level reading "
                "and urgent medical assessment is needed.")
    if v >= 300:
        return ("critical", "Critical / high-risk",
                "Severe hyperglycaemia — high-risk range; seek urgent care.")
    if v > 250:
        return ("very_high", "Very high", "Markedly high glucose.")
    return None


def classify_glucose(value, measurement_type):
    """Classify a glucose value by measurement type.

    measurement_type: 'fasting' | 'hba1c' | 'ogtt2h' | 'random' | 'postmeal2h'
    Returns a structured rule dict.
    """
    if value is None:
        return _missing("glucose", measurement_type)
    try:
        v = float(value)
    except (TypeError, ValueError):
        return _invalid("glucose", measurement_type)
    if v < 0 or v > 2000:
        return _invalid("glucose", measurement_type, "Glucose out of plausible range.")

    mt = str(measurement_type).lower()
    if mt == "hba1c":
        return _hba1c(v)
    if mt == "fasting":
        return _fasting(v)
    if mt == "ogtt2h":
        return _ogtt(v)
    if mt in ("random", "postmeal2h"):
        return _random_or_postmeal(v, mt)
    return _invalid("glucose", measurement_type, "Unknown glucose measurement type.")


def _fasting(v):
    if v < 54:
        note = ("Level 2 hypoglycaemia (severe low). <40 mg/dL is an "
                "emergency-level low reading." if v < 40 else
                "Level 2 hypoglycaemia (severe low).")
        return _rule("glucose", "fasting", v, "hypoglycemia", "critical",
                     "Level 2 hypoglycemia (severe low)", note,
                     is_diagnostic=False, requires_confirmation=True,
                     red_flag=True, source=_GLUCOSE_SRC)
    if v < 70:
        return _rule("glucose", "fasting", v, "hypoglycemia", "low",
                     "Level 1 hypoglycemia (low)",
                     "Level 1 hypoglycaemia (low). Treat symptoms; consider "
                     "fast-acting carbohydrate if conscious.",
                     source=_GLUCOSE_SRC)
    if v <= 99:
        return _rule("glucose", "fasting", v, "normal", "normal",
                     "Normal fasting range",
                     "Fasting glucose is within the normal range (70-99 mg/dL).",
                     requires_confirmation=False, source=_GLUCOSE_SRC)
    if v <= 125:
        return _rule("glucose", "fasting", v, "prediabetes", "prediabetes",
                     "Prediabetes range (impaired fasting glucose)",
                     "Fasting 100-125 mg/dL is the ADA prediabetes range "
                     "(impaired fasting glucose).", source=_GLUCOSE_SRC)
    # >=126
    base = _rule("glucose", "fasting", v, "diabetes_range", "diabetes_range",
                 "Diabetes-range (fasting)",
                 "Fasting >=126 mg/dL is in the diabetes range per ADA/WHO. "
                 "Confirmation with a repeat test or another criterion is needed.",
                 is_diagnostic=True, source=_GLUCOSE_SRC)
    return _apply_high_layer(base, v)


def _hba1c(v):
    if v < 5.7:
        return _rule("glucose", "hba1c", v, "normal", "normal",
                     "Normal HbA1c",
                     "HbA1c below 5.7% is normal.", requires_confirmation=False,
                     source=_GLUCOSE_SRC)
    if v < 6.5:
        return _rule("glucose", "hba1c", v, "prediabetes", "prediabetes",
                     "Prediabetes-range HbA1c",
                     "HbA1c 5.7-6.4% is the prediabetes range.",
                     source=_GLUCOSE_SRC)
    base = _rule("glucose", "hba1c", v, "diabetes_range", "diabetes_range",
                 "Diabetes-range HbA1c",
                 "HbA1c >=6.5% is in the diabetes range per ADA.",
                 is_diagnostic=True, source=_GLUCOSE_SRC)
    return base


def _ogtt(v):
    if v < 140:
        return _rule("glucose", "ogtt2h", v, "normal", "normal",
                     "Normal 2-h OGTT",
                     "2-hour 75-g OGTT below 140 mg/dL is normal.",
                     requires_confirmation=False, source=_GLUCOSE_SRC)
    if v < 200:
        return _rule("glucose", "ogtt2h", v, "prediabetes", "prediabetes",
                     "Prediabetes range (IGT)",
                     "2-hour 75-g OGTT 140-199 mg/dL is impaired glucose "
                     "tolerance (prediabetes).", source=_GLUCOSE_SRC)
    base = _rule("glucose", "ogtt2h", v, "diabetes_range", "diabetes_range",
                 "Diabetes-range 2-h OGTT",
                 "2-hour 75-g OGTT >=200 mg/dL is in the diabetes range per ADA.",
                 is_diagnostic=True, source=_GLUCOSE_SRC)
    return _apply_high_layer(base, v)


def _random_or_postmeal(v, mt):
    label = "Random glucose" if mt == "random" else "2-hour post-meal glucose"
    mt_name = "random" if mt == "random" else "postmeal2h"
    if v >= 200:
        interp = (f"{label} >=200 mg/dL is in the diabetes range, but diagnosis "
                  "requires confirmation (random needs classic symptoms; an "
                  "ordinary post-meal reading is NOT a standardised 75-g OGTT).")
        base = _rule("glucose", mt_name, v, "diabetes_range", "diabetes_range",
                     "Diabetes-range", interp, is_diagnostic=False,
                     source=_GLUCOSE_SRC)
        return _apply_high_layer(base, v)
    if v >= 140:
        return _rule("glucose", mt_name, v, "needs_confirmation", "needs_confirmation",
                     "Elevated — needs confirmation",
                     f"{label} 140-199 mg/dL is elevated; a standardised 75-g "
                     "OGTT is needed for a proper interpretation.",
                     source=_GLUCOSE_SRC)
    return _rule("glucose", mt_name, v, "normal", "normal",
                 "Within screening normal",
                 f"{label} below 140 mg/dL is within the screening normal range "
                 "(interpretation of an ordinary meal differs from an OGTT).",
                 requires_confirmation=False, source=_GLUCOSE_SRC)


def _apply_high_layer(rule, v):
    layer = _glucose_high_layer(v)
    if layer is None:
        return rule
    sev, status, interp = layer
    if _severity_rank(sev) > _severity_rank(rule["severity"]):
        rule = dict(rule)
        rule["severity"] = sev
        rule["status"] = status
        rule["interpretation"] = interp
        rule["color"] = COLOR.get(sev, "🔴")
        rule["red_flag"] = True
    return rule


# ---------------------------------------------------------------------------
# Blood pressure (independent SBP / DBP, OR logic)
# ---------------------------------------------------------------------------
_BP_SRC = "AHA/ACC 2025 hypertension guideline"


def _bp_category(sbp, dbp):
    """Return (severity, status, interpretation) for a single SBP/DBP number."""
    # systolic
    if sbp is not None:
        if sbp > 180:
            return ("severe", "Severe hypertension",
                    "Systolic >180 mmHg is severe hypertension.")
        if sbp >= 140:
            return ("stage2", "Stage 2 hypertension",
                    "Systolic >=140 mmHg is Stage 2 hypertension.")
        if sbp >= 130:
            return ("stage1", "Stage 1 hypertension",
                    "Systolic 130-139 mmHg is Stage 1 hypertension.")
        if sbp >= 120:
            return ("elevated", "Elevated",
                    "Systolic 120-129 mmHg is Elevated.")
        if sbp >= 90:
            return ("normal", "Normal", "Systolic is in the normal range.")
        if sbp < 90:
            return ("low", "Low blood pressure",
                    "Systolic <90 mmHg is low blood pressure (hypotension screening).")
    # diastolic (used when SBP missing)
    if dbp is not None:
        if dbp > 120:
            return ("severe", "Severe hypertension",
                    "Diastolic >120 mmHg is severe hypertension.")
        if dbp >= 90:
            return ("stage2", "Stage 2 hypertension",
                    "Diastolic >=90 mmHg is Stage 2 hypertension.")
        if dbp >= 80:
            return ("stage1", "Stage 1 hypertension",
                    "Diastolic 80-89 mmHg is Stage 1 hypertension.")
        if dbp < 60:
            return ("low", "Low blood pressure",
                    "Diastolic <60 mmHg is low blood pressure.")
        return ("normal", "Normal", "Diastolic is in the normal range.")
    return ("normal", "Normal", "No blood-pressure value provided.")


def classify_bp(systolic=None, diastolic=None, symptoms=None):
    """Classify blood pressure using INDEPENDENT SBP and DBP, then OR-logic.

    A single abnormal value (high OR low) drives the classification — both do
    not need to be abnormal. Returns a structured rule dict.
    """
    if systolic is None and diastolic is None:
        return _missing("blood_pressure", "bp")
    try:
        sbp = float(systolic) if systolic is not None else None
        dbp = float(diastolic) if diastolic is not None else None
    except (TypeError, ValueError):
        return _invalid("blood_pressure", "bp")
    if (sbp is not None and (sbp < 0 or sbp > 400)) or \
       (dbp is not None and (dbp < 0 or dbp > 400)):
        return _invalid("blood_pressure", "bp", "BP out of plausible range.")

    # Low-BP screening flag (either value low)
    low = (sbp is not None and sbp < 90) or (dbp is not None and dbp < 60)

    s_res = _bp_category(sbp, None) if sbp is not None else None
    d_res = _bp_category(None, dbp) if dbp is not None else None

    # Pick the higher-severity of the two independent classifications.
    candidates = [r for r in (s_res, d_res) if r]
    if not candidates:
        return _rule("blood_pressure", "bp", None, "normal", "normal",
                     "Normal", "Blood pressure within range.",
                     requires_confirmation=False, source=_BP_SRC)
    best = max(candidates, key=lambda r: _severity_rank(r[0]))
    severity, status, interp = best

    if low and severity in ("normal", "elevated"):
        # One value low while the other is normal/elevated -> surface low flag.
        severity, status, interp = (
            "low", "Low blood pressure",
            "One BP component is below the normal low limit "
            f"(SBP {sbp}, DBP {dbp}). Low BP screening flag.")
    red_flag = severity in ("severe", "critical", "emergency")
    rule = _rule("blood_pressure", "bp",
                 f"{sbp}/{dbp}" if (sbp is not None and dbp is not None) else (sbp or dbp),
                 "abnormal" if severity not in ("normal",) else "normal",
                 severity, status, interp,
                 requires_confirmation=(severity in ("stage1", "stage2", "severe")),
                 red_flag=red_flag, source=_BP_SRC)
    # Symptomatic emergency distinction.
    if severity == "severe" and symptoms:
        rule = dict(rule)
        rule["severity"] = "emergency"
        rule["status"] = "Hypertensive emergency (with symptoms)"
        rule["interpretation"] = (
            "Very high BP WITH concerning symptoms (e.g. chest pain, breathlessness, "
            "neurological signs, altered mental status) is a hypertensive emergency "
            "— seek emergency care.")
        rule["color"] = COLOR["emergency"]
    return rule


# ---------------------------------------------------------------------------
# BMI
# ---------------------------------------------------------------------------
def compute_bmi(weight_kg=None, height_cm=None):
    """BMI = weight_kg / (height_m ** 2). Adult categories only."""
    if weight_kg is None or height_cm is None:
        return _missing("bmi", "bmi")
    try:
        w = float(weight_kg)
        h_cm = float(height_cm)
    except (TypeError, ValueError):
        return _invalid("bmi", "bmi")
    if w <= 0 or h_cm <= 0 or h_cm < 50 or h_cm > 260 or w > 400:
        return _invalid("bmi", "bmi", "Impossible weight or height.")
    h_m = h_cm / 100.0
    bmi = w / (h_m ** 2)
    if bmi < 18.5:
        cat, sev, status = "underweight", "low", "Underweight"
    elif bmi < 25:
        cat, sev, status = "normal", "normal", "Normal weight"
    elif bmi < 30:
        cat, sev, status = "overweight", "elevated", "Overweight"
    else:
        cat, sev, status = "obese", "high", "Obese"
    return _rule("bmi", "bmi", round(bmi, 1), cat, sev, status,
                 f"BMI {bmi:.1f} — adult category: {status}. BMI is a risk factor, "
                 f"not a diagnostic test.", requires_confirmation=False,
                 source="WHO / ADA adult BMI categories")


# ---------------------------------------------------------------------------
# Lipids (independent, non-diagnostic)
# ---------------------------------------------------------------------------
_LIPID_SRC = "AHA / NCEP ATP III lipid categories"


def classify_lipids(total=None, ldl=None, hdl=None, trig=None, nonhdl=None):
    """Return a list of structured lipid classifications (kept independent)."""
    out = []
    if ldl is not None:
        try:
            ldl = float(ldl)
        except (TypeError, ValueError):
            ldl = None
        if ldl is not None:
            sev = "high" if ldl >= 160 else ("elevated" if ldl >= 130 else "normal")
            out.append(_rule("ldl_c", "lipid", ldl, "ldl", sev,
                             f"LDL-C {sev}", f"LDL-C {ldl:.0f} mg/dL.",
                             source=_LIPID_SRC))
    if hdl is not None:
        try:
            hdl = float(hdl)
        except (TypeError, ValueError):
            hdl = None
        if hdl is not None:
            sev = "low" if hdl < 40 else "normal"
            out.append(_rule("hdl_c", "lipid", hdl, "hdl", sev,
                             f"HDL-C {sev}", f"HDL-C {hdl:.0f} mg/dL "
                             f"({'low' if sev=='low' else 'normal'}).",
                             source=_LIPID_SRC))
    if trig is not None:
        try:
            trig = float(trig)
        except (TypeError, ValueError):
            trig = None
        if trig is not None:
            sev = "high" if trig >= 200 else ("elevated" if trig >= 150 else "normal")
            out.append(_rule("triglycerides", "lipid", trig, "trig", sev,
                             f"Triglycerides {sev}", f"Triglycerides {trig:.0f} mg/dL.",
                             source=_LIPID_SRC))
    if nonhdl is not None:
        try:
            nonhdl = float(nonhdl)
        except (TypeError, ValueError):
            nonhdl = None
        if nonhdl is not None:
            sev = "high" if nonhdl >= 190 else "normal"
            out.append(_rule("non_hdl", "lipid", nonhdl, "nonhdl", sev,
                             f"Non-HDL-C {sev}", f"Non-HDL-C {nonhdl:.0f} mg/dL.",
                             source=_LIPID_SRC))
    if total is not None:
        try:
            total = float(total)
        except (TypeError, ValueError):
            total = None
        if total is not None:
            sev = "high" if total >= 240 else ("elevated" if total >= 200 else "normal")
            out.append(_rule("total_cholesterol", "lipid", total, "chol", sev,
                             f"Total cholesterol {sev}", f"Total cholesterol "
                             f"{total:.0f} mg/dL.", source=_LIPID_SRC))
    return out


# ---------------------------------------------------------------------------
# Red-flag engine (numeric abnormality vs symptomatic emergency)
# ---------------------------------------------------------------------------
def red_flag_engine(glucose_rules=None, bp_rule=None, symptoms=None):
    """Identify urgent safety concerns. Symptoms make a high number an emergency."""
    flags = []
    symptoms = [s for s in (symptoms or []) if s]
    for r in (glucose_rules or []):
        if r.get("red_flag"):
            flags.append({
                "area": "glucose", "severity": r["severity"],
                "message": r["interpretation"],
                "symptomatic": bool(symptoms),
            })
    if bp_rule and bp_rule.get("red_flag"):
        msg = bp_rule["interpretation"]
        if bp_rule["severity"] == "emergency":
            msg = ("VERY HIGH BLOOD PRESSURE WITH CONCERNING SYMPTOMS — "
                   "hypertensive emergency. Seek emergency care now.")
        flags.append({
            "area": "blood_pressure", "severity": bp_rule["severity"],
            "message": msg, "symptomatic": bp_rule["severity"] == "emergency",
        })
    return flags


# ---------------------------------------------------------------------------
# Evidence aggregation
# ---------------------------------------------------------------------------
def aggregate_evidence(glucose_rules=None, bp_rule=None, bmi_rule=None,
                       lipid_rules=None, findrisc=None, ml=None):
    """Build the structured screening summary with severity-priority ordering."""
    components = []
    for r in (glucose_rules or []):
        components.append(("glucose", r))
    if bp_rule:
        components.append(("blood_pressure", bp_rule))
    if bmi_rule:
        components.append(("bmi", bmi_rule))
    for r in (lipid_rules or []):
        components.append(("lipid", r))

    # Determine overall screening status by highest severity.
    rank = max((_severity_rank(r["severity"]) for _, r in components), default=0)
    overall_sev = SEVERITY_ORDER[rank] if rank < len(SEVERITY_ORDER) else "emergency"
    status_map = {
        "normal": "Normal / low risk", "low": "Low / monitor",
        "elevated": "Elevated risk", "prediabetes": "Elevated risk",
        "stage1": "Elevated risk", "high": "High risk",
        "needs_confirmation": "Needs confirmation",
        "stage2": "High risk", "very_high": "High risk",
        "diabetes_range": "Diabetes-range finding",
        "severe": "Severe abnormality", "critical": "Critical abnormality",
        "emergency": "EMERGENCY / RED FLAG",
    }
    flags = red_flag_engine(glucose_rules, bp_rule)
    return {
        "components": components,
        "overall": {
            "screening_status": status_map.get(overall_sev, "Elevated risk"),
            "severity": overall_sev,
            "requires_confirmation": any(
                r.get("requires_confirmation") for _, r in components),
        },
        "red_flags": flags,
        "findrisc": findrisc,
        "ml": ml,
    }
