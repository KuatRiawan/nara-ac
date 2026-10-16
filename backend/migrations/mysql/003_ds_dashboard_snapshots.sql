CREATE TABLE IF NOT EXISTS ds_dashboard_snapshots (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  report_key VARCHAR(64) NOT NULL,
  period_months SMALLINT NOT NULL,
  service_id BIGINT NOT NULL DEFAULT 0,
  customer_id BIGINT NOT NULL DEFAULT 0,
  payload JSON NOT NULL,
  generated_at DATETIME(3) NOT NULL,
  source_max_updated_at DATETIME(3),
  UNIQUE KEY uq_ds_dashboard_snapshot (report_key, period_months, service_id, customer_id),
  INDEX idx_ds_dashboard_generated (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
