-- 003_admin_operations.sql - Audit Log and Notifications

CREATE TABLE audit_logs (
  id          SERIAL PRIMARY KEY,
  actor       TEXT NOT NULL,
  role        TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   INTEGER,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  target_role TEXT, -- 'admin', 'technician', 'customer'
  target_id   INTEGER, -- user id or technician id
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  type        TEXT NOT NULL, -- 'booking', 'inventory', 'system', 'feedback'
  reference_id INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adjust inventory for adjustment history
CREATE TABLE inventory_adjustments (
  id          SERIAL PRIMARY KEY,
  item_id     INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  jenis       TEXT NOT NULL CHECK (jenis IN ('in', 'out', 'adjustment')),
  jumlah      NUMERIC(10,2) NOT NULL,
  catatan     TEXT,
  oleh        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
