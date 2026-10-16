require('../tests/setupEnv');
const { execFileSync } = require('child_process');
const path = require('path');
const mysql = require('mysql2/promise');
async function prepare() {
  const url = new URL(process.env.DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!/^[a-zA-Z0-9_]+_automated_test$/.test(name)) throw new Error('Only *_automated_test may be recreated by tests.');
  const connection = await mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) });
  try { await connection.query(`DROP DATABASE IF EXISTS \`${name}\``); } finally { await connection.end(); }
  for (const script of ['src/db/migrate.js', 'src/db/seed.js']) {
    execFileSync(process.execPath, [path.join(__dirname, '..', script)], { stdio: 'inherit', env: process.env });
  }
  const db = require('../src/db/pool');
  // Fixed-date legacy scenarios need a wider test-only scheduling window.
  const ops = (await db.query("SELECT value FROM settings WHERE setting_key='operating_hours'")).rows[0].value;
  await db.query("UPDATE settings SET value=$1 WHERE setting_key='operating_hours'", [JSON.stringify({ ...ops, max_advance_days: 90 })]);
  await db.pool.end();
}
prepare().catch(error => { console.error(error); process.exitCode = 1; });
