"""Tools: payment_list, payment_recreate_invoice, payment_expire_invoice."""
import os
import httpx
from db import get_conn, fetchall

_APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:8000")
_API_TOKEN = os.getenv("APP_API_TOKEN", "")


def _app_headers() -> dict:
    headers = {"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"}
    if _API_TOKEN:
        headers["Authorization"] = f"Bearer {_API_TOKEN}"
    return headers


def payment_list(
    keyword: str = "",
    student_id: str = "",
    limit: int = 10,
    page: int = 1,
) -> dict:
    """
    Listing invoice Xendit ter-paginate, bisa difilter per siswa atau keyword.

    Args:
        keyword: Cari di nama siswa, nomor WA, external_id, atau email (opsional).
        student_id: UUID students.student_id untuk filter per siswa (opsional).
        limit: Jumlah hasil per halaman (default 10, max 100).
        page: Nomor halaman (default 1).

    Returns:
        dict dengan keys: data (list invoice), total, page, limit, total_pages.
    """
    limit = min(max(1, limit), 100)
    page = max(1, page)
    offset = (page - 1) * limit

    conditions = ["1=1"]
    params: list = []

    if student_id:
        conditions.append("xi.student_id = %s")
        params.append(student_id)

    if keyword:
        conditions.append("""
            (s.student_fullname   LIKE %s
             OR s.student_whatsapp LIKE %s
             OR xi.external_id     LIKE %s
             OR xi.payer_email     LIKE %s)
        """)
        like = f"%{keyword}%"
        params += [like, like, like, like]

    where = " AND ".join(conditions)

    count_sql = f"""
        SELECT COUNT(*) AS total
        FROM xendit_invoice xi
        JOIN students s ON xi.student_id = s.student_id
        WHERE {where}
    """
    data_sql = f"""
        SELECT xi.id, xi.external_id, xi.invoice_url, xi.status,
               xi.amount, xi.payer_email, xi.paid_at, xi.created_at,
               s.student_fullname, s.student_whatsapp
        FROM xendit_invoice xi
        JOIN students s ON xi.student_id = s.student_id
        WHERE {where}
        ORDER BY xi.created_at DESC
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


def payment_recreate_invoice(installment_id: str) -> dict:
    """
    Generate ulang link pembayaran Xendit untuk satu tagihan dan kirim via WA.

    **PERHATIAN:** Operasi ini bersifat write dan akan:
    - Membuat invoice baru di Xendit
    - Menyimpan record di xendit_invoice
    - Mengirim link pembayaran ke nomor WA siswa

    Args:
        installment_id: UUID installment.installment_id

    Returns:
        dict dengan key 'success' (bool) dan 'message'.
    """
    try:
        resp = httpx.post(
            f"{_APP_BASE_URL}/batch/recreateInvoice",
            data={"installment_id": installment_id},
            headers=_app_headers(),
            timeout=30,
            follow_redirects=False,
        )
        if resp.status_code in (200, 302):
            return {"success": True, "message": "Invoice berhasil di-regenerate dan dikirim via WA."}
        return {
            "success": False,
            "message": f"App merespons HTTP {resp.status_code}: {resp.text[:200]}",
        }
    except httpx.RequestError as exc:
        return {"success": False, "message": f"Koneksi ke app gagal: {exc}"}


def payment_expire_invoice(invoice_id: str) -> dict:
    """
    Paksa invoice Xendit menjadi EXPIRED.

    **PERHATIAN:** Operasi ini bersifat write dan tidak dapat dibatalkan.
    Siswa tidak akan bisa membayar menggunakan link tersebut setelahnya.

    Args:
        invoice_id: Xendit invoice ID (xendit_invoice.id)

    Returns:
        dict dengan key 'success' (bool) dan 'message'.
    """
    try:
        resp = httpx.post(
            f"{_APP_BASE_URL}/batch/expire",
            data={"invoice_id": invoice_id},
            headers=_app_headers(),
            timeout=30,
            follow_redirects=False,
        )
        if resp.status_code in (200, 302):
            return {"success": True, "message": f"Invoice {invoice_id} berhasil di-expire."}
        return {
            "success": False,
            "message": f"App merespons HTTP {resp.status_code}: {resp.text[:200]}",
        }
    except httpx.RequestError as exc:
        return {"success": False, "message": f"Koneksi ke app gagal: {exc}"}
