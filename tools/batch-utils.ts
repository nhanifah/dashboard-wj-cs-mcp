export type ClassName = "N5" | "N4" | "N3" | "JFT" | "KAIWA";

export interface BatchListRow {
  id: number;
  batch_name: string;
  batch_desc: string;
  batch_date: string | Date;
  batch_price: number | string;
  batch_quota: number;
  batch_status: number | string;
  package_desc: string;
  package_installment_period: number | null;
  jumlah_siswa: number | string;
}

export interface BatchSummary {
  batch_name: string;
  batch_desc: string;
  batch_date: string;
  batch_price: number;
  jumlah_siswa: number;
  package_desc: string;
}

export type BatchListCaller = (args: {
  class_name?: string;
  keyword?: string;
}) => Promise<BatchListRow[]>;

export type BatchUtilErrorCode = "INVALID_CLASS" | "MCP_FAILED" | "NO_BATCHES";

export class BatchUtilError extends Error {
  constructor(message: string, public readonly code: BatchUtilErrorCode) {
    super(message);
    this.name = "BatchUtilError";
  }
}

const VALID_CLASS_NAMES: ReadonlyArray<ClassName> = ["N5", "N4", "N3", "JFT", "KAIWA"];

function assertClassName(value: string): asserts value is ClassName {
  if (!VALID_CLASS_NAMES.includes(value as ClassName)) {
    throw new BatchUtilError(
      `className tidak valid: "${value}". Harus salah satu dari ${VALID_CLASS_NAMES.join(", ")}`,
      "INVALID_CLASS",
    );
  }
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatMonthYear(date: Date): string {
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function formatIDR(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

async function safeCall(
  callBatchList: BatchListCaller,
  args: { class_name?: string; keyword?: string },
): Promise<BatchListRow[]> {
  let rows: unknown;
  try {
    rows = await callBatchList(args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new BatchUtilError(`Gagal memanggil MCP wj-cs:batch_list — ${msg}`, "MCP_FAILED");
  }
  if (!Array.isArray(rows)) {
    throw new BatchUtilError("Response MCP batch_list bukan array", "MCP_FAILED");
  }
  return rows as BatchListRow[];
}

export async function getCurrentMonthBatches(
  className: ClassName,
  callBatchList: BatchListCaller,
  now: Date = new Date(),
): Promise<BatchSummary[]> {
  assertClassName(className);

  const rows = await safeCall(callBatchList, { class_name: className });

  const filtered = rows
    .filter((row) => {
      const d = toDate(row.batch_date);
      return !Number.isNaN(d.getTime()) && sameMonth(d, now);
    })
    .sort((a, b) => toDate(a.batch_date).getTime() - toDate(b.batch_date).getTime());

  if (filtered.length === 0) {
    throw new BatchUtilError(
      `Tidak ada batch ${className} di bulan ${formatMonthYear(now)}`,
      "NO_BATCHES",
    );
  }

  return filtered.map((row) => ({
    batch_name: row.batch_name,
    batch_desc: row.batch_desc,
    batch_date: toDate(row.batch_date).toISOString().slice(0, 10),
    batch_price: Number(row.batch_price),
    jumlah_siswa: Number(row.jumlah_siswa),
    package_desc: row.package_desc,
  }));
}

export async function getAvailableMonths(callBatchList: BatchListCaller): Promise<string[]> {
  const rows = await safeCall(callBatchList, {});

  const seen = new Map<string, Date>();
  for (const row of rows) {
    const d = toDate(row.batch_date);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!seen.has(key)) {
      seen.set(key, new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.getTime() - a.getTime())
    .map(formatMonthYear);
}

export function formatBatchTable(batches: BatchSummary[]): string {
  if (batches.length === 0) return "(tidak ada batches)";

  const headers = ["Batch Name", "Jadwal", "Tanggal", "Harga", "Siswa Terdaftar"];
  const rows = batches.map((b) => [
    b.batch_name,
    b.batch_desc,
    b.batch_date,
    formatIDR(b.batch_price),
    String(b.jumlah_siswa),
  ]);

  const widths: number[] = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
  );

  const pad = (s: string, len: number): string =>
    s.length >= len ? s : s + " ".repeat(len - s.length);

  const line = (cells: string[]): string =>
    "| " + cells.map((c, i) => pad(c, widths[i] ?? c.length)).join(" | ") + " |";

  const sep = "+-" + widths.map((w) => "-".repeat(w)).join("-+-") + "-+";

  return [sep, line(headers), sep, ...rows.map(line), sep].join("\n");
}

// Wire to the local MCP server's batchList; for external MCP-client usage,
// pass your own BatchListCaller that invokes the wj-cs MCP tool.
//
// import { batchList } from "./batch.js";
// import { getCurrentMonthBatches, formatBatchTable } from "./batch-utils.js";
//
// const batches = await getCurrentMonthBatches("N5", (args) => batchList(args));
// console.log(formatBatchTable(batches));
