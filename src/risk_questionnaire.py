"""Lifestyle-based diabetes risk (no lab tests required).

Implements the validated FINDRISC (Finnish Diabetes Risk Score) questionnaire,
which uses only self-known facts: age, BMI (from height/weight), waist, physical
activity, diet, blood-pressure status, prior high-blood-sugar, and family history.
No blood test needed.
"""


def calc_bmi(height_cm, weight_kg):
    if not height_cm or not weight_kg:
        return None
    h = height_cm / 100.0
    if h <= 0:
        return None
    return weight_kg / (h * h)


def _age_points(age):
    if age is None:
        return 0
    if age < 45:
        return 0
    if age <= 54:
        return 2
    if age <= 64:
        return 3
    return 4


def _bmi_points(bmi):
    if bmi is None:
        return 0
    if bmi < 25:
        return 0
    if bmi < 30:
        return 1
    return 3


def _waist_points(sex, waist):
    if waist is None:
        return 0
    if sex == "male":
        if waist < 94:
            return 0
        if waist <= 102:
            return 3
        return 4
    else:
        if waist < 80:
            return 0
        if waist <= 88:
            return 3
        return 4


def _family_points(family_history):
    # "none" -> 0 ; "young" (1st-degree dx <50, no meds) -> 3 ; "older" (dx >=50 or on meds/diet) -> 5
    return {"none": 0, "young": 3, "older": 5}.get(family_history, 0)


def calc_findrisk(age, sex, height_cm, weight_kg, waist_cm,
                  activity_high, veg_daily, bp_issue, high_sugar_history, family_history):
    """Return a dict with BMI, FINDRISC score, risk category and 10-yr risk %."""
    bmi = calc_bmi(height_cm, weight_kg)
    score = (
        _age_points(age)
        + _bmi_points(bmi)
        + _waist_points(sex, waist_cm)
        + (0 if activity_high else 2)
        + (0 if veg_daily else 1)
        + (2 if bp_issue else 0)
        + (5 if high_sugar_history else 0)
        + _family_points(family_history)
    )
    if score < 7:
        category, risk_pct = "Low risk", 1
    elif score <= 11:
        category, risk_pct = "Slightly elevated", 4
    elif score <= 14:
        category, risk_pct = "Moderate", 17
    elif score <= 20:
        category, risk_pct = "High", 33
    else:
        category, risk_pct = "Very high", 50

    return {
        "bmi": round(bmi, 1) if bmi else None,
        "score": score,
        "category": category,
        "risk_pct": risk_pct,
    }


# Symptom red flags that warrant urgent clinical attention
RED_FLAG_SYMPTOMS = {
    "frequent_urination": "Frequent urination (especially at night)",
    "excessive_thirst": "Excessive thirst",
    "unexplained_weight_loss": "Unexplained weight loss",
    "blurred_vision": "Blurred vision",
    "slow_healing": "Slow-healing wounds",
}


def symptom_flags(symptoms):
    return [RED_FLAG_SYMPTOMS[s] for s in symptoms if s in RED_FLAG_SYMPTOMS]
