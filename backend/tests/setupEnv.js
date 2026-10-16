process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.SCHEDULER_ENABLED = 'false';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'mysql://root@127.0.0.1:3306/nara_ac_automated_test';
if (!new URL(process.env.DATABASE_URL).pathname.endsWith('_test')) throw new Error('Tests require a dedicated *_test database.');
process.env.DEMO_PASSWORD = 'Admin123';
process.env.ENABLE_DEV_OTP = 'true';
