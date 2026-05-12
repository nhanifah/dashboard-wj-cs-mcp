"""Tools: batch_list, batch_get_by_id, package_lookup."""
from db import fetchall, fetchone


def batch_list(keyword: str = "", class_name: str = "") -> list[dict]:
    """
    Daftar batch registrasi beserta jumlah siswa terdaftar.

    Args:
        keyword: Filter substring pada batch_desc atau batch_name (opsional).
        class_name: Filter substring pada batch_desc, e.g. 'N5' (opsional).

    Returns:
        List batch dengan kolom: id, batch_name, batch_desc, batch_date,
        batch_price, batch_quota, batch_status, jumlah_siswa.
    """
    conditions = ["1=1"]
    params: list = []

    if keyword:
        conditions.append("(br.batch_desc LIKE %s OR br.batch_name LIKE %s)")
        params += [f"%{keyword}%", f"%{keyword}%"]

    if class_name:
        conditions.append("br.batch_desc LIKE %s")
        params.append(f"%{class_name}%")

    where = " AND ".join(conditions)
    sql = f"""
        SELECT br.id, br.batch_name, br.batch_desc, br.batch_date,
               br.batch_price, br.batch_quota, br.batch_status,
               pl.package_desc, pl.package_installment_period,
               COUNT(DISTINCT s.student_id) AS jumlah_siswa
        FROM batch_registrations br
        JOIN package_list pl ON br.package_id = pl.package_id
        LEFT JOIN installment i ON br.id = i.batch_registration_id
        LEFT JOIN students s    ON i.student_id = s.student_id
        WHERE {where}
        GROUP BY br.id, br.batch_name, br.batch_desc, br.batch_date,
                 br.batch_price, br.batch_quota, br.batch_status,
                 pl.package_desc, pl.package_installment_period
        ORDER BY br.batch_date DESC
    """
    return fetchall(sql, tuple(params))


def batch_get_by_id(batch_id: int) -> dict | None:
    """
    Ambil detail satu batch berdasarkan ID.

    Args:
        batch_id: Primary key batch_registrations.id

    Returns:
        Dict detail batch, atau None jika tidak ditemukan.
    """
    sql = """
        SELECT id, batch_name, batch_quota, batch_price, batch_date,
               batch_discount, batch_desc, batch_status
        FROM batch_registrations
        WHERE id = %s
        LIMIT 1
    """
    return fetchone(sql, (batch_id,))


def package_lookup(class_name: str = "", package_id: str = "") -> dict | None:
    """
    Cari paket kursus berdasarkan class name atau package_id.

    Args:
        class_name: Substring nama kelas, e.g. 'N5', 'Kaiwa' (opsional).
        package_id: UUID package_list.package_id (opsional, prioritas utama).

    Returns:
        Dict detail package, atau None jika tidak ditemukan.
    """
    if package_id:
        return fetchone(
            "SELECT * FROM package_list WHERE package_id = %s LIMIT 1",
            (package_id,),
        )

    if not class_name:
        return {"error": "Berikan class_name atau package_id"}

    cls_upper = class_name.strip().upper()
    like = f"%{class_name}%"

    if "KAIWA" in cls_upper:
        sql = """
            SELECT * FROM package_list
            WHERE (package_desc LIKE %s OR package_name LIKE %s)
            LIMIT 1
        """
        return fetchone(sql, (like, like))

    # Exclude Kaiwa rows when searching non-Kaiwa class
    sql = """
        SELECT * FROM package_list
        WHERE (package_desc LIKE %s OR package_name LIKE %s)
          AND package_desc NOT LIKE '%Kaiwa%'
          AND package_name NOT LIKE '%Kaiwa%'
        LIMIT 1
    """
    return fetchone(sql, (like, like))
