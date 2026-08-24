import os
import sys

import joblib
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import ml_risk

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "processed", "best_model.joblib"
)

MEDIANS = {
    "Pregnancies": 3.0, "Glucose": 120.0, "BloodPressure": 69.0,
    "SkinThickness": 20.0, "Insulin": 79.0, "BMI": 31.99,
    "DiabetesPedigreeFunction": 0.47, "Age": 33.0,
}

pytestmark = pytest.mark.skipif(
    not os.path.exists(MODEL_PATH), reason="trained model not present"
)


@pytest.fixture(scope="module")
def model():
    return joblib.load(MODEL_PATH)


def test_predict_returns_score_in_range(model):
    out = ml_risk.predict_with_model(
        {"Age": 50, "Glucose": 140, "BloodPressure": 120, "BMI": 30},
        model, MEDIANS, 0.5,
    )
    assert 0.0 <= out["score"] <= 1.0
    assert out["class"] in (0, 1)
    assert isinstance(out["imputed"], list)


def test_predict_imputes_missing(model):
    out = ml_risk.predict_with_model(
        {"Age": 50, "Glucose": 140, "BloodPressure": 120, "BMI": 30},
        model, MEDIANS, 0.5,
    )
    # PIMA features not supplied fall back to medians
    for f in ("Pregnancies", "SkinThickness", "Insulin", "DiabetesPedigreeFunction"):
        assert f in out["imputed"]
