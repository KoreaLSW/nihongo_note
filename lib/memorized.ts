import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const CSV_PATH = path.join(process.cwd(), "public", "memorized.csv");
const HEADERS = ["word", "memorized", "memorized_at", "reviewed_at"] as const;

export type MemorizedRow = {
  word: string;
  memorized: string;
  memorized_at: string;
  reviewed_at: string;
};

function getKstNow(): string {
  return new Date().toLocaleString("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function loadRecords(): Array<Record<string, string>> {
  if (!fs.existsSync(CSV_PATH)) return [];
  let raw = fs.readFileSync(CSV_PATH, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;
}

function saveRecords(records: Array<Record<string, string>>): void {
  const full = records.map((r) => ({
    word: r.word ?? "",
    memorized: r.memorized ?? "no",
    memorized_at: r.memorized_at ?? "",
    reviewed_at: r.reviewed_at ?? "",
  }));
  const csv = stringify(full, { header: true, columns: [...HEADERS] });
  fs.writeFileSync(CSV_PATH, csv, "utf-8");
}

/** word -> { memorized, memorized_at, reviewed_at } */
export function getMemorizedMap(): Map<
  string,
  { memorized: string; memorized_at: string; reviewed_at: string }
> {
  const records = loadRecords();
  const map = new Map<
    string,
    { memorized: string; memorized_at: string; reviewed_at: string }
  >();
  for (const r of records) {
    const w = (r.word ?? "").trim();
    if (!w) continue;
    map.set(w, {
      memorized: r.memorized ?? "no",
      memorized_at: r.memorized_at ?? "",
      reviewed_at: r.reviewed_at ?? "",
    });
  }
  return map;
}

export function setMemorized(word: string, memorized: boolean): void {
  const w = (word ?? "").trim();
  if (!w) throw new Error("word is required");

  const records = loadRecords();
  const idx = records.findIndex((r) => (r.word ?? "").trim() === w);
  const now = getKstNow();

  if (idx >= 0) {
    records[idx].memorized = memorized ? "yes" : "no";
    records[idx].memorized_at = memorized ? now : "";
    if (!memorized) records[idx].reviewed_at = "";
  } else {
    records.push({
      word: w,
      memorized: memorized ? "yes" : "no",
      memorized_at: memorized ? now : "",
      reviewed_at: "",
    });
  }
  saveRecords(records);
}

export function setReviewed(word: string): void {
  const w = (word ?? "").trim();
  if (!w) throw new Error("word is required");

  const records = loadRecords();
  const idx = records.findIndex((r) => (r.word ?? "").trim() === w);
  const now = getKstNow();

  if (idx >= 0) {
    records[idx].reviewed_at = now;
  } else {
    records.push({
      word: w,
      memorized: "no",
      memorized_at: "",
      reviewed_at: now,
    });
  }
  saveRecords(records);
}

export function removeMemorized(word: string): void {
  const w = (word ?? "").trim();
  if (!w) return;
  const records = loadRecords();
  const filtered = records.filter((r) => (r.word ?? "").trim() !== w);
  if (filtered.length < records.length) saveRecords(filtered);
}
