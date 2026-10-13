from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

FEATURE_COLUMNS = ["dayofweek", "dayofyear", "suhu_rata2", "is_libur"]
MODEL_VERSION = "2.0"
MODEL_METADATA = {
    "version": MODEL_VERSION,
    "created_at": None,
    "features": FEATURE_COLUMNS,
    "target": "jumlah_booking",
    "model_type": "RandomForestRegressor",
    "n_estimators": 100,
    "random_state": 42,
    "metrics": {},
    "baseline_comparison": {}
}


def calculate_wape(y_true, y_pred):
    """Calculate Weighted Absolute Percentage Error (WAPE)."""
    return np.sum(np.abs(y_true - y_pred)) / np.sum(y_true)


def generate_dataset():
    print("Generating synthetic dataset...")
    np.random.seed(42)

    # Generate 1 year of daily booking counts
    dates = pd.date_range(start="2025-01-01", end="2025-12-31")
    n_days = len(dates)

    # Base demand + weekly seasonality + noise
    base = 10
    weekly = np.sin(np.arange(n_days) * (2 * np.pi / 7)) * 3
    trend = np.linspace(0, 5, n_days)
    noise = np.random.normal(0, 2, n_days)

    demand = np.maximum(0, np.round(base + weekly + trend + noise))

    df = pd.DataFrame({
        "tanggal": dates,
        "jumlah_booking": demand,
        "suhu_rata2": np.random.normal(30, 2, n_days).round(1),
        "is_libur": [1 if d.weekday() >= 5 else 0 for d in dates]
    })

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATA_DIR / "historical_demand.csv", index=False)

    # Add features for modeling
    df["dayofweek"] = df["tanggal"].dt.dayofweek
    df["dayofyear"] = df["tanggal"].dt.dayofyear

    X = df[FEATURE_COLUMNS]
    y = df["jumlah_booking"]

    # Time-based split to prevent data leakage (DS-003)
    # Use time-series split: train on first 9 months, test on last 3 months
    split_idx = int(len(df) * 0.75)  # 75% for training, 25% for testing
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    print(f"Dataset split: {len(X_train)} train, {len(X_test)} test")

    # Train Random Forest model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Train baseline model (Linear Regression) for comparison (DS-010)
    baseline_model = LinearRegression()
    baseline_model.fit(X_train, y_train)

    # Evaluate models on test set (DS-011)
    y_pred_rf = model.predict(X_test)
    y_pred_baseline = baseline_model.predict(X_test)

    mae_rf = mean_absolute_error(y_test, y_pred_rf)
    rmse_rf = np.sqrt(mean_squared_error(y_test, y_pred_rf))
    wape_rf = calculate_wape(y_test, y_pred_rf)

    mae_baseline = mean_absolute_error(y_test, y_pred_baseline)
    rmse_baseline = np.sqrt(mean_squared_error(y_test, y_pred_baseline))
    wape_baseline = calculate_wape(y_test, y_pred_baseline)

    print("\n=== Model Evaluation Metrics ===")
    print(f"Random Forest - MAE: {mae_rf:.2f}, RMSE: {rmse_rf:.2f}, WAPE: {wape_rf:.4f}")
    print(f"Linear Regression - MAE: {mae_baseline:.2f}, RMSE: {rmse_baseline:.2f}, WAPE: {wape_baseline:.4f}")

    # Update metadata
    MODEL_METADATA["created_at"] = datetime.now().isoformat()
    MODEL_METADATA["metrics"] = {
        "MAE": float(mae_rf),
        "RMSE": float(rmse_rf),
        "WAPE": float(wape_rf)
    }
    MODEL_METADATA["baseline_comparison"] = {
        "model": "LinearRegression",
        "MAE": float(mae_baseline),
        "RMSE": float(rmse_baseline),
        "WAPE": float(wape_baseline)
    }

    # Save model with metadata (DS-012, DS-013)
    model_metadata = {
        "model": model,
        "metadata": MODEL_METADATA,
        "feature_columns": FEATURE_COLUMNS,
        "train_dates": [str(d) for d in df["tanggal"].iloc[:split_idx].tolist()],
        "test_dates": [str(d) for d in df["tanggal"].iloc[split_idx:].tolist()]
    }
    joblib.dump(model_metadata, MODELS_DIR / "demand_model_v2.pkl")
    print("Dataset and model with metadata saved.")

    return df, model, MODEL_METADATA


if __name__ == "__main__":
    generate_dataset()
