import { fetchAll } from '../db.js';

const VALID_CLASSES = new Set(['N5', 'N4', 'N3', 'JFT', 'KAIWA']);

export async function classSchedule({ class_name }) {
  const cls = class_name.trim().toUpperCase();
  if (!VALID_CLASSES.has(cls)) {
    return { error: `class_name harus salah satu dari: ${[...VALID_CLASSES].join(', ')}` };
  }

  const likeParam = `%${cls}%`;
  let rows;

  if (cls !== 'KAIWA') {
    rows = await fetchAll(
      `SELECT id, batch_name, batch_desc, batch_date, batch_price, batch_quota, batch_status
       FROM batch_registrations
       WHERE batch_date >= CURDATE()
         AND batch_desc LIKE ?
         AND batch_desc NOT LIKE ?
       ORDER BY batch_date ASC`,
      [likeParam, `%kaiwa${cls}%`],
    );
  } else {
    rows = await fetchAll(
      `SELECT id, batch_name, batch_desc, batch_date, batch_price, batch_quota, batch_status
       FROM batch_registrations
       WHERE batch_date >= CURDATE()
         AND batch_desc LIKE ?
       ORDER BY batch_date ASC`,
      [likeParam],
    );
  }

  const quota = {};
  for (const r of rows) {
    quota[r.batch_name] = (quota[r.batch_name] ?? 0) + (r.batch_quota ?? 0);
  }

  return { schedule: rows, quota };
}
