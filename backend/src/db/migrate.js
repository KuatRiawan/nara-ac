const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function migrate({ reset = false } = {}) {
  if (reset) {
    // Warning: This is destructive and should only be used in development
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Menolak --reset di production. Gunakan migrasi terkontrol.');
    }
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const dir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const applied = [];
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [f]);
      await client.query('COMMIT');
      applied.push(f);
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`Migrasi ${f} gagal: ${e.message}`);
    } finally {
      client.release();
    }
  }
  return applied;
}

module.exports = { migrate };

if (require.main === module) {
  migrate({ reset: process.argv.includes('--reset') })
    .then((a) => { console.log('Migrasi diterapkan:', a.length ? a.join(', ') : '(tidak ada yang baru)'); return pool.end(); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
