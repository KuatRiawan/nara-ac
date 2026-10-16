const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

pool.on('error', (err) => {
   
  console.error('[db] idle client error', err.message);
});

/** Jalankan fungsi dalam transaksi. */
async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Validasi dan sanitize LIMIT dan OFFSET untuk query SQL
 * PostgreSQL tidak support parameterized LIMIT/OFFSET, jadi perlu validasi manual
 */
function sanitizeLimitOffset(limit, offset = 0) {
  const maxLimit = 1000; // Batas maksimum untuk mencegah DoS
  const l = Number.isInteger(limit) ? Math.min(Math.max(1, limit), maxLimit) : 50;
  const o = Number.isInteger(offset) ? Math.max(0, offset) : 0;
  return { limit: l, offset: o };
}

module.exports = { pool, query: (t, p) => pool.query(t, p), withTx, withTransaction: withTx, sanitizeLimitOffset };
