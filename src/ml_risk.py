"""Local ML inference for the PIMA Random Forest screening model.

The model is a research / baseline screening model trained on the PIMA Indians
Diabetes Database (768 records, 8 features). It is NOT clinically validated and
its recall is weak (~61%). It is used ONLY to produce a separate
"model-estimated risk score" — never as the source of truth, and never as a
diagnosis.

The PIMA feature schema is fixed; do not feed it new columns (HbA1c, BP
breakdown, etc.) without retraining. Missing features are imputed with the
dataset median for the model's internal vector only.
"""

import numpy as np

# Fixed PIMA schema — must match training exactly.
PIMA_FEATURES = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age",
]

# In PIMA, 0 for these clinical fields actually means "missing".
_ZERO_MEANS_MISSING = {"Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"}


def predict_with_model(values, model, medians=None, threshold=0.5):
    """Run the loaded Random Forest on a single patient.

    values: dict keyed by any subset of PIMA_FEATURES.
    Returns {"class", "score", "features", "imputed", "threshold"}.
    """
    medians = medians or {}
    feats = []
    imputed = []
    for f in PIMA_FEATURES:
        v = values.get(f)
        is_missing = v is None or (isinstance(v, (int, float)) and f in _ZERO_MEANS_MISSING and float(v) == 0.0)
        if is_missing:
            mv = float(medians.get(f, 0.0))
            feats.append(mv)
            imputed.append(f)
        else:
            feats.append(float(v))
    x = np.array(feats, dtype=float).reshape(1, -1)
    proba = model.predict_proba(x)[0]
    score = float(proba[1])  # P(diabetes)
    cls = int(score >= threshold)
    return {
        "class": cls,
        "score": score,
        "features": dict(zip(PIMA_FEATURES, [round(v, 3) for v in feats])),
        "imputed": imputed,
        "threshold": threshold,
    }
