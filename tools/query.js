import { poolReadonly } from '../db.js';

const FORBIDDEN = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXECUTE|LOAD_FILE|BENCHMARK|SLEEP)\b|INTO\s+(OUTFILE|DUMPFILE)|INFORMATION_SCHEMA|MYSQL\.USER/i;
const COMMENT   = /--|\/\*|#/;

export async function broadcastQueryExecute({ sql, limit = 500 }) {
  limit = Math.min(Math.max(1, Number(limit)), 5000);
  sql   = sql.trim();

  if (!sql.toUpperCase().startsWith('SELECT')) return { error: 'Query harus diawali dengan SELECT.' };
  if (sql.includes(';'))    return { error: 'Titik-koma (;) tidak diperbolehkan.' };
  if (COMMENT.test(sql))    return { error: 'Komentar SQL tidak diperbolehkan.' };
  if (FORBIDDEN.test(sql))  return { error: 'Query mengandung keyword yang dilarang.' };

  const wrapped = `SELECT * FROM (${sql}) AS __cs_query LIMIT ${limit}`;
  const conn = await poolReadonly.getConnection();
  try {
    const [rows] = await conn.execute(wrapped);
    return { data: rows, row_count: rows.length, truncated: rows.length === limit };
  } catch (err) {
    return { error: err.message };
  } finally {
    conn.release();
  }
}
