import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import os

plt.rcParams["figure.dpi"] = 120
PLOT_DIR = "plots"
os.makedirs(PLOT_DIR, exist_ok=True)

CLEAN_DATA = os.path.join("data", "processed", "diabetes_clean.csv")
FEATURES = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age",
]

def outcome_distribution(df):
    plt.figure(figsize=(6, 4))
    counts = df["Outcome"].value_counts().sort_index()
    plt.bar(["No Diabetes (0)", "Diabetes (1)"], counts.values, color=["#4C72B0", "#C44E52"])
    for i, v in enumerate(counts.values):
        plt.text(i, v + 10, str(v), ha="center")
    plt.ylabel("Number of patients")
    plt.title("Diabetes Outcome Distribution")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, "1_outcome_distribution.png"))
    plt.show()

def feature_histograms(df):
    fig, axes = plt.subplots(4, 2, figsize=(12, 14))
    for ax, feature in zip(axes.flatten(), FEATURES):
        for outcome, color, label in [(0, "#4C72B0", "No Diabetes"), (1, "#C44E52", "Diabetes")]:
            subset = df[df["Outcome"] == outcome]
            ax.hist(subset[feature], bins=20, alpha=0.6, color=color, label=label)
        ax.set_title(feature)
        ax.legend()
    fig.suptitle("Health Marker Distributions by Outcome", fontsize=14)
    fig.tight_layout(rect=[0, 0, 1, 0.96])
    fig.savefig(os.path.join(PLOT_DIR, "2_feature_histograms.png"))
    plt.show()

def correlation_heatmap(df):
    plt.figure(figsize=(9, 7))
    corr = df.corr()
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", square=True)
    plt.title("Feature Correlation Heatmap")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, "3_correlation_heatmap.png"))
    plt.show()

def boxplots_by_outcome(df):
    fig, axes = plt.subplots(4, 2, figsize=(12, 14))
    for ax, feature in zip(axes.flatten(), FEATURES):
        df.boxplot(column=feature, by="Outcome", ax=ax)
        ax.set_title(feature)
        ax.set_xlabel("Outcome")
    fig.suptitle("Feature Values by Outcome", fontsize=14)
    fig.tight_layout(rect=[0, 0, 1, 0.96])
    fig.savefig(os.path.join(PLOT_DIR, "4_boxplots_by_outcome.png"))
    plt.show()

def scatter_glucose_bmi(df):
    plt.figure(figsize=(8, 6))
    for outcome, color, label in [(0, "#4C72B0", "No Diabetes"), (1, "#C44E52", "Diabetes")]:
        subset = df[df["Outcome"] == outcome]
        plt.scatter(subset["Glucose"], subset["BMI"], alpha=0.5, color=color, label=label)
    plt.xlabel("Glucose")
    plt.ylabel("BMI")
    plt.title("Glucose vs BMI (diabetic patients cluster differently)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, "5_glucose_vs_bmi.png"))
    plt.show()

def age_group_analysis(df):
    bins = [20, 30, 40, 50, 60, 100]
    labels = ["20-29", "30-39", "40-49", "50-59", "60+"]
    df["AgeGroup"] = pd.cut(df["Age"], bins=bins, labels=labels, right=False)
    rate = df.groupby("AgeGroup", observed=False)["Outcome"].mean() * 100
    plt.figure(figsize=(8, 5))
    rate.plot(kind="bar", color="#4C72B0")
    plt.ylabel("Diabetes rate (%)")
    plt.title("Diabetes Rate by Age Group")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, "6_diabetes_rate_by_age.png"))
    plt.show()

if __name__ == "__main__":
    df = pd.read_csv(CLEAN_DATA)
    print("Data shape:", df.shape)
    print("\nClass balance:")
    print(df["Outcome"].value_counts())

    outcome_distribution(df)
    feature_histograms(df)
    correlation_heatmap(df)
    boxplots_by_outcome(df)
    scatter_glucose_bmi(df)
    age_group_analysis(df)
    print("\nPlots saved to", PLOT_DIR)