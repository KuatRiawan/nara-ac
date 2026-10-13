require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const isProd = process.env.NODE_ENV === 'production';

function required(name, fallbackForDev) {
  const v = process.env[name];
  if (v) return v;
  if (isProd) throw new Error(`Environment variable ${name} wajib diisi di production`);
  return fallbackForDev;
}

module.exports = {
  isProd,
  port: Number(process.env.PORT || 4000),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres@localhost:5433/nara_ac'),
  dbSsl: process.env.DB_SSL === 'true',
  jwtSecret: required('JWT_SECRET'),
  jwtExpires: process.env.JWT_EXPIRES || '8h',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((s) => s.trim()).filter(Boolean),
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 6000),
  aiConfidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.55,
  aiApiKey: process.env.AI_API_KEY || '',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  schedulerEnabled: process.env.SCHEDULER_ENABLED !== 'false',
  demoPassword: required('DEMO_PASSWORD'),
  dataScienceDashboardUrl: process.env.DS_DASHBOARD_URL || '',
  uploadDir: process.env.UPLOAD_DIR || require('path').join(__dirname, '..', 'uploads'),
  allowAnyLocalOrigin: !isProd,
};
