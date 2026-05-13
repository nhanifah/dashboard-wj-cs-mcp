import { pool } from '../db.js';

export async function studentSearch({ keyword, limit = 10, page = 1 }) {
  limit = Math.min(Math.max(1, Number(limit)), 50);
  page  = Math.max(1, Number(page));
  const offset = (page - 1) * limit;
  const like   = `%${keyword}%`;

  const conn = await pool.getConnection();
  try {
    const [[{ total }]] = await conn.execute(
      `SELECT COUNT(DISTINCT s.student_id) AS total
       FROM students s
       WHERE s.student_fullname LIKE ? OR s.student_whatsapp LIKE ?`,
      [like, like],
    );
    const [rows] = await conn.execute(
      `SELECT s.student_id, s.student_fullname, s.student_whatsapp,
              s.student_email, s.student_address_province,
              GROUP_CONCAT(DISTINCT br.batch_desc ORDER BY br.batch_date DESC) AS kelas_terdaftar
       FROM students s
       LEFT JOIN installment i         ON s.student_id = i.student_id
       LEFT JOIN batch_registrations br ON i.batch_registration_id = br.id
       WHERE s.student_fullname LIKE ? OR s.student_whatsapp LIKE ?
       GROUP BY s.student_id, s.student_fullname, s.student_whatsapp,
                s.student_email, s.student_address_province
       ORDER BY s.student_fullname ASC
       LIMIT ${limit} OFFSET ${offset}`,
      [like, like],
    );
    return { data: rows, total, page, limit, total_pages: Math.ceil(total / limit) || 1 };
  } finally {
    conn.release();
  }
}
