const config = require('./config');
const { createApp } = require('./app');
const { migrate } = require('./db/migrate');
const { startScheduler } = require('./services/reminderService');

async function main() {
  // Auto-migrate only in development; in production, migrations should be controlled
  if (process.env.NODE_ENV !== 'production' && process.env.AUTO_MIGRATE !== 'false') {
    const applied = await migrate();
    if (applied.length) console.log('[db] migrasi diterapkan:', applied.join(', '));
  } else if (process.env.NODE_ENV === 'production' && process.env.AUTO_MIGRATE !== 'false') {
    console.warn('[db] AUTO_MIGRATE disarankan dinonaktifkan di production. Gunakan migrasi terkontrol.');
  }
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[api] http://localhost:${config.port}/api/v1  docs: /api/docs  health: /health`);
  });
  startScheduler();
}

main().catch((e) => { console.error('Gagal start:', e); process.exit(1); });
