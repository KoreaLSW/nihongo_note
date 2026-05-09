import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const WORDBOOKS_DIR = "vocabulary_words";
const MANIFEST_FILE = "wordbooks.json";

export type WordbookMeta = {
  id: string;
  name: string;
  file: string;
};

export type WordbookRow = {
  no: string;
  word: string;
  reading: string;
  meaning: string;
  level: string;
  created_at: string;
};

function getDir(): string {
  return path.join(process.cwd(), "public", WORDBOOKS_DIR);
}

function getManifestPath(): string {
  return path.join(getDir(), MANIFEST_FILE);
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

function ensureDir(): void {
  const dir = getDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadManifest(): WordbookMeta[] {
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

function saveManifest(list: WordbookMeta[]): void {
  ensureDir();
  fs.writeFileSync(
    getManifestPath(),
    JSON.stringify(list, null, 2),
    "utf-8"
  );
}

/** 단어장 목록 */
export function getWordbookList(): WordbookMeta[] {
  return loadManifest();
}

/** 단어장 목록 순서 변경 (manifest 배열 순서 업데이트) */
export function reorderWordbooks(wordbookIds: string[]): void {
  if (!Array.isArray(wordbookIds)) throw new Error("wordbookIds must be an array");

  const list = loadManifest();
  const byId = new Map(list.map((m) => [m.id, m] as const));

  const ordered: WordbookMeta[] = [];
  const used = new Set<string>();

  for (const rawId of wordbookIds) {
    const id = String(rawId ?? "").trim();
    const meta = byId.get(id);
    if (meta && !used.has(id)) {
      ordered.push(meta);
      used.add(id);
    }
  }

  // ids에 없는 항목은 기존 순서를 유지한 채 뒤에 붙임
  for (const m of list) {
    if (!used.has(m.id)) ordered.push(m);
  }

  saveManifest(ordered);
}

/** 단어장 생성 (새 CSV 파일 + manifest 추가) */
export function createWordbook(name: string): WordbookMeta {
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new Error("name is required");

  const list = loadManifest();
  const id =
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
  const file = `${id}.csv`;
  const meta: WordbookMeta = { id, name: trimmed, file };
  list.push(meta);
  saveManifest(list);

  const csvPath = path.join(getDir(), file);
  const headers = ["no", "word", "reading", "meaning", "level", "created_at"];
  const csv = stringify([], { header: true, columns: headers });
  fs.writeFileSync(csvPath, csv, "utf-8");

  return meta;
}

function getCsvPath(wordbookId: string): string | null {
  const list = loadManifest();
  const meta = list.find((m) => m.id === wordbookId);
  if (!meta) return null;
  return path.join(getDir(), meta.file);
}

/** 단어장 내 단어 목록 */
export function getWordbookWords(wordbookId: string): WordbookRow[] {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath)) return [];

  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  return records.map((r) => ({
    no: r.no ?? "",
    word: r.word ?? "",
    reading: r.reading ?? "",
    meaning: r.meaning ?? "",
    level: r.level ?? "",
    created_at: r.created_at ?? "",
  }));
}

/** 단어장에 단어 추가 */
export function appendWordToWordbook(
  wordbookId: string,
  entry: { word: string; reading?: string; meaning: string; level: string }
): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath) throw new Error("wordbook not found");

  const word = (entry.word ?? "").trim();
  if (!word) throw new Error("word is required");

  let records: Array<Record<string, string>> = [];
  if (fs.existsSync(csvPath)) {
    let raw = fs.readFileSync(csvPath, "utf-8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Array<Record<string, string>>;
  }

  const exists = records.some((r) => (r.word ?? "").trim() === word);
  if (exists) throw new Error("duplicate: word already in this wordbook");

  const maxNo = records.reduce((max, r) => {
    const n = parseInt(String(r.no ?? "0"), 10) || 0;
    return n > max ? n : max;
  }, 0);
  const nextNo = String(maxNo + 1);

  records.push({
    no: nextNo,
    word,
    reading: (entry.reading ?? "").trim(),
    meaning: (entry.meaning ?? "").trim(),
    level: (entry.level ?? "").trim() || "N5",
    created_at: getKstNow(),
  });

  const headers = ["no", "word", "reading", "meaning", "level", "created_at"];
  const csv = stringify(records, { header: true, columns: headers });
  fs.writeFileSync(csvPath, csv, "utf-8");
}

/** 단어장에서 단어 삭제 */
export function removeWordFromWordbook(wordbookId: string, word: string): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath)) throw new Error("wordbook not found");

  const w = (word ?? "").trim();
  if (!w) throw new Error("word is required");

  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  const filtered = records.filter((r) => (r.word ?? "").trim() !== w);
  if (filtered.length === records.length) throw new Error("word not found");

  const headers = ["no", "word", "reading", "meaning", "level", "created_at"];
  const renumbered = filtered.map((r, i) => ({ ...r, no: String(i + 1) }));
  const csv = stringify(renumbered, { header: true, columns: headers });
  fs.writeFileSync(csvPath, csv, "utf-8");
}

/** 단어장 단어 순서 변경 (wordOrder: 새 순서의 word 배열) */
export function reorderWordbookWords(
  wordbookId: string,
  wordOrder: string[]
): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath)) throw new Error("wordbook not found");

  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  const byWord = new Map<string, Record<string, string>>();
  for (const r of records) {
    const w = (r.word ?? "").trim();
    if (w) byWord.set(w, { ...r });
  }

  const ordered: Array<Record<string, string>> = [];
  for (let i = 0; i < wordOrder.length; i++) {
    const w = (wordOrder[i] ?? "").trim();
    const row = byWord.get(w);
    if (row) {
      ordered.push({ ...row, no: String(i + 1) });
    }
  }
  const headers = ["no", "word", "reading", "meaning", "level", "created_at"];
  const csv = stringify(ordered, { header: true, columns: headers });
  fs.writeFileSync(csvPath, csv, "utf-8");
}

/** 단어장 id로 메타 조회 */
export function getWordbookMeta(wordbookId: string): WordbookMeta | null {
  const list = loadManifest();
  return list.find((m) => m.id === wordbookId) ?? null;
}

/** 단어장 이름 변경 (manifest만 업데이트) */
export function renameWordbook(wordbookId: string, newName: string): void {
  const id = String(wordbookId ?? "").trim();
  const name = String(newName ?? "").trim();
  if (!id) throw new Error("wordbookId is required");
  if (!name) throw new Error("name is required");

  const list = loadManifest();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error("wordbook not found");

  const prev = list[idx];
  list[idx] = { ...prev, name };
  saveManifest(list);
}

/** 단어장 내 no에 해당하는 단어 한 건 */
export function getWordbookWordByNo(
  wordbookId: string,
  no: string
): WordbookRow | null {
  const words = getWordbookWords(wordbookId);
  const noTrim = String(no ?? "").trim();
  const row = words.find((r) => String(r.no).trim() === noTrim);
  return row ?? null;
}
