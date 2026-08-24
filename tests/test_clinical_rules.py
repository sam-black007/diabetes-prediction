import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from clinical_rules import (
    classify_glucose,
    classify_bp,
    compute_bmi,
    classify_lipids,
    aggregate_evidence,
)


# --------------------------------------------------------------------------
# Glucose — measurement-type aware (ADA 2026 thresholds)
# --------------------------------------------------------------------------
def test_glucose_fasting():
    assert classify_glucose(50, "fasting")["status"].startswith("Level 2 hypoglycemia")
    assert classify_glucose(60, "fasting")["status"].startswith("Level 1 hypoglycemia")
    assert classify_glucose(90, "fasting")["status"] == "Normal fasting range"
    assert classify_glucose(110, "fasting")["status"] == "Prediabetes range (impaired fasting glucose)"
    assert classify_glucose(130, "fasting")["status"] == "Diabetes-range (fasting)"


def test_glucose_postmeal():
    assert classify_glucose(90, "postmeal2h")["status"] == "Within screening normal"
    assert classify_glucose(160, "postmeal2h")["status"].startswith("Elevated")
    assert classify_glucose(210, "postmeal2h")["status"] == "Diabetes-range"


def test_glucose_hba1c():
    assert classify_glucose(5.2, "hba1c")["status"] == "Normal HbA1c"
    assert classify_glucose(6.0, "hba1c")["status"] == "Prediabetes-range HbA1c"
    assert classify_glucose(6.8, "hba1c")["status"] == "Diabetes-range HbA1c"


def test_glucose_extreme_high():
    assert classify_glucose(350, "fasting")["status"] == "Critical / high-risk"
    assert classify_glucose(450, "fasting")["status"] == "Emergency-level concern"


# --------------------------------------------------------------------------
# Blood pressure — independent SBP / DBP OR logic (AHA/ACC 2025)
# --------------------------------------------------------------------------
@pytest.mark.parametrize("sbp,dbp,expected_sev", [
    (115, 75, "normal"),
    (125, 78, "elevated"),
    (135, 82, "stage1"),     # Stage 1
    (145, 92, "stage2"),     # Stage 2
    (150, 75, "stage2"),     # Stage 2 driven by SBP alone
    (110, 95, "stage2"),     # Stage 2 driven by DBP alone
    (185, 121, "severe"),
    (85, 55, "low"),
])
def test_bp(sbp, dbp, expected_sev):
    assert classify_bp(sbp, dbp)["severity"] == expected_sev


def test_bp_emergency_with_symptoms():
    r = classify_bp(185, 121, ["chest pain"])
    assert r["status"] == "Hypertensive emergency (with symptoms)"
    assert r["red_flag"] is True
    assert r["severity"] == "emergency"


# --------------------------------------------------------------------------
# BMI + lipids
# --------------------------------------------------------------------------
def test_bmi():
    assert compute_bmi(70, 170)["status"] == "Normal weight"
    assert compute_bmi(90, 170)["status"] == "Obese"
    assert compute_bmi(70, 170)["category"] == "normal"
    assert compute_bmi(80, 170)["category"] == "overweight"


def test_lipids():
    res = classify_lipids(ldl=170, hdl=35, trig=200)
    assert any("LDL-C high" in r["status"] for r in res)
    assert any("HDL-C low" in r["status"] for r in res)
    assert any("Triglycerides high" in r["status"] for r in res)


# --------------------------------------------------------------------------
# Evidence aggregation + red flags
# --------------------------------------------------------------------------
def test_aggregate_red_flag_high_glucose():
    g = classify_glucose(450, "fasting")
    ev = aggregate_evidence(glucose_rules=[g])
    assert ev["red_flags"]
    assert ev["overall"]["severity"] == "emergency"


def test_aggregate_no_false_red_flag():
    g = classify_glucose(95, "fasting")
    b = classify_bp(118, 76)
    ev = aggregate_evidence(glucose_rules=[g], bp_rule=b)
    assert not ev["red_flags"]
