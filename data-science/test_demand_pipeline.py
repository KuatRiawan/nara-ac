from datetime import date

import numpy as np
import pandas as pd

from demand_pipeline import (
    FEATURE_COLUMNS,
    add_features,
    complete_calendar,
    train_and_forecast,
    validate_daily_demand,
)


def sample_daily(days=180):
    dates = pd.date_range("2026-01-01", periods=days, freq="D")
    values = 8 + (dates.dayofweek >= 5).astype(int) * 3 + np.sin(np.arange(days) / 7)
    bookings = np.maximum(0, np.round(values)).astype(int)
    return pd.DataFrame(
        {
            "tanggal": dates,
            "jumlah_booking": bookings,
            "jumlah_unit": bookings,
            "jumlah_selesai": bookings,
            "jumlah_batal": np.zeros(days),
            "omzet": bookings * 75000,
            "booking_sintetis": bookings,
            "booking_nyata": np.zeros(days),
        }
    )


def test_complete_calendar_inserts_zero_days():
    frame = sample_daily(5).drop(index=2)
    completed = complete_calendar(frame, date(2026, 1, 6))
    assert len(completed) == 5
    assert completed.loc[2, "jumlah_booking"] == 0


def test_features_only_use_past_values():
    frame = sample_daily(60)
    featured = add_features(frame)
    first = featured.iloc[0]
    source_index = frame.index[frame["tanggal"] == first["tanggal"]][0]
    assert first["lag_1"] == frame.loc[source_index - 1, "jumlah_booking"]
    assert first["lag_7"] == frame.loc[source_index - 7, "jumlah_booking"]
    assert list(featured[FEATURE_COLUMNS].columns) == FEATURE_COLUMNS


def test_train_forecast_contract():
    frame = sample_daily()
    validate_daily_demand(frame)
    _model, metadata, forecast = train_and_forecast(frame, horizon=14)
    assert len(forecast) == 14
    assert set(forecast.columns) == {"periode", "nilai", "batas_bawah", "batas_atas"}
    assert (forecast["nilai"] >= 0).all()
    assert metadata["model_type"] in {"LinearRegression", "RandomForestRegressor"}
    assert set(metadata["metrics"]) == {"MAE", "RMSE", "WAPE"}
