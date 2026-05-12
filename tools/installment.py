"""Tools: installment_get_unpaid_by_phone, installment_get_by_student, installment_list."""
import re
from db import fetchall, get_conn


def _sanitize_phone(phone: str) -> str:
    """Normalize WA number: strip non-digits, convert leading 0 → 62."""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("0"):
        digits = "62" + digits[1:]
    return digits


def installment_get_unpaid_by_phone(phone_number: str) -> list[dict]:
    """
    Ambil semua tagihan (installment) berstatus unpaid milik siswa berdasarkan
    nomor WhatsApp.

    Args:
        phone_number: Nomor WA siswa (format bebas, akan dinormalisasi).

    Returns:
        List tagihan unpaid beserta data siswa.
    """
    phone = _sanitize_phone(phone_number)
    sql = """
        SELECT i.installment_id, i.installment_desc, i.installment_price,
               i.installment_status, i.installment_due_date, i.installment_discount,
               i.batch_registration_id,
               s.student_fullname, s.student_whatsapp, s.student_email
        FROM students s
        JOIN installment i ON s.student_id = i.student_id
        WHERE s.student_whatsapp = %s
          AND i.installment_status = 'unpaid'
        ORDER BY i.installment_due_date ASC
    """
    return fetchall(sql, (phone,))


def installment_get_by_student(student_id: str) -> dict:
    """
    Ambil semua installment milik satu siswa (semua status).

    Args:
        student_id: UUID students.student_id

    Returns:
        dict dengan key 'installment' berisi list tagihan + nama siswa.
    """
    sql = """
        SELECT i.*, s.student_fullname, br.batch_desc, br.batch_date
        FROM installment i
        JOIN students s            ON i.student_id            = s.student_id
        JOIN batch_registrations br ON i.batch_registration_id = br.id
        WHERE i.student_id = %s
        ORDER BY i.installment_due_date ASC, i.installment_desc ASC
    """
    rows = fetchall(sql, (student_id,))
    return {"installment": rows}


def installment_list(keyword: str = "", limit: int = 10, page: int = 1) -> dict:
    """
    Listing tagihan ter-paginate dengan pencarian.

    Args:
        keyword: Cari di nama siswa, nomor WA, batch, status, atau deskripsi.
        limit: Jumlah row per halaman (default 10, max 100).
        page: Nomor halaman (default 1).

    Returns:
        dict dengan keys: data (list), total, page, limit, total_pages.
    """
    limit = min(max(1, limit), 100)
    page = max(1, page)
    offset = (page - 1) * limit

    base_conditions = "1=1"
    params: list = []

    if keyword:
        base_conditions = """
            (i.installment_desc    LIKE %s
             OR i.installment_status LIKE %s
             OR s.student_fullname   LIKE %s
             OR s.student_whatsapp   LIKE %s
             OR br.batch_desc        LIKE %s)
        """
        like = f"%{keyword}%"
        params = [like, like, like, like, like]

    count_sql = f"""
        SELECT COUNT(*) AS total
        FROM installment i
        JOIN students s             ON i.student_id            = s.student_id
        JOIN batch_registrations br ON i.batch_registration_id = br.id
        WHERE {base_conditions}
    """
    data_sql = f"""
        SELECT i.installment_id, i.installment_desc, i.installment_price,
               i.installment_status, i.installment_due_date, i.installment_discount,
               i.installment_period,
               s.student_fullname, s.student_whatsapp,
               br.batch_desc, br.batch_date
        FROM installment i
        JOIN students s             ON i.student_id            = s.student_id
        JOIN batch_registrations br ON i.batch_registration_id = br.id
        WHERE {base_conditions}
        ORDER BY i.created_at DESC
        LIMIT %s OFFSET %s
    """

    conn = get_conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(count_sql, tuple(params))
        total = cur.fetchone()["total"]

        cur.execute(data_sql, tuple(params) + (limit, offset))
        rows = cur.fetchall()
    finally:
        conn.close()

    total_pages = (total + limit - 1) // limit if total else 1
    return {
        "data": rows,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }
