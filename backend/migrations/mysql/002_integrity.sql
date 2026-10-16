-- Also repair foreign keys if the initial baseline was interrupted during setup.
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reminder_log ADD CONSTRAINT fk_reminder_unit_ac FOREIGN KEY (unit_ac_id) REFERENCES ac_units(id) ON DELETE SET NULL;
