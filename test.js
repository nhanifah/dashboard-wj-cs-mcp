/**
 * Smoke test — jalankan: node test.js
 * Test koneksi DB dan 3 tool read (tidak perlu MCP client).
 */
import 'dotenv/config';
import { pool } from './db.js';
import { classSchedule } from './tools/schedule.js';
import { batchList } from './tools/batch.js';
import { installmentGetUnpaidByPhone } from './tools/installment.js';
import { studentSearch } from './tools/student.js';
import { broadcastQueryExecute } from './tools/query.js';

let passed = 0;
let failed = 0;

async function run(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    const result = await fn();
    if (result?.error) {
      console.log(`WARN  → ${result.error}`);
    } else {
      console.log('OK');
      passed++;
    }
  } catch (err) {
    console.log(`FAIL  → ${err.message}`);
    failed++;
  }
}

console.log('\n=== WJ CS MCP — Smoke Test ===\n');

// 1. DB ping
await run('DB ping', async () => {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  return {};
});

// 2. class_schedule N5
await run('class_schedule(N5)', async () => {
  const r = await classSchedule({ class_name: 'N5' });
  if (r.error) throw new Error(r.error);
  console.log(`\n      → ${r.schedule.length} jadwal ditemukan`);
  return r;
});

// 3. batch_list tanpa filter
await run('batch_list()', async () => {
  const r = await batchList({ keyword: '', class_name: '' });
  console.log(`\n      → ${r.length} batch ditemukan`);
  return { ok: true };
});

// 4. student_search
await run('student_search("a")', async () => {
  const r = await studentSearch({ keyword: 'a', limit: 5 });
  console.log(`\n      → ${r.total} siswa total, page 1 berisi ${r.data.length} baris`);
  return r;
});

// 5. broadcast_query_execute SELECT sederhana
await run('broadcast_query_execute(SELECT 1)', async () => {
  const r = await broadcastQueryExecute({ sql: 'SELECT 1 AS ping' });
  if (r.error) throw new Error(r.error);
  return r;
});

// 6. broadcast_query_execute — blokir keyword berbahaya
await run('broadcast_query_execute(DROP) → harus diblokir', async () => {
  const r = await broadcastQueryExecute({ sql: 'DROP TABLE students' });
  if (!r.error) throw new Error('Seharusnya diblokir!');
  passed++; // ini expected behavior
  return {};
});

// 7. installment by phone (nomor dummy — kemungkinan 0 hasil, bukan error)
await run('installment_get_unpaid_by_phone(dummy)', async () => {
  const r = await installmentGetUnpaidByPhone({ phone_number: '08000000000' });
  console.log(`\n      → ${r.length} installment unpaid`);
  return { ok: true };
});

console.log(`\n${'='.repeat(34)}`);
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log(`${'='.repeat(34)}\n`);

await pool.end();
process.exit(failed > 0 ? 1 : 0);
