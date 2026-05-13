import { fetchAll, fetchOne } from '../db.js';

function toDate(v) {
  return v instanceof Date ? v : new Date(v);
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatMonthYear(d) {
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export async function batchList({ keyword = '', class_name = '' }) {
  const conditions = ['1=1'];
  const params = [];

  if (keyword) {
    conditions.push('(br.batch_desc LIKE ? OR br.batch_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (class_name) {
    conditions.push('br.batch_desc LIKE ?');
    params.push(`%${class_name}%`);
  }

  return fetchAll(
    `SELECT br.id, br.batch_name, br.batch_desc, br.batch_date,
            br.batch_price, br.batch_quota, br.batch_status,
            pl.package_desc, pl.package_installment_period,
            COUNT(DISTINCT s.student_id) AS jumlah_siswa
     FROM batch_registrations br
     JOIN package_list pl ON br.package_id = pl.package_id
     LEFT JOIN installment i ON br.id = i.batch_registration_id
     LEFT JOIN students s    ON i.student_id = s.student_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY br.id, br.batch_name, br.batch_desc, br.batch_date,
              br.batch_price, br.batch_quota, br.batch_status,
              pl.package_desc, pl.package_installment_period
     ORDER BY br.batch_date DESC`,
    params,
  );
}

export async function batchCurrentMonth({ class_name }) {
  const now = new Date();
  const rows = await fetchAll(
    `SELECT br.id, br.batch_name, br.batch_desc, br.batch_date,
            br.batch_price, br.batch_quota, br.batch_status,
            pl.package_desc, pl.package_installment_period,
            COUNT(DISTINCT s.student_id) AS jumlah_siswa
     FROM batch_registrations br
     JOIN package_list pl ON br.package_id = pl.package_id
     LEFT JOIN installment i ON br.id = i.batch_registration_id
     LEFT JOIN students s    ON i.student_id = s.student_id
     WHERE br.batch_desc LIKE ?
     GROUP BY br.id, br.batch_name, br.batch_desc, br.batch_date,
              br.batch_price, br.batch_quota, br.batch_status,
              pl.package_desc, pl.package_installment_period
     ORDER BY br.batch_date ASC`,
    [`%${class_name}%`],
  );

  const filtered = rows.filter((r) => sameMonth(toDate(r.batch_date), now));

  if (filtered.length === 0) {
    return { message: `Tidak ada batch ${class_name} di bulan ${formatMonthYear(now)}` };
  }

  return filtered.map((r) => ({
    batch_name:   r.batch_name,
    batch_desc:   r.batch_desc,
    batch_date:   toDate(r.batch_date).toISOString().slice(0, 10),
    batch_price:  Number(r.batch_price),
    jumlah_siswa: Number(r.jumlah_siswa),
    package_desc: r.package_desc,
  }));
}

export async function batchAvailableMonths() {
  const rows = await fetchAll(
    `SELECT DISTINCT batch_date FROM batch_registrations ORDER BY batch_date DESC`,
    [],
  );

  const seen = new Map();
  for (const r of rows) {
    const d = toDate(r.batch_date);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    if (!seen.has(key)) seen.set(key, new Date(d.getFullYear(), d.getMonth(), 1));
  }

  return Array.from(seen.values())
    .sort((a, b) => b - a)
    .map(formatMonthYear);
}

export async function batchGetById({ batch_id }) {
  return fetchOne(
    `SELECT id, batch_name, batch_quota, batch_price, batch_date,
            batch_discount, batch_desc, batch_status
     FROM batch_registrations WHERE id = ? LIMIT 1`,
    [batch_id],
  );
}

export async function packageLookup({ class_name = '', package_id = '' }) {
  if (package_id) {
    return fetchOne('SELECT * FROM package_list WHERE package_id = ? LIMIT 1', [package_id]);
  }
  if (!class_name) return { error: 'Berikan class_name atau package_id' };

  const like = `%${class_name}%`;
  const isKaiwa = class_name.toUpperCase().includes('KAIWA');

  if (isKaiwa) {
    return fetchOne(
      'SELECT * FROM package_list WHERE (package_desc LIKE ? OR package_name LIKE ?) LIMIT 1',
      [like, like],
    );
  }
  return fetchOne(
    `SELECT * FROM package_list
     WHERE (package_desc LIKE ? OR package_name LIKE ?)
       AND package_desc NOT LIKE '%Kaiwa%'
       AND package_name NOT LIKE '%Kaiwa%'
     LIMIT 1`,
    [like, like],
  );
}
