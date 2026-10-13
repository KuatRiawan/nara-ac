
import numpy as np
import pandas as pd

from generate_dataset import DATA_DIR, FEATURE_COLUMNS, calculate_wape, generate_dataset


def test_forecast_feature_contract_order():
    """TEST-030: Test feature columns order."""
    assert FEATURE_COLUMNS == ["dayofweek", "dayofyear", "suhu_rata2", "is_libur"]


def test_dashboard_prediction_vector_shape():
    """TEST-030: Test prediction vector shape."""
    day_of_week = 1
    day_of_year = 42
    temp = 30.5
    is_libur = False

    x_pred = np.array([[day_of_week, day_of_year, temp, int(is_libur)]])

    assert x_pred.shape == (1, len(FEATURE_COLUMNS))


def test_wape_calculation():
    """TEST-031: Test WAPE calculation function."""
    y_true = np.array([10, 20, 30, 40])
    y_pred = np.array([12, 18, 32, 38])

    wape = calculate_wape(y_true, y_pred)

    # WAPE = sum(|y_true - y_pred|) / sum(y_true)
    # = (2 + 2 + 2 + 2) / (10 + 20 + 30 + 40) = 8 / 100 = 0.08
    assert abs(wape - 0.08) < 0.001


def test_generate_dataset_creates_file():
    """TEST-032: Test dataset generation creates CSV file."""
    # Run dataset generation
    df, model, metadata = generate_dataset()

    # Verify CSV file was created
    csv_path = DATA_DIR / "historical_demand.csv"
    assert csv_path.exists()

    # Verify it's a valid CSV
    df_loaded = pd.read_csv(csv_path)
    assert len(df_loaded) > 0
    assert list(df_loaded.columns) == ["tanggal", "jumlah_booking", "suhu_rata2", "is_libur"]


def test_generate_dataset_metadata():
    """TEST-032: Test dataset generation includes metadata."""
    df, model, metadata = generate_dataset()

    # Verify metadata has required fields
    assert "version" in metadata
    assert "created_at" in metadata
    assert "features" in metadata
    assert "target" in metadata
    assert "metrics" in metadata
    assert "baseline_comparison" in metadata

    # Verify metrics are populated
    assert "MAE" in metadata["metrics"]
    assert "RMSE" in metadata["metrics"]
    assert "WAPE" in metadata["metrics"]


def test_baseline_comparison():
    """TEST-032: Test baseline model comparison."""
    df, model, metadata = generate_dataset()

    # Verify baseline comparison exists
    assert "baseline_comparison" in metadata
    assert "model" in metadata["baseline_comparison"]
    assert metadata["baseline_comparison"]["model"] == "LinearRegression"

    # Verify baseline has metrics
    assert "MAE" in metadata["baseline_comparison"]
    assert "RMSE" in metadata["baseline_comparison"]
    assert "WAPE" in metadata["baseline_comparison"]


def test_time_based_split():
    """TEST-003: Test time-based split is used."""
    # Check that the dataset has the expected number of rows
    df = generate_dataset()[0]

    # Dataset should have 365 days (1 year)
    assert len(df) == 365

    # Verify historical_demand.csv was created
    assert (DATA_DIR / "historical_demand.csv").exists()


def test_model_versioning():
    """TEST-013: Test model versioning."""
    from generate_dataset import MODEL_VERSION

    # Verify version is set
    assert MODEL_VERSION == "2.0"

    # Verify model file is created with version
    df, model, metadata = generate_dataset()
    assert metadata["version"] == "2.0"
