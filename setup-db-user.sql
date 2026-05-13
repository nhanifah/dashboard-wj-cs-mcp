-- ============================================================
-- Setup MySQL user khusus untuk MCP CS Agent
-- Jalankan sebagai root atau user dengan privilege CREATE USER + GRANT OPTION
-- ============================================================

-- 1. Buat user
--    Ganti password sesuai kebutuhan.
--    Untuk production: ganti '%' dengan IP server tempat MCP di-deploy
--    Contoh production: 'wj_cs_mcp'@'103.x.x.x'
CREATE USER IF NOT EXISTS 'wj_cs_mcp'@'%'
  IDENTIFIED BY 'WjCSm@2026_secure';

-- 2. Grant SELECT hanya pada 5 tabel yang dibutuhkan MCP
--    Tidak ada INSERT, UPDATE, DELETE, DROP sama sekali
GRANT SELECT ON sql_wj_register.batch_registrations TO 'wj_cs_mcp'@'%';
GRANT SELECT ON sql_wj_register.package_list        TO 'wj_cs_mcp'@'%';
GRANT SELECT ON sql_wj_register.installment         TO 'wj_cs_mcp'@'%';
GRANT SELECT ON sql_wj_register.students            TO 'wj_cs_mcp'@'%';
GRANT SELECT ON sql_wj_register.xendit_invoice      TO 'wj_cs_mcp'@'%';

-- 3. Flush
FLUSH PRIVILEGES;

-- ============================================================
-- Verifikasi — jalankan setelah setup untuk memastikan
-- ============================================================
-- SHOW GRANTS FOR 'wj_cs_mcp'@'%';

-- ============================================================
-- Kalau mau restrict ke IP tertentu (lebih aman):
-- ============================================================
-- DROP USER IF EXISTS 'wj_cs_mcp'@'%';
-- CREATE USER 'wj_cs_mcp'@'182.253.54.145' IDENTIFIED BY 'WjCSm@2026_secure';
-- GRANT SELECT ON sql_wj_register.batch_registrations TO 'wj_cs_mcp'@'182.253.54.145';
-- GRANT SELECT ON sql_wj_register.package_list        TO 'wj_cs_mcp'@'182.253.54.145';
-- GRANT SELECT ON sql_wj_register.installment         TO 'wj_cs_mcp'@'182.253.54.145';
-- GRANT SELECT ON sql_wj_register.students            TO 'wj_cs_mcp'@'182.253.54.145';
-- GRANT SELECT ON sql_wj_register.xendit_invoice      TO 'wj_cs_mcp'@'182.253.54.145';
-- FLUSH PRIVILEGES;
