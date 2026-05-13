import {
  BatchUtilError,
  formatBatchTable,
  getAvailableMonths,
  getCurrentMonthBatches,
  type BatchListCaller,
  type BatchListRow,
} from "./batch-utils.js";

const fixture: BatchListRow[] = [
  {
    id: 1,
    batch_name: "N5-MAY-A",
    batch_desc: "Kelas N5 Sabtu 09:00",
    batch_date: "2026-05-20",
    batch_price: 1500000,
    batch_quota: 20,
    batch_status: 1,
    package_desc: "Paket N5 Reguler",
    package_installment_period: 3,
    jumlah_siswa: 7,
  },
  {
    id: 2,
    batch_name: "N5-MAY-B",
    batch_desc: "Kelas N5 Minggu 13:00",
    batch_date: "2026-05-05",
    batch_price: 1500000,
    batch_quota: 20,
    batch_status: 1,
    package_desc: "Paket N5 Reguler",
    package_installment_period: 3,
    jumlah_siswa: 12,
  },
  {
    id: 3,
    batch_name: "N5-APR",
    batch_desc: "Kelas N5 April",
    batch_date: "2026-04-10",
    batch_price: 1500000,
    batch_quota: 20,
    batch_status: 1,
    package_desc: "Paket N5 Reguler",
    package_installment_period: 3,
    jumlah_siswa: 15,
  },
  {
    id: 4,
    batch_name: "N5-MAR",
    batch_desc: "Kelas N5 Maret",
    batch_date: "2026-03-15",
    batch_price: 1400000,
    batch_quota: 20,
    batch_status: 1,
    package_desc: "Paket N5 Reguler",
    package_installment_period: 3,
    jumlah_siswa: 18,
  },
];

const mockCaller: BatchListCaller = async () => fixture;

const now = new Date("2026-05-13T00:00:00");

console.log("--- getCurrentMonthBatches('N5') ---");
const may = await getCurrentMonthBatches("N5", mockCaller, now);
console.log(formatBatchTable(may));

console.log("\n--- getAvailableMonths() ---");
console.log(await getAvailableMonths(mockCaller));

console.log("\n--- invalid className ---");
try {
  await getCurrentMonthBatches("N1" as never, mockCaller, now);
} catch (err) {
  if (err instanceof BatchUtilError) console.log(`${err.code}: ${err.message}`);
}

console.log("\n--- no batches in target month ---");
try {
  await getCurrentMonthBatches("N5", mockCaller, new Date("2026-07-01"));
} catch (err) {
  if (err instanceof BatchUtilError) console.log(`${err.code}: ${err.message}`);
}

console.log("\n--- MCP call fails ---");
try {
  await getCurrentMonthBatches("N5", async () => {
    throw new Error("ECONNREFUSED");
  }, now);
} catch (err) {
  if (err instanceof BatchUtilError) console.log(`${err.code}: ${err.message}`);
}
