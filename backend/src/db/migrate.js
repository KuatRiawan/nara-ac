const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config');
const { pool } = require('./pool');

async function migrate({ reset = false } = {}) {
  if (reset) throw new Error('Reset otomatis dinonaktifkan. Gunakan database baru untuk menjaga data lokal.');
  const url = new URL(config.databaseUrl);
  const name = url.pathname.slice(1);
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error('Nama database tidak valid.');
  const admin = await mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) });
  try { await admin.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); }
  finally { await admin.end(); }
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3))');
  const dir = path.join(__dirname, '../../migrations/mysql');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map(r => r.name));
  const applied = [];
  for (const file of files) {
    if (done.has(file)) continue;
    // DDL auto-commits in MySQL. The baseline is idempotent for interrupted runs.
    const sql = fs.readFileSync(path.join(dir, file), 'utf8').replace(/--[^\n]*/g, '');
    const statements = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/).map(s => s.trim()).filter(Boolean);
    for (let statement of statements) {
      const index = statement.match(/^CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?(\w+) ON (\w+)/i);
      if (index) {
        const exists = await pool.query('SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=$1 AND index_name=$2', [index[2], index[1]]);
        if (exists.rows.length) continue;
        statement = statement.replace('INDEX IF NOT EXISTS', 'INDEX');
      }
      const column = statement.match(/^ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS (\w+)/i);
      if (column) {
        const exists = await pool.query('SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=$1 AND column_name=$2', [column[1], column[2]]);
        if (exists.rows.length) continue;
        statement = statement.replace('ADD COLUMN IF NOT EXISTS', 'ADD COLUMN');
      }
      const foreign = statement.match(/^ALTER TABLE (\w+) ADD CONSTRAINT \w+ FOREIGN KEY \((\w+)\)/i);
      if (foreign) {
        const exists = await pool.query('SELECT 1 FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name=$1 AND column_name=$2 AND referenced_table_name IS NOT NULL', [foreign[1], foreign[2]]);
        if (exists.rows.length) continue;
      }
      await pool.query(statement);
    }
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    applied.push(file);
  }
  return applied;
}
module.exports = { migrate };
if (require.main === module) migrate({ reset: process.argv.includes('--reset') })
  .then(a => console.log('Migrasi MySQL:', a.length ? a.join(', ') : 'sudah terbaru'))
  .catch(e => { console.error(e.message); process.exitCode = 1; })
  .finally(() => pool.end());
