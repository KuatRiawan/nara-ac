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
  jwtSecret: required('JWT_SECRET', (() => {
    if (!isProd) {
      console.warn('[config] PERINGATAN: JWT_SECRET tidak diisi. Menggunakan secret default development yang TIDAK AMAN. Wajib diisi di production!');
      return 'dev-only-insecure-jwt-secret-change-me';
    }
    return undefined;
  })()),
  jwtExpires: process.env.JWT_EXPIRES || '8h',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((s) => s.trim()).filter(Boolean),
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 6000),
  aiConfidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.55,
  aiApiKey: (() => {
    const key = process.env.AI_API_KEY || '';
    if (isProd && !key) {
      throw new Error('Environment variable AI_API_KEY wajib diisi di production untuk otentikasi AI service.');
    }
    return key;
  })(),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  schedulerEnabled: process.env.SCHEDULER_ENABLED !== 'false',
  demoPassword: (() => {
    const p = process.env.DEMO_PASSWORD;
    if (isProd) {
      if (!p || p === 'dev-only-insecure-demo-password') {
        throw new Error('Environment variable DEMO_PASSWORD tidak boleh kosong atau menggunakan default dev di production.');
      }
      return p;
    }
    return p || 'dev-only-insecure-demo-password';
  })(),
  dataScienceDashboardUrl: process.env.DS_DASHBOARD_URL || '',
  uploadDir: process.env.UPLOAD_DIR || require('path').join(__dirname, '..', 'uploads'),
  allowAnyLocalOrigin: !isProd,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
};
