import mysql from 'mysql2/promise';
import 'dotenv/config';

function poolConfig(prefix = '') {
  // prefix examples: '' → 'DB_HOST', 'READONLY' → 'DB_READONLY_HOST'
  const p = prefix ? `DB_${prefix}` : 'DB';
  const key = (k) => `${p}_${k}`;
  return {
    host:     process.env[key('HOST')]     ?? '127.0.0.1',
    port:     Number(process.env[key('PORT')] ?? 3306),
    database: process.env[key('DATABASE')] ?? 'dashboard_wj',
    user:     process.env[key('USERNAME')] ?? 'root',
    password: process.env[key('PASSWORD')] ?? '',
    charset:  'utf8mb4',
    timezone: '+00:00',
    waitForConnections: true,
    connectionLimit: 5,
  };
}

export const pool         = mysql.createPool(poolConfig());
export const poolReadonly = mysql.createPool(poolConfig('READONLY'));

/** Run a SELECT and return rows as plain objects. */
export async function fetchAll(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Run a SELECT and return the first row, or null. */
export async function fetchOne(sql, params = []) {
  const rows = await fetchAll(sql, params);
  return rows[0] ?? null;
}
