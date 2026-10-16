"""Train and publish daily booking forecasts from the NARA AC MySQL database."""

import argparse
import json
import math
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse
from zoneinfo import ZoneInfo

import joblib
import numpy as np
import pandas as pd
import pymysql
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
ENV_FILE = BASE_DIR.parent / "backend" / ".env"
MODEL_VERSION = "3.0"
TARGET = "jumlah_booking_harian"
FEATURE_COLUMNS = [
    "dayofweek",
    "dayofmonth",
    "month",
    "dayofyear",
    "is_weekend",
    "lag_1",
    "lag_7",
    "rolling_mean_7",
    "rolling_mean_28",
]


def database_config(database_url=None):
    """Return PyMySQL connection settings from DATABASE_URL."""
    load_dotenv(ENV_FILE)
    parsed = urlparse(database_url or os.getenv("DATABASE_URL", ""))
    if parsed.scheme not in {"mysql", "mariadb"} or not parsed.path.lstrip("/"):
        raise ValueError("DATABASE_URL MySQL/MariaDB belum dikonfigurasi dengan benar.")
    return {
        "host": parsed.hostname or "127.0.0.1",
        "port": parsed.port or 3306,
        "user": unquote(parsed.username or "root"),
        "password": unquote(parsed.password or ""),
        "database": parsed.path.lstrip("/"),
        "charset": "utf8mb4",
        "autocommit": False,
        "init_command": "SET time_zone = '+00:00'",
    }


def connect(database_url=None):
    return pymysql.connect(**database_config(database_url))


def default_as_of():
    """Use the current Jakarta date as the exclusive training boundary."""
    return datetime.now(ZoneInfo("Asia/Jakarta")).date()


def extract_daily_demand(connection, as_of=None):
    """Aggregate service dates into one row per day before the as-of date."""
    cutoff = as_of or default_as_of()
    sql = """
        SELECT
          DATE_FORMAT(DATE_ADD(b.jadwal_mulai, INTERVAL 7 HOUR), '%%Y-%%m-%%d') AS tanggal,
          COUNT(CASE WHEN b.status <> 'cancelled' THEN 1 END) AS jumlah_booking,
          COALESCE(SUM(CASE WHEN b.status <> 'cancelled' THEN b.jumlah_unit ELSE 0 END), 0)
            AS jumlah_unit,
          COUNT(CASE WHEN b.status = 'done' THEN 1 END) AS jumlah_selesai,
          COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) AS jumlah_batal,
          COALESCE(SUM(CASE WHEN b.status <> 'cancelled' THEN bi.subtotal ELSE 0 END), 0)
            AS omzet,
          COUNT(CASE WHEN b.status <> 'cancelled' AND b.is_synthetic THEN 1 END)
            AS booking_sintetis,
          COUNT(CASE WHEN b.status <> 'cancelled' AND NOT b.is_synthetic THEN 1 END)
            AS booking_nyata
        FROM bookings b
        LEFT JOIN (
          SELECT booking_id, SUM(subtotal) AS subtotal
          FROM booking_items
          GROUP BY booking_id
        ) bi ON bi.booking_id = b.id
        WHERE DATE(DATE_ADD(b.jadwal_mulai, INTERVAL 7 HOUR)) < %s
        GROUP BY 1
        ORDER BY 1
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, (cutoff.isoformat(),))
        frame = pd.DataFrame(
            cursor.fetchall(),
            columns=[column[0] for column in cursor.description],
        )
    if frame.empty:
        raise ValueError("Tidak ada booking sebelum tanggal batas training.")
    frame["tanggal"] = pd.to_datetime(frame["tanggal"])
    for column in frame.columns.drop("tanggal"):
        frame[column] = pd.to_numeric(frame[column], errors="raise")
    return complete_calendar(frame, cutoff)


def complete_calendar(frame, as_of):
    """Insert missing dates with zero demand so time-series lags stay valid."""
    first_date = frame["tanggal"].min().normalize()
    last_date = pd.Timestamp(as_of - timedelta(days=1))
    calendar = pd.DataFrame({"tanggal": pd.date_range(first_date, last_date, freq="D")})
    completed = calendar.merge(frame, on="tanggal", how="left")
    numeric_columns = completed.columns.drop("tanggal")
    completed[numeric_columns] = completed[numeric_columns].fillna(0)
    return completed


def validate_daily_demand(frame):
    """Fail early when the training dataset violates its basic contract."""
    required = {
        "tanggal",
        "jumlah_booking",
        "jumlah_unit",
        "jumlah_selesai",
        "jumlah_batal",
        "omzet",
        "booking_sintetis",
        "booking_nyata",
    }
    missing = required.difference(frame.columns)
    if missing:
        raise ValueError(f"Kolom dataset hilang: {', '.join(sorted(missing))}")
    if frame["tanggal"].duplicated().any():
        raise ValueError("Dataset harian memiliki tanggal duplikat.")
    if not frame["tanggal"].is_monotonic_increasing:
        raise ValueError("Dataset harian harus berurutan berdasarkan tanggal.")
    if (frame.drop(columns="tanggal") < 0).any().any():
        raise ValueError("Dataset harian memiliki nilai negatif.")
    expected_days = (frame["tanggal"].max() - frame["tanggal"].min()).days + 1
    if len(frame) != expected_days:
        raise ValueError("Kalender harian belum lengkap.")
    if len(frame) < 90:
        raise ValueError("Minimal 90 hari diperlukan untuk training forecasting.")


def add_features(frame):
    """Build calendar and past-only lag features without future leakage."""
    featured = frame[["tanggal", "jumlah_booking"]].copy()
    featured["dayofweek"] = featured["tanggal"].dt.dayofweek
    featured["dayofmonth"] = featured["tanggal"].dt.day
    featured["month"] = featured["tanggal"].dt.month
    featured["dayofyear"] = featured["tanggal"].dt.dayofyear
    featured["is_weekend"] = (featured["dayofweek"] >= 5).astype(int)
    featured["lag_1"] = featured["jumlah_booking"].shift(1)
    featured["lag_7"] = featured["jumlah_booking"].shift(7)
    history = featured["jumlah_booking"].shift(1)
    featured["rolling_mean_7"] = history.rolling(7).mean()
    featured["rolling_mean_28"] = history.rolling(28).mean()
    return featured.dropna().reset_index(drop=True)


def wape(actual, predicted):
    denominator = float(np.sum(np.abs(actual)))
    return float(np.sum(np.abs(actual - predicted)) / denominator) if denominator else 0.0


def metrics(actual, predicted):
    return {
        "MAE": float(mean_absolute_error(actual, predicted)),
        "RMSE": float(math.sqrt(mean_squared_error(actual, predicted))),
        "WAPE": wape(np.asarray(actual), np.asarray(predicted)),
    }


def build_forecast_features(target_date, history):
    """Build one recursive forecast row using only values already observed/predicted."""
    return pd.DataFrame(
        [
            [
                target_date.weekday(),
                target_date.day,
                target_date.month,
                target_date.timetuple().tm_yday,
                int(target_date.weekday() >= 5),
                history[-1],
                history[-7],
                float(np.mean(history[-7:])),
                float(np.mean(history[-28:])),
            ]
        ],
        columns=FEATURE_COLUMNS,
    )


def train_and_forecast(daily, horizon=14):
    """Compare baseline, linear regression and random forest, then forecast."""
    validate_daily_demand(daily)
    featured = add_features(daily)
    test_days = min(30, max(14, len(featured) // 5))
    train = featured.iloc[:-test_days]
    test = featured.iloc[-test_days:]
    if len(train) < 30:
        raise ValueError("Data training tidak cukup setelah pembuatan fitur lag.")

    x_train = train[FEATURE_COLUMNS]
    y_train = train["jumlah_booking"]
    x_test = test[FEATURE_COLUMNS]
    y_test = test["jumlah_booking"].to_numpy()

    models = {
        "LinearRegression": LinearRegression(),
        "RandomForestRegressor": RandomForestRegressor(
            n_estimators=200,
            min_samples_leaf=2,
            random_state=42,
        ),
    }
    evaluations = {"SeasonalNaive7": metrics(y_test, test["lag_7"].to_numpy())}
    predictions = {"SeasonalNaive7": test["lag_7"].to_numpy()}
    for name, model in models.items():
        model.fit(x_train, y_train)
        predictions[name] = np.maximum(0, model.predict(x_test))
        evaluations[name] = metrics(y_test, predictions[name])

    chosen_name = min(models, key=lambda name: evaluations[name]["MAE"])
    chosen_model = models[chosen_name]
    chosen_model.fit(featured[FEATURE_COLUMNS], featured["jumlah_booking"])
    residual_margin = float(np.quantile(np.abs(y_test - predictions[chosen_name]), 0.90))

    history = daily["jumlah_booking"].astype(float).tolist()
    next_date = daily["tanggal"].max().date() + timedelta(days=1)
    forecast_rows = []
    for day_offset in range(horizon):
        target_date = next_date + timedelta(days=day_offset)
        features = build_forecast_features(target_date, history)
        predicted = max(0.0, float(chosen_model.predict(features)[0]))
        rounded = round(predicted, 2)
        forecast_rows.append(
            {
                "periode": target_date.isoformat(),
                "nilai": rounded,
                "batas_bawah": round(max(0.0, predicted - residual_margin), 2),
                "batas_atas": round(predicted + residual_margin, 2),
            }
        )
        history.append(predicted)

    metadata = {
        "model_version": MODEL_VERSION,
        "model_type": chosen_name,
        "target": TARGET,
        "feature_columns": FEATURE_COLUMNS,
        "train_start": daily["tanggal"].min().date().isoformat(),
        "train_end": daily["tanggal"].max().date().isoformat(),
        "test_start": test["tanggal"].min().date().isoformat(),
        "test_end": test["tanggal"].max().date().isoformat(),
        "metrics": evaluations[chosen_name],
        "model_comparison": evaluations,
        "residual_margin_90": residual_margin,
        "capacity_per_technician": 3,
        "data_contains_synthetic": bool(daily["booking_sintetis"].sum() > 0),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return chosen_model, metadata, pd.DataFrame(forecast_rows)


def save_artifacts(daily, model, metadata, forecast):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    daily.to_csv(DATA_DIR / "daily_demand.csv", index=False)
    forecast.to_csv(DATA_DIR / "forecast_latest.csv", index=False)
    joblib.dump(
        {"model": model, "metadata": metadata, "feature_columns": FEATURE_COLUMNS},
        MODELS_DIR / "demand_model_v3.pkl",
    )
    (MODELS_DIR / "demand_model_v3.metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )


def publish_predictions(connection, forecast, metadata):
    """Publish a complete forecast batch for the existing Express endpoint."""
    created_at = datetime.now(timezone.utc).replace(tzinfo=None)
    metric_payload = json.dumps(
        {
            **metadata["metrics"],
            "model_type": metadata["model_type"],
            "model_comparison": metadata["model_comparison"],
            "train_start": metadata["train_start"],
            "train_end": metadata["train_end"],
            "test_start": metadata["test_start"],
            "test_end": metadata["test_end"],
            "capacity_per_technician": metadata["capacity_per_technician"],
        }
    )
    rows = [
        (
            TARGET,
            row.periode,
            float(row.nilai),
            float(row.batas_bawah),
            float(row.batas_atas),
            MODEL_VERSION,
            f"Prediksi {len(forecast)} hari dari data booking MySQL",
            metadata["data_contains_synthetic"],
            metric_payload,
            created_at,
        )
        for row in forecast.itertuples(index=False)
    ]
    sql = """
        INSERT INTO prediction_output (
          target, periode, nilai_prediksi, batas_bawah, batas_atas,
          model_version, keterangan, is_synthetic, metrik, dibuat_pada
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """
    with connection.cursor() as cursor:
        cursor.executemany(sql, rows)
    connection.commit()


def run_pipeline(horizon=14, as_of=None, publish=True, database_url=None):
    cutoff = as_of or default_as_of()
    connection = connect(database_url)
    try:
        daily = extract_daily_demand(connection, cutoff)
        model, metadata, forecast = train_and_forecast(daily, horizon)
        save_artifacts(daily, model, metadata, forecast)
        if publish:
            publish_predictions(connection, forecast, metadata)
        return daily, metadata, forecast
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--horizon", type=int, default=14, choices=range(7, 31))
    parser.add_argument("--as-of", type=date.fromisoformat, default=None)
    parser.add_argument("--no-publish", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    daily, metadata, forecast = run_pipeline(
        horizon=args.horizon,
        as_of=args.as_of,
        publish=not args.no_publish,
    )
    print(f"Dataset: {len(daily)} hari ({metadata['train_start']} s.d. {metadata['train_end']})")
    print(f"Model terpilih: {metadata['model_type']} v{metadata['model_version']}")
    print(f"Metrik test: {json.dumps(metadata['metrics'], indent=2)}")
    print(f"Forecast: {len(forecast)} hari; publish={not args.no_publish}")


if __name__ == "__main__":
    main()
