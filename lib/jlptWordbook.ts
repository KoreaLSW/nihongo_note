import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type { JlptQuizMemorizedView, JlptWordbookRow } from "./jlptWordbookShared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  JLPT_WORDBOOK_CSV_COLUMNS,
  recomputeJlptAggregateFields,
} from "./jlptWordbookShared";

export type { JlptWordbookRow, JlptQuizMemorizedView } from "./jlptWordbookShared";
export {
  JLPT_WORDBOOK_CSV_COLUMNS,
  recomputeJlptAggregateFields,
  getJlptMemorizedForQuizView,
  getJlptMemorizedAtForQuizView,
} from "./jlptWordbookShared";

const JLPT_WORDBOOKS_DIR = "jlpt_wordbooks";
const MANIFEST_FILE = "jlpt_wordbooks.json";

export const JLPT_LEVELS = ["n1", "n2", "n3", "n4", "n5"] as const;
export type JlptLevel = (typeof JLPT_LEVELS)[number];

export type JlptWordbookMeta = {
  id: string;
  level: JlptLevel;
  name: string;
  file: string;
  user_id?: string;
};

export type JlptCsvImportFail = {
  row: number;
  reason: string;
};

export type JlptCsvImportResult = {
  total: number;
  inserted: number;
  failed: number;
  fails: JlptCsvImportFail[];
};

function yn(v: unknown): "yes" | "no" {
  return String(v ?? "no").trim().toLowerCase() === "yes" ? "yes" : "no";
}

function rowHasPerViewColumns(r: Record<string, string>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(r, "memorized_word") ||
    Object.prototype.hasOwnProperty.call(r, "memorized_meaning") ||
    Object.prototype.hasOwnProperty.call(r, "memorized_hiragana")
  );
}

function parseJlptWordbookRow(r: Record<string, string>, index: number): JlptWordbookRow {
  const legacyMem = yn(r.memorized);
  const legacyAt = String(r.memorized_at ?? "").trim();
  const useLegacy = !rowHasPerViewColumns(r);

  let memorized_word: "yes" | "no";
  let memorized_meaning: "yes" | "no";
  let memorized_hiragana: "yes" | "no";
  let memorized_word_at: string;
  let memorized_meaning_at: string;
  let memorized_hiragana_at: string;

  if (useLegacy) {
    memorized_word = legacyMem;
    memorized_meaning = legacyMem;
    memorized_hiragana = legacyMem;
    const at = legacyMem === "yes" ? legacyAt : "";
    memorized_word_at = at;
    memorized_meaning_at = at;
    memorized_hiragana_at = at;
  } else {
    memorized_word = yn(r.memorized_word);
    memorized_meaning = yn(r.memorized_meaning);
    memorized_hiragana = yn(r.memorized_hiragana);
    memorized_word_at = String(r.memorized_word_at ?? "").trim();
    memorized_meaning_at = String(r.memorized_meaning_at ?? "").trim();
    memorized_hiragana_at = String(r.memorized_hiragana_at ?? "").trim();
  }

  const row: JlptWordbookRow = {
    no: String(r.no ?? index + 1),
    word: String(r.word ?? r.japanese ?? "").trim(),
    meaning: String(r.meaning ?? r.뜻 ?? "").trim(),
    hiragana: String(r.hiragana ?? r.reading ?? r.히라가나 ?? "").trim(),
    memorized_word,
    memorized_word_at,
    memorized_meaning,
    memorized_meaning_at,
    memorized_hiragana,
    memorized_hiragana_at,
    memorized: "no",
    memorized_at: "",
    created_at: String(r.created_at ?? "").trim(),
  };
  recomputeJlptAggregateFields(row);
  return row;
}

function getDir(): string {
  return path.join(process.cwd(), "public", JLPT_WORDBOOKS_DIR);
}

function getManifestPath(): string {
  return path.join(getDir(), MANIFEST_FILE);
}

function ensureDir(): void {
  const dir = getDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadManifest(): JlptWordbookMeta[] {
  ensureDir();
  const p = getManifestPath();
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf-8");
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveManifest(list: JlptWordbookMeta[]): void {
  ensureDir();
  fs.writeFileSync(getManifestPath(), JSON.stringify(list, null, 2), "utf-8");
}

export function normalizeJlptLevel(level: string): JlptLevel {
  const normalized = String(level ?? "").trim().toLowerCase();
  if (JLPT_LEVELS.includes(normalized as JlptLevel)) {
    return normalized as JlptLevel;
  }
  return "n5";
}

function getJlptWordbookListFromCsv(level?: string): JlptWordbookMeta[] {
  const list = loadManifest();
  if (!level) return list;
  const lv = normalizeJlptLevel(level);
  return list.filter((w) => w.level === lv);
}

export async function getJlptWordbookList(level?: string): Promise<JlptWordbookMeta[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("jlpt_wordbooks")
    .select("id,level,name")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (level) query = query.eq("level", normalizeJlptLevel(level));

  const { data, error } = await query;
  if (error || !data) return getJlptWordbookListFromCsv(level);
  return data.map((r) => ({
    id: String(r.id ?? ""),
    level: normalizeJlptLevel(String(r.level ?? "")),
    name: String(r.name ?? ""),
    file: "",
  }));
}

/** JLPT 단어장 목록 순서 변경 (레벨별, manifest 배열 순서 업데이트) */
export function reorderJlptWordbooks(level: string, wordbookIds: string[]): void {
  if (!Array.isArray(wordbookIds)) throw new Error("wordbookIds must be an array");
  const lv = normalizeJlptLevel(level);

  const list = loadManifest();
  const levelList = list.filter((m) => m.level === lv);
  const byId = new Map(levelList.map((m) => [m.id, m] as const));

  const ordered: JlptWordbookMeta[] = [];
  const used = new Set<string>();

  for (const rawId of wordbookIds) {
    const id = String(rawId ?? "").trim();
    const meta = byId.get(id);
    if (meta && !used.has(id)) {
      ordered.push(meta);
      used.add(id);
    }
  }

  for (const m of levelList) {
    if (!used.has(m.id)) ordered.push(m);
  }

  let idx = 0;
  const next = list.map((m) => {
    if (m.level !== lv) return m;
    const repl = ordered[idx];
    idx += 1;
    return repl ?? m;
  });

  saveManifest(next);
}

export function createJlptWordbook(
  level: string,
  name: string,
  userId?: string
): JlptWordbookMeta {
  const lv = normalizeJlptLevel(level);
  const trimmed = String(name ?? "").trim();
  if (!trimmed) throw new Error("name is required");

  const list = loadManifest();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const file = `${id}.csv`;
  const meta: JlptWordbookMeta = { id, level: lv, name: trimmed, file };
  if (userId) meta.user_id = userId;
  list.push(meta);
  saveManifest(list);

  const csvPath = path.join(getDir(), file);
  const csv = stringify([], { header: true, columns: [...JLPT_WORDBOOK_CSV_COLUMNS] });
  fs.writeFileSync(csvPath, csv, "utf-8");

  return meta;
}

export function deleteJlptWordbook(wordbookId: string): void {
  const id = String(wordbookId ?? "").trim();
  if (!id) throw new Error("wordbookId is required");

  const list = loadManifest();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error("wordbook not found");

  const target = list[idx];
  const csvPath = path.join(getDir(), target.file);
  if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);

  const next = list.filter((m) => m.id !== id);
  saveManifest(next);
}

export function renameJlptWordbook(wordbookId: string, newName: string): void {
  const id = String(wordbookId ?? "").trim();
  const name = String(newName ?? "").trim();
  if (!id) throw new Error("wordbookId is required");
  if (!name) throw new Error("name is required");

  const list = loadManifest();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error("wordbook not found");

  list[idx] = { ...list[idx], name };
  saveManifest(list);
}

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

function getCsvPath(wordbookId: string): string | null {
  const list = loadManifest();
  const meta = list.find((m) => m.id === wordbookId);
  if (!meta) return null;
  return path.join(getDir(), meta.file);
}

function writeJlptWordbookCsv(csvPath: string, rows: JlptWordbookRow[]): void {
  const csv = stringify(rows, { header: true, columns: [...JLPT_WORDBOOK_CSV_COLUMNS] });
  fs.writeFileSync(csvPath, csv, "utf-8");
}

function getJlptWordbookMetaFromCsv(wordbookId: string): JlptWordbookMeta | null {
  const list = loadManifest();
  return list.find((m) => m.id === wordbookId) ?? null;
}

export async function getJlptWordbookMeta(wordbookId: string): Promise<JlptWordbookMeta | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jlpt_wordbooks")
    .select("id,level,name")
    .eq("id", wordbookId)
    .maybeSingle();
  if (error || !data) return getJlptWordbookMetaFromCsv(wordbookId);
  return {
    id: String(data.id ?? ""),
    level: normalizeJlptLevel(String(data.level ?? "")),
    name: String(data.name ?? ""),
    file: "",
  };
}

function getJlptWordbookWordsFromCsv(wordbookId: string): JlptWordbookRow[] {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath)) return [];

  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  return records.map((r, i) => parseJlptWordbookRow(r, i));
}

export async function getJlptWordbookWords(wordbookId: string): Promise<JlptWordbookRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jlpt_words")
    .select(
      "id,sort_order,word,meaning,hiragana,memorized_word,memorized_word_at,memorized_meaning,memorized_meaning_at,memorized_hiragana,memorized_hiragana_at,memorized,memorized_at,created_at"
    )
    .eq("wordbook_id", wordbookId)
    .order("sort_order", { ascending: true });

  if (error || !data) return getJlptWordbookWordsFromCsv(wordbookId);
  return data.map((r) => ({
    no: String(r.sort_order ?? ""),
    word: String(r.word ?? ""),
    meaning: String(r.meaning ?? ""),
    hiragana: String(r.hiragana ?? ""),
    memorized_word: r.memorized_word ? "yes" : "no",
    memorized_word_at: String(r.memorized_word_at ?? ""),
    memorized_meaning: r.memorized_meaning ? "yes" : "no",
    memorized_meaning_at: String(r.memorized_meaning_at ?? ""),
    memorized_hiragana: r.memorized_hiragana ? "yes" : "no",
    memorized_hiragana_at: String(r.memorized_hiragana_at ?? ""),
    memorized: r.memorized ? "yes" : "no",
    memorized_at: String(r.memorized_at ?? ""),
    created_at: String(r.created_at ?? ""),
  }));
}

export function appendWordToJlptWordbook(
  wordbookId: string,
  entry: { word: string; meaning?: string; hiragana?: string }
): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath) throw new Error("wordbook not found");

  const word = String(entry.word ?? "").trim();
  const meaning = String(entry.meaning ?? "").trim();
  const hiragana = String(entry.hiragana ?? "").trim();
  if (!word) throw new Error("word is required");

  const rows = getJlptWordbookWordsFromCsv(wordbookId);
  const duplicated = rows.some((r) => r.word === word);
  if (duplicated) throw new Error("duplicate: word already in this jlpt wordbook");

  const maxNo = rows.reduce((max, r) => {
    const n = parseInt(String(r.no ?? "0"), 10) || 0;
    return n > max ? n : max;
  }, 0);

  const newRow: JlptWordbookRow = {
    no: String(maxNo + 1),
    word,
    meaning,
    hiragana,
    memorized_word: "no",
    memorized_word_at: "",
    memorized_meaning: "no",
    memorized_meaning_at: "",
    memorized_hiragana: "no",
    memorized_hiragana_at: "",
    memorized: "no",
    memorized_at: "",
    created_at: getKstNow(),
  };
  recomputeJlptAggregateFields(newRow);

  const nextRows = [...rows, newRow];
  writeJlptWordbookCsv(csvPath, nextRows);
}

export function importJlptWordsFromCsv(wordbookId: string, csvText: string): JlptCsvImportResult {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath)) throw new Error("wordbook not found");

  const normalized = String(csvText ?? "");
  if (!normalized.trim()) {
    return { total: 0, inserted: 0, failed: 0, fails: [] };
  }

  const parsed = parse(normalized, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Array<Record<string, string>>;

  const currentRows = getJlptWordbookWordsFromCsv(wordbookId);
  const existingWords = new Set(currentRows.map((r) => r.word));
  const newWordSet = new Set<string>();

  const toInsert: Array<{ word: string; meaning: string; hiragana: string }> = [];
  const fails: JlptCsvImportFail[] = [];

  parsed.forEach((raw, idx) => {
    const rowNumber = idx + 2;
    const word = String(raw.word ?? raw.단어 ?? "").trim();
    const meaning = String(raw.meaning ?? raw.뜻 ?? "").trim();
    const hiragana = String(raw.hiragana ?? raw.히라가나 ?? "").trim();

    if (!word) {
      fails.push({ row: rowNumber, reason: "단어 값이 비어 있습니다." });
      return;
    }
    if (!meaning) {
      fails.push({ row: rowNumber, reason: "뜻 값이 비어 있습니다." });
      return;
    }
    if (existingWords.has(word)) {
      fails.push({
        row: rowNumber,
        reason: `이미 단어장에 있는 단어입니다. (단어: ${word})`,
      });
      return;
    }
    if (newWordSet.has(word)) {
      fails.push({
        row: rowNumber,
        reason: `업로드 파일 안에서 중복된 단어입니다. (단어: ${word})`,
      });
      return;
    }

    newWordSet.add(word);
    toInsert.push({ word, meaning, hiragana });
  });

  if (toInsert.length > 0) {
    const maxNo = currentRows.reduce((max, r) => {
      const n = parseInt(String(r.no ?? "0"), 10) || 0;
      return n > max ? n : max;
    }, 0);

    const insertedRows: JlptWordbookRow[] = toInsert.map((r, i) => {
      const row: JlptWordbookRow = {
        no: String(maxNo + i + 1),
        word: r.word,
        meaning: r.meaning,
        hiragana: r.hiragana,
        memorized_word: "no",
        memorized_word_at: "",
        memorized_meaning: "no",
        memorized_meaning_at: "",
        memorized_hiragana: "no",
        memorized_hiragana_at: "",
        memorized: "no",
        memorized_at: "",
        created_at: getKstNow(),
      };
      recomputeJlptAggregateFields(row);
      return row;
    });

    const nextRows = [...currentRows, ...insertedRows];
    writeJlptWordbookCsv(csvPath, nextRows);
  }

  return {
    total: parsed.length,
    inserted: toInsert.length,
    failed: fails.length,
    fails,
  };
}

export function setJlptWordMemorizedByQuizView(
  wordbookId: string,
  no: string,
  view: JlptQuizMemorizedView,
  value: boolean
): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath)) throw new Error("wordbook not found");

  const noTrim = String(no ?? "").trim();
  if (!noTrim) throw new Error("no is required");

  const rows = getJlptWordbookWordsFromCsv(wordbookId);
  const idx = rows.findIndex((r) => String(r.no).trim() === noTrim);
  if (idx < 0) throw new Error("word not found");

  const now = getKstNow();
  const row = { ...rows[idx] };

  if (view === "word") {
    row.memorized_word = value ? "yes" : "no";
    row.memorized_word_at = value ? now : "";
  } else if (view === "meaning") {
    row.memorized_meaning = value ? "yes" : "no";
    row.memorized_meaning_at = value ? now : "";
  } else {
    row.memorized_hiragana = value ? "yes" : "no";
    row.memorized_hiragana_at = value ? now : "";
  }

  recomputeJlptAggregateFields(row);
  rows[idx] = row;
  writeJlptWordbookCsv(csvPath, rows);
}

export function updateJlptWordbookWord(
  wordbookId: string,
  no: string,
  record: { word: string; meaning: string; hiragana?: string }
): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath)) throw new Error("wordbook not found");

  const noTrim = String(no ?? "").trim();
  const word = String(record.word ?? "").trim();
  const meaning = String(record.meaning ?? "").trim();
  const hiragana = String(record.hiragana ?? "").trim();
  if (!noTrim) throw new Error("no is required");
  if (!word) throw new Error("word is required");
  if (!meaning) throw new Error("meaning is required");

  const rows = getJlptWordbookWordsFromCsv(wordbookId);
  const idx = rows.findIndex((r) => String(r.no).trim() === noTrim);
  if (idx < 0) throw new Error("word not found");

  const dup = rows.some((r, i) => i !== idx && r.word === word);
  if (dup) throw new Error("duplicate: word already in this jlpt wordbook");

  rows[idx] = {
    ...rows[idx],
    word,
    meaning,
    hiragana,
  };

  writeJlptWordbookCsv(csvPath, rows);
}

export function removeWordFromJlptWordbook(wordbookId: string, no: string): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath)) throw new Error("wordbook not found");

  const noTrim = String(no ?? "").trim();
  if (!noTrim) throw new Error("no is required");

  const rows = getJlptWordbookWordsFromCsv(wordbookId);
  const filtered = rows.filter((r) => String(r.no).trim() !== noTrim);
  if (filtered.length === rows.length) throw new Error("word not found");

  const renumbered = filtered.map((r, i) => ({ ...r, no: String(i + 1) }));
  writeJlptWordbookCsv(csvPath, renumbered);
}

export async function getJlptWordbookWordsCount(wordbookId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("jlpt_words")
    .select("id", { count: "exact", head: true })
    .eq("wordbook_id", wordbookId);
  if (!error && count !== null) return count;

  const list = loadManifest();
  const meta = list.find((m) => m.id === wordbookId);
  if (!meta) return 0;

  const csvPath = path.join(getDir(), meta.file);
  if (!fs.existsSync(csvPath)) return 0;

  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;
  return records.length;
}
