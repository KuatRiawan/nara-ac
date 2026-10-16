import json
import math
import os
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlparse

import pandas as pd
import plotly.express as px
import pymysql
import streamlit as st
from dotenv import load_dotenv

# Load Env
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / "backend" / ".env")

st.set_page_config(
    page_title="Nara AC - Business Analytics & AI",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS
st.markdown(
    """
<style>
    .stApp { background-color: #f8fafc; }
    .main-header { font-size: 2rem; font-weight: 700; color: #1e293b; margin-bottom: 0rem; }
    .sub-header { font-size: 1.1rem; color: #64748b; margin-bottom: 2rem; }
</style>
""",
    unsafe_allow_html=True,
)

st.markdown(
    '<p class="main-header">🤖 Business Analytics & AI Dashboard</p>', unsafe_allow_html=True
)
st.markdown(
    '<p class="sub-header">Nara AC Services - Operational Insights & ML Demand Forecasting</p>',
    unsafe_allow_html=True,
)

# Data source information (DS-020, DS-022)
DATA_SOURCE_INFO = """
**Sumber Data:**
- Data Realtime: Database MySQL / MariaDB (Nara AC)
- Data Historis: Snapshot harian yang diekstrak dari database
- Model: Model terbaik hasil perbandingan baseline, Linear Regression, dan Random Forest

**Catatan:** Dataset lokal saat ini berisi data sample. Hasil forecasting ditujukan untuk
validasi pipeline dan harus dievaluasi ulang setelah data produksi tersedia.
"""


# DB Connection
@st.cache_resource
def init_connection():
    try:
        database_url = urlparse(os.getenv("DATABASE_URL", "mysql://root@127.0.0.1:3306/nara_ac"))
        return pymysql.connect(
            host=database_url.hostname,
            port=database_url.port or 3306,
            user=unquote(database_url.username or "root"),
            password=unquote(database_url.password or ""),
            database=database_url.path.lstrip("/"),
            charset="utf8mb4",
            autocommit=True,
            init_command="SET time_zone = '+00:00'",
        )
    except pymysql.Error:
        return None


conn = init_connection()


@st.cache_data(ttl=600)
def load_db_data():
    if not conn:
        return None, None, None, None

    try:
        bookings = pd.read_sql(
            "SELECT b.*, s.nama_layanan, t.nama AS teknisi "
            "FROM bookings b "
            "JOIN service_catalog s ON b.layanan_id = s.id "
            "LEFT JOIN technicians t ON b.teknisi_id = t.id",
            conn,
        )
        inventory = pd.read_sql("SELECT * FROM inventory", conn)
        feedback = pd.read_sql("SELECT * FROM feedback", conn)
        customers = pd.read_sql("SELECT * FROM customers", conn)

        # Calculate daily trend
        booking_time = pd.to_datetime(bookings["jadwal_mulai"], utc=True)
        bookings["tanggal"] = (booking_time + pd.Timedelta(hours=7)).dt.date

        return bookings, inventory, feedback, customers
    except (pymysql.Error, pd.errors.DatabaseError) as exc:
        st.error(f"DB Load Error: {exc}")
        return None, None, None, None


bookings_df, inv_df, feedback_df, cust_df = load_db_data()


@st.cache_data
def load_historical():
    try:
        return pd.read_csv(Path(__file__).resolve().parent / "data" / "daily_demand.csv")
    except FileNotFoundError:
        return None


@st.cache_data(ttl=60)
def load_predictions():
    if not conn:
        return None, None
    try:
        query = """
            SELECT target, periode, nilai_prediksi, batas_bawah, batas_atas,
                   model_version, keterangan, is_synthetic, metrik, dibuat_pada
            FROM prediction_output
            WHERE dibuat_pada = (SELECT MAX(dibuat_pada) FROM prediction_output)
            ORDER BY periode
        """
        predictions = pd.read_sql(query, conn)
        if predictions.empty:
            return None, None
        raw_metrics = predictions.iloc[0]["metrik"]
        metrics = json.loads(raw_metrics) if isinstance(raw_metrics, str) else raw_metrics
        metadata = {
            "target": predictions.iloc[0]["target"],
            "model_version": predictions.iloc[0]["model_version"],
            "keterangan": predictions.iloc[0]["keterangan"],
            "is_synthetic": bool(predictions.iloc[0]["is_synthetic"]),
            "metrik": metrics or {},
            "dibuat_pada": predictions.iloc[0]["dibuat_pada"],
        }
        predictions["periode"] = pd.to_datetime(predictions["periode"])
        return predictions, metadata
    except (pymysql.Error, pd.errors.DatabaseError, json.JSONDecodeError) as exc:
        st.error(f"Prediction Load Error: {exc}")
        return None, None


@st.cache_data
def detect_outliers(df, column="jumlah_booking"):
    """Detect outliers using IQR method (DS-004)."""
    if df is None or column not in df.columns:
        return df, None, None

    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR

    outliers = df[(df[column] < lower_bound) | (df[column] > upper_bound)]
    df_clean = df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]

    return df_clean, outliers, (lower_bound, upper_bound)


def get_last_updated():
    """Get last updated timestamp (DS-021)."""
    csv_path = Path(__file__).resolve().parent / "data" / "daily_demand.csv"
    if csv_path.exists():
        mtime = csv_path.stat().st_mtime
        return datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
    return "Unknown"


df_hist = load_historical()
forecast_df, forecast_meta = load_predictions()
last_updated = get_last_updated()

with st.sidebar:
    st.markdown("### ⚙️ Navigasi")
    st.info("Pusat analitik operasional dan prediktif Nara AC.")
    st.divider()

    # Data source clarity (DS-020)
    st.markdown("### 📊 Info Sumber Data")
    st.markdown(DATA_SOURCE_INFO)
    st.divider()

    # Last updated timestamp (DS-021)
    st.markdown("### 🕐 Data Terakhir Diperbarui")
    st.info(f"**Historical Demand:** {last_updated}")
    st.divider()

    if not conn:
        st.error("⚠️ Database disconnected - Dashboard menggunakan data sintetik")
    else:
        st.success("✅ Database connected")

    st.caption("© 2026 Capstone A26-CS054")

tab1, tab2, tab3 = st.tabs(
    ["📈 Operational Insights (Realtime)", "🔮 AI Demand Forecasting", "📦 Inventory & Feedback"]
)

with tab1:
    st.subheader("Business Performance Analytics")
    if bookings_df is not None and not bookings_df.empty:
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Total Bookings", f"{len(bookings_df)}")
        col2.metric("Total Customers", f"{len(cust_df)}")
        completed = len(bookings_df[bookings_df["status"] == "done"])
        col3.metric("Completed Services", f"{completed}")

        if len(feedback_df) > 0:
            avg_rating = feedback_df["rating"].mean()
            col4.metric("Average Rating", f"{avg_rating:.1f} ⭐")
        else:
            col4.metric("Average Rating", "N/A")

        st.markdown("---")

        # Charts
        c1, c2 = st.columns(2)
        with c1:
            daily_bookings = bookings_df.groupby("tanggal").size().reset_index(name="count")
            fig1 = px.line(
                daily_bookings,
                x="tanggal",
                y="count",
                title="Booking Trend (Realtime Database)",
                markers=True,
            )
            st.plotly_chart(fig1, use_container_width=True)

        with c2:
            svc_count = bookings_df["nama_layanan"].value_counts().reset_index()
            svc_count.columns = ["Layanan", "Total"]
            fig2 = px.pie(
                svc_count, values="Total", names="Layanan", title="Service Popularity", hole=0.4
            )
            st.plotly_chart(fig2, use_container_width=True)

        c3, c4 = st.columns(2)
        with c3:
            status_count = bookings_df["status"].value_counts().reset_index()
            status_count.columns = ["Status", "Total"]
            fig3 = px.bar(
                status_count,
                x="Status",
                y="Total",
                title="Booking Status Distribution",
                color="Status",
            )
            st.plotly_chart(fig3, use_container_width=True)

        with c4:
            tech_count = (
                bookings_df.dropna(subset=["teknisi"])
                .groupby("teknisi")
                .size()
                .reset_index(name="count")
            )
            fig4 = px.bar(
                tech_count, x="teknisi", y="count", title="Technician Workload", color="teknisi"
            )
            st.plotly_chart(fig4, use_container_width=True)

        st.markdown("#### 💡 Business Insight Engine")
        top_svc = svc_count.iloc[0]["Layanan"] if len(svc_count) > 0 else "N/A"
        st.success(
            f"**Actionable Insight:** Layanan **{top_svc}** merupakan kontributor "
            "terbanyak. Pastikan stok sparepart/material untuk layanan ini "
            "(seperti Freon/Pipa) tercukupi."
        )

    else:
        st.warning("Belum ada data operasional di database.")

with tab2:
    st.subheader("AI Demand Forecasting (Predictive Analytics)")

    # Dataset audit information (DS-001)
    if df_hist is not None:
        st.markdown("#### 📊 Audit Dataset Historical Demand")
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Total Records", len(df_hist))
        col2.metric("Missing Values", df_hist.isnull().sum().sum())
        col3.metric("Date Range", f"{df_hist['tanggal'].min()} → {df_hist['tanggal'].max()}")
        col4.metric("Columns", len(df_hist.columns))

        st.markdown("---")

    if forecast_df is not None and forecast_meta is not None and df_hist is not None:
        model_type = forecast_meta["metrik"].get("model_type", "Model forecasting")
        st.write(
            f"Prediksi menggunakan **{model_type} v{forecast_meta['model_version']}** "
            "yang dipilih melalui evaluasi berbasis waktu."
        )

        if forecast_meta["is_synthetic"]:
            st.warning(
                "Model masih menggunakan data sample/sintetis. Gunakan hasil untuk validasi "
                "pipeline, bukan keputusan produksi final."
            )

        # Outlier detection visualization (DS-004)
        st.markdown("#### 🎯 Deteksi Outlier")
        df_clean, outliers, bounds = detect_outliers(df_hist, "jumlah_booking")
        if outliers is not None and len(outliers) > 0:
            st.warning(
                f"Ditemukan {len(outliers)} outlier - Data telah dibersihkan untuk visualisasi"
            )
            c1, c2 = st.columns(2)
            with c1:
                fig_outliers = px.scatter(
                    df_hist,
                    x="tanggal",
                    y="jumlah_booking",
                    title="Deteksi Outlier dengan IQR Method",
                    color=df_hist["jumlah_booking"].isin(outliers["jumlah_booking"]),
                    labels={"color": "Outlier"},
                )
                st.plotly_chart(fig_outliers, use_container_width=True)
            with c2:
                st.metric("Jumlah Outlier", len(outliers))
                st.metric("Bound Lower", f"{bounds[0]:.2f}")
                st.metric("Bound Upper", f"{bounds[1]:.2f}")
        else:
            st.success("Tidak ditemukan outlier yang signifikan dalam dataset")

        st.markdown("---")
        metric_values = forecast_meta["metrik"]
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("MAE", f"{float(metric_values.get('MAE', 0)):.2f}")
        c2.metric("RMSE", f"{float(metric_values.get('RMSE', 0)):.2f}")
        c3.metric("WAPE", f"{float(metric_values.get('WAPE', 0)) * 100:.1f}%")
        c4.metric("Model", model_type)

        chart = forecast_df.rename(
            columns={
                "periode": "Tanggal",
                "nilai_prediksi": "Prediksi",
                "batas_bawah": "Batas bawah",
                "batas_atas": "Batas atas",
            }
        )
        figure = px.line(
            chart,
            x="Tanggal",
            y=["Prediksi", "Batas bawah", "Batas atas"],
            markers=True,
            title="Prediksi permintaan servis",
        )
        st.plotly_chart(figure, use_container_width=True)

        capacity = max(1, int(metric_values.get("capacity_per_technician", 3)))
        peak = float(forecast_df["nilai_prediksi"].max())
        needed = max(1, math.ceil(peak / capacity)) if peak > 0 else 1
        st.success(
            f"Puncak prediksi **{peak:.0f} booking/hari**. Dengan kapasitas "
            f"{capacity} booking per teknisi, siagakan minimal **{needed} teknisi**."
        )
    else:
        st.error(
            "Prediksi belum tersedia. Jalankan `python demand_pipeline.py --horizon 14` "
            "dari folder data-science."
        )

with tab3:
    st.subheader("Inventory & Feedback Analytics")
    if inv_df is not None and not inv_df.empty:
        c1, c2 = st.columns(2)
        with c1:
            inv_df["status_stok"] = inv_df.apply(
                lambda r: "Kritis" if r["stok"] <= r["min_stok"] else "Aman", axis=1
            )
            fig_inv = px.bar(
                inv_df,
                x="nama",
                y="stok",
                color="status_stok",
                color_discrete_map={"Kritis": "red", "Aman": "green"},
                title="Posisi Stok Inventory",
            )
            fig_inv.add_scatter(
                x=inv_df["nama"],
                y=inv_df["min_stok"],
                mode="lines",
                name="Batas Minimum",
                line=dict(color="red", dash="dash"),
            )
            st.plotly_chart(fig_inv, use_container_width=True)

        with c2:
            if feedback_df is not None and not feedback_df.empty:
                rating_dist = feedback_df["rating"].value_counts().reset_index()
                rating_dist.columns = ["Rating", "Jumlah"]
                fig_fb = px.pie(
                    rating_dist,
                    values="Jumlah",
                    names="Rating",
                    title="Distribusi Kepuasan Pelanggan (Rating)",
                    hole=0.5,
                )
                st.plotly_chart(fig_fb, use_container_width=True)
            else:
                st.info("Belum ada data feedback pelanggan.")
