const mysql = require('mysql2/promise');
const config = require('../config');
const rawPool = mysql.createPool({
  uri: config.databaseUrl, connectionLimit: 10, timezone: 'Z', decimalNumbers: true,
  charset: 'utf8mb4', multipleStatements: false,
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      const value = field.string();
      return value === null ? null : value === '1';
    }
    if (field.type === 'DATE') return field.string();
    return next();
  },
});
rawPool.on('connection', connection => connection.query("SET time_zone = '+00:00'"));
const jsonColumns = new Set(['value', 'detail', 'metadata', 'sebelum', 'sesudah', 'data', 'metrik', 'entities', 'bahan_dibutuhkan', 'payload']);
function decodeRows(rows) {
  for (const row of rows) for (const key of jsonColumns) {
    if (typeof row[key] === 'string') {
      try { row[key] = JSON.parse(row[key]); } catch { /* Legacy text value. */ }
    }
  }
  return rows;
}
// Keep numbered parameters at the service boundary; mysql2 escapes every value.
function bind(sql, params = []) {
  const values = [];
  const text = sql.replace(/'(?:''|\\.|[^'\\])*'|\$(\d+)/g, (match, index) => {
    if (!index) return match;
    const value = params[Number(index) - 1];
    if (value === undefined) throw new Error(`Missing SQL parameter ${match}`);
    values.push(value);
    return '?';
  });
  return { sql: text, values };
}
async function execute(connection, sql, params = []) {
  const statement = bind(sql, params);
  const [result] = await connection.query(statement.sql, statement.values);
  return Array.isArray(result)
    ? { rows: decodeRows(result), rowCount: result.length }
    : { rows: [], rowCount: result.affectedRows, insertId: result.insertId };
}
// MySQL 8 and MariaDB 10.4 have no UPDATE RETURNING. Read snapshots on the
// same connection, under a transaction. Only single-row inserts use RETURNING.
async function run(connection, sql, params = []) {
  const returning = sql.match(/\s+RETURNING\s+([\s\S]+?)\s*;?$/i);
  if (!returning) return execute(connection, sql, params);
  const mutation = sql.slice(0, returning.index);
  const projection = returning[1].replace(/;$/, '');
  const insert = mutation.match(/^\s*INSERT\s+INTO\s+(\w+)/i);
  if (insert) {
    const result = await execute(connection, mutation, params);
    if (insert[1] === 'work_orders') return execute(connection, `SELECT ${projection} FROM work_orders WHERE booking_id=$1`, [params[0]]);
    if (insert[1] === 'technician_availability') return execute(connection, `SELECT ${projection} FROM technician_availability WHERE teknisi_id=$1 AND tanggal=$2`, params.slice(0, 2));
    if (!result.insertId) return { rows: [], rowCount: 0 };
    return execute(connection, `SELECT ${projection} FROM ${insert[1]} WHERE id=$1`, [result.insertId]);
  }
  const change = mutation.match(/^\s*(UPDATE|DELETE FROM)\s+(\w+)\s+([\s\S]+)$/i);
  if (!change) throw new Error('Unsupported returning statement');
  const where = change[3].match(/\bWHERE\s+([\s\S]+)$/i);
  if (!where) throw new Error('Returning mutation requires WHERE');
  const pk = change[2] === 'work_orders' ? 'booking_id' : 'id';
  const before = await execute(connection, `SELECT * FROM ${change[2]} WHERE ${where[1]} FOR UPDATE`, params);
  await execute(connection, mutation, params);
  if (change[1].toUpperCase() === 'DELETE FROM') return before;
  if (!before.rows.length) return { rows: [], rowCount: 0 };
  return execute(connection, `SELECT ${projection} FROM ${change[2]} WHERE ${pk} IN ($1)`, [before.rows.map(row => row[pk])]);
}
function wrapConnection(connection) {
  return { query: (sql, params) => run(connection, sql, params), release: () => connection.release() };
}
async function connect() { return wrapConnection(await rawPool.getConnection()); }
async function withTx(fn) {
  const connection = await rawPool.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const result = await fn(wrapConnection(connection));
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
async function query(sql, params) {
  if (/\sRETURNING\s/i.test(sql)) return withTx(client => client.query(sql, params));
  const connection = await rawPool.getConnection();
  try { return await run(connection, sql, params); } finally { connection.release(); }
}
const pool = { query, connect, end: () => rawPool.end() };
function sanitizeLimitOffset(limit, offset = 0) {
  return { limit: Number.isInteger(limit) ? Math.min(Math.max(1, limit), 1000) : 50,
    offset: Number.isInteger(offset) ? Math.max(0, offset) : 0 };
}
module.exports = { pool, query, withTx, withTransaction: withTx, sanitizeLimitOffset, bind };
