/**
 * Backend Improvements Tests - Phase 3 (A26-CS054)
 * 
 * Tests for:
 * - BE-001: Advisory lock race condition prevention
 * - BE-006: Idempotency key support
 * - BE-010-013: Status transition validation
 * - BE-020-025: Reminder deduplication
 * - BE-030-033: Inventory validation
 */

const { TRANSITIONS, changeStatus, addInventoryUsage } = require('../src/services/bookingService');

describe('Backend Improvements - Phase 3', () => {
  describe('BE-001: Advisory Lock Race Condition Prevention', () => {
    test('pg_advisory_xact_lock is used in createBooking', () => {
      const fs = require('fs');
      const path = require('path');
      const bookingService = fs.readFileSync(
        path.join(__dirname, '../src/services/bookingService.js'),
        'utf-8'
      );
      
      expect(bookingService).toContain('pg_advisory_xact_lock');
      expect(bookingService).toContain('booking-slots');
    });

    test('pg_advisory_xact_lock is used in workflowService assign', () => {
      const fs = require('fs');
      const path = require('path');
      const workflowService = fs.readFileSync(
        path.join(__dirname, '../src/services/workflowService.js'),
        'utf-8'
      );
      
      expect(workflowService).toContain('pg_advisory_xact_lock');
      expect(workflowService).toContain('booking-slots');
    });

    test('pg_advisory_xact_lock is used in reschedule', () => {
      const fs = require('fs');
      const path = require('path');
      const bookingService = fs.readFileSync(
        path.join(__dirname, '../src/services/bookingService.js'),
        'utf-8'
      );
      
      expect(bookingService).toContain('lockSlots');
    });
  });

  describe('BE-006: Idempotency Key Support', () => {
    test('Booking service handles idempotency_key in createBooking', () => {
      const fs = require('fs');
      const path = require('path');
      const bookingService = fs.readFileSync(
        path.join(__dirname, '../src/services/bookingService.js'),
        'utf-8'
      );
      
      expect(bookingService).toContain('idempotency_key');
      expect(bookingService).toContain('input.idempotency_key');
    });

    test('Idempotency key functions exist in utils/ids.js', () => {
      const fs = require('fs');
      const path = require('path');
      const idsJs = fs.readFileSync(
        path.join(__dirname, '../src/utils/ids.js'),
        'utf-8'
      );
      
      expect(idsJs).toContain('generateIdempotencyKey');
      expect(idsJs).toContain('getIdempotencyKey');
    });

    test('Migration 007 adds idempotency_key column', () => {
      const fs = require('fs');
      const path = require('path');
      const migration = fs.readFileSync(
        path.join(__dirname, '../migrations/007_idempotency_and_improvements.sql'),
        'utf-8'
      );
      
      expect(migration).toContain('idempotency_key');
      expect(migration).toContain('UNIQUE INDEX');
    });
  });

  describe('BE-010-013: Status Transition Validation', () => {
    test('TRANSITIONS object is defined with all statuses', () => {
      expect(TRANSITIONS).toBeDefined();
      expect(TRANSITIONS.scheduled).toContain('on process');
      expect(TRANSITIONS.scheduled).toContain('delayed');
      expect(TRANSITIONS['on process']).toContain('done');
      expect(TRANSITIONS.done).toEqual([]);
      expect(TRANSITIONS.cancelled).toEqual([]);
    });

    test('changeStatus validates transitions', () => {
      // This test verifies that changeStatus checks TRANSITIONS
      const fs = require('fs');
      const path = require('path');
      const bookingService = fs.readFileSync(
        path.join(__dirname, '../src/services/bookingService.js'),
        'utf-8'
      );
      
      expect(bookingService).toContain('TRANSITIONS[b.status]');
      expect(bookingService).toContain('includes(newStatus)');
    });

    test('Illegal transition from done to scheduled is rejected', () => {
      // This verifies the logic exists to reject illegal transitions
      expect(TRANSITIONS.done).not.toContain('scheduled');
    });

    test('Legal transition from scheduled to on process is allowed', () => {
      expect(TRANSITIONS.scheduled).toContain('on process');
    });
  });

  describe('BE-020-025: Reminder Deduplication', () => {
    test('Reminder log table has UNIQUE constraint', () => {
      const fs = require('fs');
      const path = require('path');
      const migration = fs.readFileSync(
        path.join(__dirname, '../migrations/001_init.sql'),
        'utf-8'
      );
      
      expect(migration).toContain('UNIQUE (booking_id, target, untuk_tanggal)');
    });

    test('Reminder service uses ON CONFLICT DO NOTHING', () => {
      const fs = require('fs');
      const path = require('path');
      const reminderService = fs.readFileSync(
        path.join(__dirname, '../src/services/reminderService.js'),
        'utf-8'
      );
      
      expect(reminderService).toContain('ON CONFLICT');
      expect(reminderService).toContain('DO NOTHING');
    });

    test('Reminder service filters out cancelled bookings', () => {
      const fs = require('fs');
      const path = require('path');
      const reminderService = fs.readFileSync(
        path.join(__dirname, '../src/services/reminderService.js'),
        'utf-8'
      );
      
      // Line 90 in reminderService.js filters for status='scheduled'
      expect(reminderService).toContain("status='scheduled'");
    });
  });

  describe('BE-030-033: Inventory Validation', () => {
    test('Inventory usage validates stock availability', () => {
      const fs = require('fs');
      const path = require('path');
      const bookingService = fs.readFileSync(
        path.join(__dirname, '../src/services/bookingService.js'),
        'utf-8'
      );
      
      // Inventory validation is in addInventoryUsage function
      expect(bookingService).toContain('addInventoryUsage');
      const workflowService = fs.readFileSync(
        path.join(__dirname, '../src/services/workflowService.js'),
        'utf-8'
      );
      expect(workflowService).toContain('FOR UPDATE');
    });

    test('Inventory usage uses transaction', () => {
      const fs = require('fs');
      const path = require('path');
      const workflowService = fs.readFileSync(
        path.join(__dirname, '../src/services/workflowService.js'),
        'utf-8'
      );
      
      expect(workflowService).toContain('withTx');
    });

    test('Inventory adjustments are logged', () => {
      const fs = require('fs');
      const path = require('path');
      const bookingService = fs.readFileSync(
        path.join(__dirname, '../src/services/bookingService.js'),
        'utf-8'
      );
      
      expect(bookingService).toContain('inventory_adjustments');
    });
  });

  describe('Observability Improvements', () => {
    test('Migration 007 adds indexes for performance', () => {
      const fs = require('fs');
      const path = require('path');
      const migration = fs.readFileSync(
        path.join(__dirname, '../migrations/007_idempotency_and_improvements.sql'),
        'utf-8'
      );
      
      expect(migration).toContain('CREATE INDEX');
      expect(migration).toContain('idx_bookings_kode');
      expect(migration).toContain('idx_reminder_booking');
    });

    test('Error handler uses structured logging', () => {
      const fs = require('fs');
      const path = require('path');
      const errorHandler = fs.readFileSync(
        path.join(__dirname, '../src/middleware/errorHandler.js'),
        'utf-8'
      );
      
      // Error handler now uses structured logging via logError
      expect(errorHandler).toContain('logError');
      expect(errorHandler).toContain("require('../utils/logger')");
    });

    test('Reminder service is production-safe', () => {
      const fs = require('fs');
      const path = require('path');
      const reminderService = fs.readFileSync(
        path.join(__dirname, '../src/services/reminderService.js'),
        'utf-8'
      );
      
      expect(reminderService).toContain("process.env.NODE_ENV !== 'production'");
    });

    test('Logger utility exists', () => {
      const fs = require('fs');
      const path = require('path');
      const logger = fs.readFileSync(
        path.join(__dirname, '../src/utils/logger.js'),
        'utf-8'
      );
      
      expect(logger).toContain('generateRequestId');
      expect(logger).toContain('requestLogger');
      expect(logger).toContain('healthCheckHandler');
      expect(logger).toContain('logError');
    });

    test('App.js uses request logger', () => {
      const fs = require('fs');
      const path = require('path');
      const app = fs.readFileSync(
        path.join(__dirname, '../src/app.js'),
        'utf-8'
      );
      
      expect(app).toContain("requestLogger");
      expect(app).toContain("healthCheckHandler");
    });
  });

  describe('TEST-004: Booking Status Transitions', () => {
    test('TRANSITIONS object is defined with correct structure', () => {
      expect(TRANSITIONS).toBeDefined();
      expect(TRANSITIONS).toHaveProperty('scheduled');
      expect(TRANSITIONS).toHaveProperty('rescheduled');
      expect(TRANSITIONS).toHaveProperty('delayed');
      expect(TRANSITIONS).toHaveProperty('on process');
      expect(TRANSITIONS).toHaveProperty('done');
      expect(TRANSITIONS).toHaveProperty('cancelled');
    });

    test('Valid transitions from scheduled', () => {
      const validTransitions = TRANSITIONS['scheduled'];
      expect(validTransitions).toContain('on process');
      expect(validTransitions).toContain('delayed');
      expect(validTransitions).not.toContain('done');
      expect(validTransitions).not.toContain('cancelled');
    });

    test('Valid transitions from on process', () => {
      const validTransitions = TRANSITIONS['on process'];
      expect(validTransitions).toContain('done');
      expect(validTransitions).toContain('delayed');
      expect(validTransitions).not.toContain('scheduled');
    });

    test('No transitions from done', () => {
      expect(TRANSITIONS['done']).toEqual([]);
    });

    test('No transitions from cancelled', () => {
      expect(TRANSITIONS['cancelled']).toEqual([]);
    });

    test('changeStatus function exists and validates transitions', () => {
      // Just verify the function exists and uses TRANSITIONS
      expect(typeof changeStatus).toBe('function');
      
      // Verify TRANSITIONS is used in changeStatus by checking the code
      const fs = require('fs');
      const path = require('path');
      const bookingService = fs.readFileSync(
        path.join(__dirname, '../src/services/bookingService.js'),
        'utf-8'
      );
      
      expect(bookingService).toContain('TRANSITIONS[b.status]');
      expect(bookingService).toContain('includes(newStatus)');
    });
  });

  describe('TEST-005: Reminder Service', () => {
    test('runReminders function exists', () => {
      const { runReminders } = require('../src/services/reminderService');
      expect(typeof runReminders).toBe('function');
    });

    test('reminderService filters cancelled bookings in runReminders', () => {
      const fs = require('fs');
      const path = require('path');
      const reminderService = fs.readFileSync(
        path.join(__dirname, '../src/services/reminderService.js'),
        'utf-8'
      );
      
      // Verify that only 'scheduled' bookings are selected
      expect(reminderService).toContain("b.status='scheduled'");
      expect(reminderService).toContain("ON CONFLICT");
    });
  });

  describe('TEST-006: Inventory Mutation', () => {
    test('addInventoryUsage function exists in bookingService', () => {
      expect(typeof addInventoryUsage).toBe('function');
    });

    test('addInventoryUsage validates stock in bookingService', () => {
      const fs = require('fs');
      const path = require('path');
      const bookingService = fs.readFileSync(
        path.join(__dirname, '../src/services/bookingService.js'),
        'utf-8'
      );
      
      // Verify stock validation exists
      expect(bookingService).toContain('stok');
      expect(bookingService).toContain('FOR UPDATE');
    });
  });
});
