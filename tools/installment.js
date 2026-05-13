import { fetchAll, pool } from '../db.js';

function sanitizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? '62' + digits.slice(1) : digits;
}

export async function installmentGetUnpaidByPhone({ phone_number }) {
  const phone = sanitizePhone(phone_number);
  return fetchAll(
    `SELECT i.installment_id, i.installment_desc, i.installment_price,
            i.installment_status, i.installment_due_date, i.installment_discount,
            i.batch_registration_id,
            s.student_fullname, s.student_whatsapp, s.student_email
     FROM students s
     JOIN installment i ON s.student_id = i.student_id
     WHERE s.student_whatsapp = ? AND i.installment_status = 'unpaid'
     ORDER BY i.installment_due_date ASC`,
    [phone],
  );
}

export async function installmentGetByStudent({ student_id }) {
  const rows = await fetchAll(
    `SELECT i.*, s.student_fullname, br.batch_desc, br.batch_date
     FROM installment i
     JOIN students s             ON i.student_id            = s.student_id
     JOIN batch_registrations br ON i.batch_registration_id = br.id
     WHERE i.student_id = ?
     ORDER BY i.installment_due_date ASC, i.installment_desc ASC`,
    [student_id],
  );
  return { installment: rows };
}

export async function installmentList({ keyword = '', limit = 10, page = 1 }) {
  limit = Math.min(Math.max(1, Number(limit)), 100);
  page  = Math.max(1, Number(page));
  const offset = (page - 1) * limit;

  let where = '1=1';
  let params = [];

  if (keyword) {
    where = `(i.installment_desc LIKE ? OR i.installment_status LIKE ?
              OR s.student_fullname LIKE ? OR s.student_whatsapp LIKE ?
              OR br.batch_desc LIKE ?)`;
    const like = `%${keyword}%`;
    params = [like, like, like, like, like];
  }

  const baseJoin = `FROM installment i
     JOIN students s             ON i.student_id            = s.student_id
     JOIN batch_registrations br ON i.batch_registration_id = br.id
     WHERE ${where}`;

  const conn = await pool.getConnection();
  try {
    const [[{ total }]] = await conn.execute(`SELECT COUNT(*) AS total ${baseJoin}`, params);
    const [rows] = await conn.execute(
      `SELECT i.installment_id, i.installment_desc, i.installment_price,
              i.installment_status, i.installment_due_date, i.installment_discount,
              i.installment_period,
              s.student_fullname, s.student_whatsapp,
              br.batch_desc, br.batch_date
       ${baseJoin} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows, total, page, limit, total_pages: Math.ceil(total / limit) || 1 };
  } finally {
    conn.release();
  }
}
