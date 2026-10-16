from datetime import date, datetime

import pandas as pd

from business_report_pipeline import build_snapshots, validate_facts


def sample_facts():
    rows = [
        (1, 1, "Customer A", 10, "Cuci", 100, "Teknisi A", "done", 2, "2026-10-01", 150000),
        (2, 1, "Customer A", 10, "Cuci", 100, "Teknisi A", "scheduled", 1, "2026-10-02", 75000),
        (3, 2, "Customer B", 11, "Freon", 101, "Teknisi B", "cancelled", 1, "2026-09-03", 90000),
    ]
    frame = pd.DataFrame(rows, columns=[
        "id", "customer_id", "customer_name", "service_id", "service_name",
        "technician_id", "technician_name", "status", "jumlah_unit", "jadwal_mulai", "revenue",
    ])
    frame["jadwal_wib"] = pd.to_datetime(frame["jadwal_mulai"], utc=True).dt.tz_convert(
        "Asia/Jakarta"
    )
    frame["tanggal"] = frame["jadwal_wib"].dt.date
    frame["bulan"] = frame["jadwal_wib"].dt.strftime("%Y-%m")
    frame["updated_at"] = datetime(2026, 10, 3)
    return frame


def find(rows, key, months=3, service=0, customer=0):
    return next(row for row in rows if row["report_key"] == key and row["period_months"] == months
                and row["service_id"] == service and row["customer_id"] == customer)


def test_snapshot_contract_and_business_rules():
    facts = sample_facts()
    validate_facts(facts)
    rows = build_snapshots(facts, as_of=date(2026, 10, 16), generated_at=datetime(2026, 10, 16))
    overview = find(rows, "overview")["payload"]
    assert overview["topCustomers"][0]["jumlah_transaksi"] == 2
    assert overview["topServices"][0]["jumlah_unit"] == 3
    assert overview["revenueMonthly"][-1]["revenue"] == 150000
    assert len(overview["revenueMonthly"]) == 3
    technicians = find(rows, "technicians", service=10)["payload"]
    assert technicians[0]["total_pengerjaan"] == 2
    scheduled = find(rows, "scheduled_bookings", customer=1)["payload"]
    assert scheduled[-1]["jumlah_booking"] == 2
    assert scheduled[-1]["pelanggan_unik"] == 1


def test_duplicate_booking_is_rejected():
    facts = pd.concat([sample_facts(), sample_facts().iloc[[0]]], ignore_index=True)
    try:
        validate_facts(facts)
    except ValueError as exc:
        assert "lebih dari sekali" in str(exc)
    else:
        raise AssertionError("Duplikasi booking seharusnya ditolak")
