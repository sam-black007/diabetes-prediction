import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import os

RAW_DATA = os.path.join("data", "diabetes.csv")
PROCESSED_DIR = "data/processed"
os.makedirs(PROCESSED_DIR, exist_ok=True)

COLUMNS = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age", "Outcome",
]

def load_data(path):
    df = pd.read_csv(path, header=None, names=COLUMNS)
    print(f"[1] Loaded {df.shape[0]} rows, {df.shape[1]} columns")
    print("Missing values (NaN):", int(df.isna().sum().sum()))
    return df

def fix_impossible_zeros(df):
    # Columns where 0 is physically impossible -> treat as missing
    cols_to_fix = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]
    for col in cols_to_fix:
        n_zeros = (df[col] == 0).sum()
        if n_zeros > 0:
            median = df.loc[df[col] != 0, col].median()
            df.loc[df[col] == 0, col] = median
            print(f"[2] Fixed {n_zeros} impossible 0s in '{col}' -> median {median:.2f}")
    return df

def split_and_normalize(df, test_size=0.2, random_state=42):
    X = df.drop(columns=["Outcome"])
    y = df["Outcome"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    # Normalize (mean=0, std=1) on training data only, then apply to test
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print(f"[3] Train size: {X_train_scaled.shape[0]} | Test size: {X_test_scaled.shape[0]}")
    print(f"[4] Feature means (train, ~0 after scaling): {np.round(X_train_scaled.mean(axis=0), 3)}")

    np.save(os.path.join(PROCESSED_DIR, "X_train.npy"), X_train_scaled)
    np.save(os.path.join(PROCESSED_DIR, "X_test.npy"), X_test_scaled)
    np.save(os.path.join(PROCESSED_DIR, "y_train.npy"), y_train.to_numpy())
    np.save(os.path.join(PROCESSED_DIR, "y_test.npy"), y_test.to_numpy())

    df.to_csv(os.path.join(PROCESSED_DIR, "diabetes_clean.csv"), index=False)
    print("[5] Saved cleaned dataset + train/test arrays to", PROCESSED_DIR)
    return X_train_scaled, X_test_scaled, y_train, y_test, scaler

if __name__ == "__main__":
    df = load_data(RAW_DATA)
    df = fix_impossible_zeros(df)
    split_and_normalize(df)