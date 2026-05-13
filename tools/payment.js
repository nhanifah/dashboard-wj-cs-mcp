import { pool } from '../db.js';
import 'dotenv/config';

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:8000';
const API_TOKEN    = process.env.APP_API_TOKEN ?? '';

function appHeaders() {
  const h = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
  if (API_TOKEN) h['Authorization'] = `Bearer ${API_TOKEN}`;
  return h;
}

export async function paymentList({ keyword = '', student_id = '', limit = 10, page = 1 }) {
  limit = Math.min(Math.max(1, Number(limit)), 100);
  page  = Math.max(1, Number(page));
  const offset = (page - 1) * limit;

  const conditions = ['1=1'];
  const params = [];

  if (student_id) {
    conditions.push('xi.student_id = ?');
    params.push(student_id);
  }
  if (keyword) {
    conditions.push('(s.student_fullname LIKE ? OR s.student_whatsapp LIKE ? OR xi.external_id LIKE ? OR xi.payer_email LIKE ?)');
    const like = `%${keyword}%`;
    params.push(like, like, like, like);
  }

  const where = conditions.join(' AND ');
  const baseJoin = `FROM xendit_invoice xi JOIN students s ON xi.student_id = s.student_id WHERE ${where}`;

  const conn = await pool.getConnection();
  try {
    const [[{ total }]] = await conn.execute(`SELECT COUNT(*) AS total ${baseJoin}`, params);
    const [rows] = await conn.execute(
      `SELECT xi.id, xi.external_id, xi.invoice_url, xi.status,
              xi.amount, xi.payer_email, xi.paid_at, xi.created_at,
              s.student_fullname, s.student_whatsapp
       ${baseJoin} ORDER BY xi.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows, total, page, limit, total_pages: Math.ceil(total / limit) || 1 };
  } finally {
    conn.release();
  }
}

export async function paymentRecreateInvoice({ installment_id }) {
  try {
    const { default: fetch } = await import('node-fetch');
    const body = new URLSearchParams({ installment_id });
    const res = await fetch(`${APP_BASE_URL}/batch/recreateInvoice`, {
      method: 'POST', body, headers: appHeaders(), redirect: 'manual',
    });
    if (res.status === 200 || res.status === 302) {
      return { success: true, message: 'Invoice berhasil di-regenerate dan dikirim via WA.' };
    }
    const text = await res.text();
    return { success: false, message: `App merespons HTTP ${res.status}: ${text.slice(0, 200)}` };
  } catch (err) {
    return { success: false, message: `Koneksi ke app gagal: ${err.message}` };
  }
}

export async function paymentExpireInvoice({ invoice_id }) {
  try {
    const { default: fetch } = await import('node-fetch');
    const body = new URLSearchParams({ invoice_id });
    const res = await fetch(`${APP_BASE_URL}/batch/expire`, {
      method: 'POST', body, headers: appHeaders(), redirect: 'manual',
    });
    if (res.status === 200 || res.status === 302) {
      return { success: true, message: `Invoice ${invoice_id} berhasil di-expire.` };
    }
    const text = await res.text();
    return { success: false, message: `App merespons HTTP ${res.status}: ${text.slice(0, 200)}` };
  } catch (err) {
    return { success: false, message: `Koneksi ke app gagal: ${err.message}` };
  }
}
