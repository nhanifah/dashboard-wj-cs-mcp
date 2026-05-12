"""Tool: student_search — cari siswa by nama atau nomor WA."""
from db import get_conn


def student_search(keyword: str, limit: int = 10, page: int = 1) -> dict:
    """
    Cari siswa berdasarkan nama lengkap atau nomor WhatsApp.

    Args:
        keyword: Teks pencarian (nama atau nomor WA).
        limit: Jumlah hasil per halaman (default 10, max 50).
        page: Nomor halaman (default 1).

    Returns:
        dict dengan keys: data (list siswa + kelas), total, page, limit, total_pages.
    """
    limit = min(max(1, limit), 50)
    page = max(1, page)
    offset = (page - 1) * limit
    like = f"%{keyword}%"

    count_sql = """
        SELECT COUNT(DISTINCT s.student_id) AS total
        FROM students s
        WHERE s.student_fullname LIKE %s OR s.student_whatsapp LIKE %s
    """
    data_sql = """
        SELECT s.student_id, s.student_fullname, s.student_whatsapp,
               s.student_email, s.student_address_province,
               GROUP_CONCAT(DISTINCT br.batch_desc ORDER BY br.batch_date DESC) AS kelas_terdaftar
        FROM students s
        LEFT JOIN installment i         ON s.student_id = i.student_id
        LEFT JOIN batch_registrations br ON i.batch_registration_id = br.id
        WHERE s.student_fullname LIKE %s OR s.student_whatsapp LIKE %s
        GROUP BY s.student_id, s.student_fullname, s.student_whatsapp,
                 s.student_email, s.student_address_province
        ORDER BY s.student_fullname ASC
        LIMIT %s OFFSET %s
    """

    conn = get_conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(count_sql, (like, like))
        total = cur.fetchone()["total"]

        cur.execute(data_sql, (like, like, limit, offset))
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
