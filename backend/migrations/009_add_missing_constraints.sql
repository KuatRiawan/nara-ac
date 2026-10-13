-- 009_add_missing_constraints.sql - Tambah CHECK & FK constraints yang hilang secara idempoten

DO $$
BEGIN
  -- notifications.target_role harus valid
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_target_role_check') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_target_role_check 
      CHECK (target_role IS NULL OR target_role IN ('admin', 'technician', 'customer'));
  END IF;

  -- notifications.type harus valid
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
      CHECK (type IN ('booking', 'inventory', 'system', 'feedback', 'reminder'));
  END IF;

  -- work_orders: pastikan booking_id referensi valid
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_booking_fk') THEN
    ALTER TABLE work_orders ADD CONSTRAINT work_orders_booking_fk 
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
  END IF;

  -- work_order_checklists: pastikan booking_id referensi valid
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_order_checklists_booking_fk') THEN
    ALTER TABLE work_order_checklists ADD CONSTRAINT work_order_checklists_booking_fk 
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
  END IF;

  -- work_order_photos: pastikan booking_id referensi valid  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_order_photos_booking_fk') THEN
    ALTER TABLE work_order_photos ADD CONSTRAINT work_order_photos_booking_fk
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
  END IF;

  -- service_reports: pastikan booking_id referensi valid
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_reports_booking_fk') THEN
    ALTER TABLE service_reports ADD CONSTRAINT service_reports_booking_fk
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
  END IF;

  -- schedule_history: pastikan booking_id referensi valid
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_history_booking_fk') THEN
    ALTER TABLE schedule_history ADD CONSTRAINT schedule_history_booking_fk
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
  END IF;

  -- Complaint tickets: constraint untuk status (idempotent)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaint_tickets_status_check') THEN
    ALTER TABLE complaint_tickets ADD CONSTRAINT complaint_tickets_status_check 
      CHECK (status IN ('open', 'closed'));
  END IF;

  -- Complaint tickets: constraint untuk sumber (idempotent)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaint_tickets_sumber_check') THEN
    ALTER TABLE complaint_tickets ADD CONSTRAINT complaint_tickets_sumber_check 
      CHECK (sumber IN ('chatbot', 'email', 'telepon', 'web', 'admin'));
  END IF;
END $$;

