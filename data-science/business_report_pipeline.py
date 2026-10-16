"""Build and publish report-ready dashboard datasets from NARA AC MySQL data.

The DS pipeline owns business aggregation. Express only reads the published
snapshots from ``ds_dashboard_snapshots``.
"""

import argparse
import json
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd

from demand_pipeline import connect, default_as_of

PERIODS = (3, 6, 12)
DEFINITIONS = {
    "transaksi_customer": "Booking selain status cancelled, diurutkan berdasarkan jumlah booking.",
    "service": "Booking selain status cancelled, dikelompokkan berdasarkan layanan.",
    "teknisi": "Booking yang sudah ditugaskan selain status cancelled.",
    "revenue": (
        "Total booking_items.subtotal untuk booking berstatus done, berdasarkan bulan jadwal."
    ),
    "booking_terjadwal": "Booking selain status cancelled, berdasarkan bulan jadwal_mulai.",
}


def extract_facts(connection):
    """Extract one analysis-ready row per booking plus descriptive dimensions."""
    sql = """
        SELECT b.id, b.customer_id, c.nama AS customer_name,
               b.layanan_id AS service_id, s.nama_layanan AS service_name,
               b.teknisi_id AS technician_id, t.nama AS technician_name,
               b.status, b.jumlah_unit, b.jadwal_mulai, b.updated_at,
               COALESCE(items.revenue, 0) AS revenue
        FROM bookings b
        JOIN customers c ON c.id = b.customer_id
        JOIN service_catalog s ON s.id = b.layanan_id
        LEFT JOIN technicians t ON t.id = b.teknisi_id
        LEFT JOIN (
          SELECT booking_id, SUM(subtotal) AS revenue
          FROM booking_items
          GROUP BY booking_id
        ) items ON items.booking_id = b.id
    """
    facts = pd.read_sql(sql, connection)
    if facts.empty:
        raise ValueError("Tidak ada booking untuk membentuk laporan bisnis.")
    facts["jadwal_wib"] = pd.to_datetime(facts["jadwal_mulai"], utc=True).dt.tz_convert(
        "Asia/Jakarta"
    )
    facts["tanggal"] = facts["jadwal_wib"].dt.date
    facts["bulan"] = facts["jadwal_wib"].dt.strftime("%Y-%m")
    for column in ("customer_id", "service_id", "jumlah_unit", "revenue"):
        facts[column] = pd.to_numeric(facts[column], errors="raise")
    return facts


def validate_facts(facts):
    required = {
        "id", "customer_id", "customer_name", "service_id", "service_name",
        "status", "jumlah_unit", "tanggal", "bulan", "revenue",
    }
    missing = required.difference(facts.columns)
    if missing:
        raise ValueError(f"Kolom fakta hilang: {', '.join(sorted(missing))}")
    if facts["id"].duplicated().any():
        raise ValueError("Satu booking muncul lebih dari sekali pada dataset fakta.")
    if facts[["customer_id", "service_id", "status", "tanggal"]].isna().any().any():
        raise ValueError("Dimensi wajib pada dataset fakta mengandung nilai kosong.")
    if (facts[["jumlah_unit", "revenue"]] < 0).any().any():
        raise ValueError("Jumlah unit atau revenue tidak boleh negatif.")


def month_keys(as_of, months):
    end = pd.Period(as_of, freq="M")
    return [str(period) for period in pd.period_range(end=end, periods=months, freq="M")]


def period_frame(facts, as_of, months):
    months_in_scope = month_keys(as_of, months)
    return facts[(facts["bulan"].isin(months_in_scope)) & (facts["tanggal"] <= as_of)].copy()


def top_customers(frame):
    valid = frame[frame["status"] != "cancelled"]
    grouped = valid.groupby(["customer_id", "customer_name"], as_index=False).agg(
        jumlah_transaksi=("id", "count"), jumlah_unit=("jumlah_unit", "sum"),
        revenue=("revenue", "sum"),
    )
    grouped = grouped.sort_values(
        ["jumlah_transaksi", "revenue", "customer_name"], ascending=[False, False, True]
    ).head(10)
    return [
        {"id": int(row.customer_id), "nama": row.customer_name,
         "jumlah_transaksi": int(row.jumlah_transaksi), "jumlah_unit": int(row.jumlah_unit),
         "revenue": float(row.revenue)}
        for row in grouped.itertuples(index=False)
    ]


def top_services(frame):
    valid = frame[frame["status"] != "cancelled"]
    grouped = valid.groupby(["service_id", "service_name"], as_index=False).agg(
        jumlah_booking=("id", "count"), jumlah_unit=("jumlah_unit", "sum"),
        revenue=("revenue", "sum"),
    )
    grouped = grouped.sort_values(
        ["jumlah_booking", "revenue", "service_name"], ascending=[False, False, True]
    ).head(10)
    return [
        {"id": int(row.service_id), "nama": row.service_name,
         "jumlah_booking": int(row.jumlah_booking), "jumlah_unit": int(row.jumlah_unit),
         "revenue": float(row.revenue)}
        for row in grouped.itertuples(index=False)
    ]


def revenue_monthly(frame, keys):
    done = frame[frame["status"] == "done"]
    grouped = done.groupby("bulan").agg(
        revenue=("revenue", "sum"), jumlah_transaksi=("id", "count")
    ).to_dict("index")
    return [
        {"bulan": key, "revenue": float(grouped.get(key, {}).get("revenue", 0)),
         "jumlah_transaksi": int(grouped.get(key, {}).get("jumlah_transaksi", 0))}
        for key in keys
    ]


def technician_report(frame):
    valid = frame[(frame["status"] != "cancelled") & frame["technician_id"].notna()].copy()
    if valid.empty:
        return []
    valid["selesai"] = (valid["status"] == "done").astype(int)
    valid["aktif"] = valid["status"].isin(
        ["scheduled", "rescheduled", "delayed", "on process"]
    ).astype(int)
    valid["tertunda"] = (valid["status"] == "delayed").astype(int)
    grouped = valid.groupby(["technician_id", "technician_name"], as_index=False).agg(
        total_pengerjaan=("id", "count"), selesai=("selesai", "sum"),
        aktif=("aktif", "sum"), tertunda=("tertunda", "sum"),
    ).sort_values(
        ["total_pengerjaan", "selesai", "technician_name"], ascending=[False, False, True]
    ).head(10)
    return [
        {"id": int(row.technician_id), "nama": row.technician_name,
         "total_pengerjaan": int(row.total_pengerjaan), "selesai": int(row.selesai),
         "aktif": int(row.aktif), "tertunda": int(row.tertunda)}
        for row in grouped.itertuples(index=False)
    ]


def scheduled_report(frame, keys):
    valid = frame[frame["status"] != "cancelled"]
    grouped = valid.groupby("bulan").agg(
        jumlah_booking=("id", "count"), pelanggan_unik=("customer_id", "nunique"),
        jumlah_unit=("jumlah_unit", "sum"),
    ).to_dict("index")
    return [
        {"bulan": key, "jumlah_booking": int(grouped.get(key, {}).get("jumlah_booking", 0)),
         "pelanggan_unik": int(grouped.get(key, {}).get("pelanggan_unik", 0)),
         "jumlah_unit": int(grouped.get(key, {}).get("jumlah_unit", 0))}
        for key in keys
    ]


def filter_scopes(frame):
    scopes = {(0, 0)}
    for service_id in frame["service_id"].dropna().unique():
        scopes.add((int(service_id), 0))
    for customer_id in frame["customer_id"].dropna().unique():
        scopes.add((0, int(customer_id)))
    scopes.update(
        (int(service_id), int(customer_id))
        for service_id, customer_id in frame[["service_id", "customer_id"]]
        .drop_duplicates()
        .itertuples(index=False)
    )
    return sorted(scopes)


def apply_scope(frame, service_id, customer_id):
    scoped = frame
    if service_id:
        scoped = scoped[scoped["service_id"] == service_id]
    if customer_id:
        scoped = scoped[scoped["customer_id"] == customer_id]
    return scoped


def build_snapshots(facts, as_of=None, generated_at=None):
    validate_facts(facts)
    cutoff = as_of or default_as_of()
    # MySQL timestamps are stored/read as UTC in the application connection.
    created = generated_at or datetime.now(ZoneInfo("UTC")).replace(tzinfo=None)
    source_updated = pd.to_datetime(facts["updated_at"], errors="coerce").max()
    source_updated = None if pd.isna(source_updated) else source_updated.to_pydatetime()
    services = (
        facts[["service_id", "service_name"]].drop_duplicates().sort_values("service_name")
    )
    customers = (
        facts[["customer_id", "customer_name"]].drop_duplicates().sort_values("customer_name")
    )
    rows = [{
        "report_key": "filter_options", "period_months": 0, "service_id": 0,
        "customer_id": 0,
        "payload": {
            "services": [
                {"id": int(r.service_id), "nama": r.service_name}
                for r in services.itertuples(index=False)
            ],
            "customers": [
                {"id": int(r.customer_id), "nama": r.customer_name}
                for r in customers.itertuples(index=False)
            ],
        },
    }]
    for months in PERIODS:
        frame = period_frame(facts, cutoff, months)
        keys = month_keys(cutoff, months)
        rows.append({
            "report_key": "overview", "period_months": months, "service_id": 0,
            "customer_id": 0,
            "payload": {
                "periode": {
                    "months": months,
                    "mulai": f"{keys[0]}-01",
                    "sampai": cutoff.isoformat(),
                    "zona_waktu": "Asia/Jakarta",
                },
                "definisi": DEFINITIONS, "topCustomers": top_customers(frame),
                "topServices": top_services(frame), "revenueMonthly": revenue_monthly(frame, keys),
                "sumber_data": {
                    "jenis": "snapshot_ds_mysql",
                    "booking_total": int((frame["status"] != "cancelled").sum()),
                },
            },
        })
        for service_id, customer_id in filter_scopes(frame):
            scoped = apply_scope(frame, service_id, customer_id)
            rows.append({"report_key": "technicians", "period_months": months,
                         "service_id": service_id, "customer_id": customer_id,
                         "payload": technician_report(scoped)})
            rows.append({"report_key": "scheduled_bookings", "period_months": months,
                         "service_id": service_id, "customer_id": customer_id,
                         "payload": scheduled_report(scoped, keys)})
    for row in rows:
        row["generated_at"] = created
        row["source_max_updated_at"] = source_updated
    return rows


def publish_snapshots(connection, rows):
    sql = """
        INSERT INTO ds_dashboard_snapshots (
          report_key, period_months, service_id, customer_id, payload,
          generated_at, source_max_updated_at
        ) VALUES (%s,%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE payload=VALUES(payload), generated_at=VALUES(generated_at),
          source_max_updated_at=VALUES(source_max_updated_at)
    """
    values = [(
        row["report_key"], row["period_months"], row["service_id"], row["customer_id"],
        json.dumps(row["payload"], ensure_ascii=False), row["generated_at"],
        row["source_max_updated_at"],
    ) for row in rows]
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM ds_dashboard_snapshots")
        for offset in range(0, len(values), 1000):
            cursor.executemany(sql, values[offset:offset + 1000])
    connection.commit()


def run_pipeline(as_of=None, database_url=None):
    connection = connect(database_url)
    try:
        facts = extract_facts(connection)
        rows = build_snapshots(facts, as_of=as_of)
        publish_snapshots(connection, rows)
        return facts, rows
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", type=date.fromisoformat, default=None)
    args = parser.parse_args()
    facts, rows = run_pipeline(as_of=args.as_of)
    output = Path(__file__).resolve().parent / "output"
    output.mkdir(exist_ok=True)
    pd.DataFrame(rows).drop(columns="payload").to_csv(
        output / "dashboard_snapshot_manifest.csv", index=False
    )
    print(f"DS dashboard: {len(facts)} booking diolah menjadi {len(rows)} snapshot.")


if __name__ == "__main__":
    main()
