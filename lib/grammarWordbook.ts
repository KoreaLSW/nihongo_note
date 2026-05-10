import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const GRAMMAR_WORDBOOKS_DIR = "grammar_wordbooks";
const MANIFEST_FILE = "grammar_wordbooks.json";

export type GrammarWordbookMeta = {
  id: string;
  name: string;
  file: string;
  user_id?: string;
};

export type GrammarWordbookRow = {
  no: string;
  grammar: string;
  shape: string;
  meaning: string;
  interpretation: string;
  example: string;
  created_at: string;
};

function getDir(): string {
  return path.join(process.cwd(), "public", GRAMMAR_WORDBOOKS_DIR);
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

function loadManifest(): GrammarWordbookMeta[] {
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

function saveManifest(list: GrammarWordbookMeta[]): void {
  ensureDir();
  fs.writeFileSync(getManifestPath(), JSON.stringify(list, null, 2), "utf-8");
}

/** 문법 단어장 목록 */
function getGrammarWordbookListFromCsv(): GrammarWordbookMeta[] {
  return loadManifest();
}

export async function getGrammarWordbookList(): Promise<GrammarWordbookMeta[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("grammar_wordbooks")
    .select("id,name")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error || !data) return getGrammarWordbookListFromCsv();
  return data.map((r) => ({
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    file: "",
  }));
}

/** 문법 단어장 생성 (새 CSV 파일 + manifest 추가) */
export function createGrammarWordbook(
  name: string,
  userId?: string
): GrammarWordbookMeta {
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new Error("name is required");

  const list = loadManifest();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const file = `${id}.csv`;

  const meta: GrammarWordbookMeta = { id, name: trimmed, file };
  if (userId) meta.user_id = userId;
  list.push(meta);
  saveManifest(list);

  const csvPath = path.join(getDir(), file);
  const headers = [
    "no",
    "grammar",
    "shape",
    "meaning",
    "interpretation",
    "example",
    "created_at",
  ];
  const csv = stringify([], { header: true, columns: headers });
  fs.writeFileSync(csvPath, csv, "utf-8");

  return meta;
}

export function deleteGrammarWordbook(wordbookId: string): void {
  const id = String(wordbookId ?? "").trim();
  if (!id) throw new Error("wordbookId is required");

  const list = loadManifest();
  const target = list.find((m) => m.id === id);
  if (!target) throw new Error("wordbook not found");

  const csvPath = path.join(getDir(), target.file);
  if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);

  saveManifest(list.filter((m) => m.id !== id));
}

/** 문법 단어장 id로 CSV 경로 조회 */
function getCsvPath(wordbookId: string): string | null {
  const list = loadManifest();
  const meta = list.find((m) => m.id === wordbookId);
  if (!meta) return null;
  return path.join(getDir(), meta.file);
}

/** 문법 단어장 이름 변경 (manifest만 업데이트) */
export function renameGrammarWordbook(
  wordbookId: string,
  newName: string
): void {
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

/** 문법 단어장 내 단어 목록 */
function getGrammarWordbookWordsFromCsv(
  wordbookId: string
): GrammarWordbookRow[] {
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
    grammar: r.grammar ?? "",
    shape: r.shape ?? r.형태 ?? "",
    meaning: r.meaning ?? r.뜻 ?? "",
    interpretation: r.interpretation ?? r.해석 ?? r.translation ?? "",
    example: r.example ?? r.예문 ?? "",
    created_at: r.created_at ?? "",
  }));
}

export async function getGrammarWordbookWords(
  wordbookId: string
): Promise<GrammarWordbookRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("grammar_wordbook_items")
    .select("id,sort_order,grammar,shape,meaning,interpretation,example,created_at")
    .eq("wordbook_id", wordbookId)
    .order("sort_order", { ascending: true });

  if (error || !data) return getGrammarWordbookWordsFromCsv(wordbookId);
  return data.map((r) => ({
    no: String(r.sort_order ?? ""),
    grammar: String(r.grammar ?? ""),
    shape: String(r.shape ?? ""),
    meaning: String(r.meaning ?? ""),
    interpretation: String(r.interpretation ?? ""),
    example: String(r.example ?? ""),
    created_at: String(r.created_at ?? ""),
  }));
}

/** 문법 단어장에 문법 추가 */
export function appendGrammarToWordbook(
  wordbookId: string,
  entry: {
    grammar: string;
    shape?: string;
    meaning?: string;
    interpretation?: string;
    example?: string;
  }
): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath) throw new Error("wordbook not found");

  const grammar = (entry.grammar ?? "").trim();
  const shape = (entry.shape ?? "").trim();
  const meaning = (entry.meaning ?? "").trim();
  const interpretation = (entry.interpretation ?? "").trim();
  const example = (entry.example ?? "").trim();

  if (!grammar) throw new Error("grammar is required");

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

  const exists = records.some((r) => (r.grammar ?? "").trim() === grammar);
  if (exists)
    throw new Error("duplicate: grammar already in this grammar wordbook");

  const maxNo = records.reduce((max, r) => {
    const n = parseInt(String(r.no ?? "0"), 10) || 0;
    return n > max ? n : max;
  }, 0);

  const nextNo = String(maxNo + 1);
  records.push({
    no: nextNo,
    grammar,
    shape,
    meaning,
    interpretation,
    example,
    created_at: getKstNow(),
  });

  const headers = [
    "no",
    "grammar",
    "shape",
    "meaning",
    "interpretation",
    "example",
    "created_at",
  ];
  const csv = stringify(records, { header: true, columns: headers });
  fs.writeFileSync(csvPath, csv, "utf-8");
}

/** 문법 단어장 내 문법 삭제 */
export function removeGrammarFromWordbook(
  wordbookId: string,
  grammar: string
): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath)) throw new Error("wordbook not found");

  const g = (grammar ?? "").trim();
  if (!g) throw new Error("grammar is required");

  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  const filtered = records.filter((r) => (r.grammar ?? "").trim() !== g);
  if (filtered.length === records.length) throw new Error("grammar not found");

  const headers = [
    "no",
    "grammar",
    "shape",
    "meaning",
    "interpretation",
    "example",
    "created_at",
  ];
  const renumbered = filtered.map((r, i) => ({ ...r, no: String(i + 1) }));
  const csv = stringify(renumbered, { header: true, columns: headers });
  fs.writeFileSync(csvPath, csv, "utf-8");
}

/** 문법 단어장 항목 순서 변경 (grammarOrder: 새 순서의 grammar 배열) */
export function reorderGrammarWordbookWords(
  wordbookId: string,
  grammarOrder: string[]
): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath))
    throw new Error("wordbook not found");

  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  const byGrammar = new Map<string, Record<string, string>>();
  for (const r of records) {
    const g = (r.grammar ?? "").trim();
    if (g) byGrammar.set(g, { ...r });
  }

  const ordered: Array<Record<string, string>> = [];
  for (let i = 0; i < grammarOrder.length; i++) {
    const g = (grammarOrder[i] ?? "").trim();
    const row = byGrammar.get(g);
    if (row) ordered.push({ ...row, no: String(i + 1) });
  }

  const headers = [
    "no",
    "grammar",
    "shape",
    "meaning",
    "interpretation",
    "example",
    "created_at",
  ];
  const csv = stringify(ordered, { header: true, columns: headers });
  fs.writeFileSync(csvPath, csv, "utf-8");
}

/** 문법 단어장 항목 수정 */
export function updateGrammarWordbookWord(
  wordbookId: string,
  no: string,
  record: {
    grammar: string;
    shape?: string;
    meaning?: string;
    interpretation?: string;
    example?: string;
  }
): void {
  const csvPath = getCsvPath(wordbookId);
  if (!csvPath || !fs.existsSync(csvPath))
    throw new Error("wordbook not found");

  const noTrim = String(no ?? "").trim();
  if (!noTrim) throw new Error("no is required");

  const grammar = String(record.grammar ?? "").trim();
  const shape = String(record.shape ?? "").trim();
  const meaning = String(record.meaning ?? "").trim();
  const interpretation = String(record.interpretation ?? "").trim();
  const example = String(record.example ?? "").trim();

  if (!grammar) throw new Error("grammar is required");

  const raw = fs.readFileSync(csvPath, "utf-8");
  const normalized = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  const records = parse(normalized, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  const idx = records.findIndex((r) => String(r.no ?? "").trim() === noTrim);
  if (idx < 0) throw new Error("word not found");

  const dup = records.some(
    (r, i) => i !== idx && String(r.grammar ?? "").trim() === grammar
  );
  if (dup) throw new Error("duplicate: grammar already in this grammar wordbook");

  // created_at/no는 유지하고 나머지만 갱신
  records[idx] = {
    ...records[idx],
    grammar,
    shape,
    meaning,
    interpretation,
    example,
  };

  const headers = [
    "no",
    "grammar",
    "shape",
    "meaning",
    "interpretation",
    "example",
    "created_at",
  ];
  const csv = stringify(records, { header: true, columns: headers });
  fs.writeFileSync(csvPath, csv, "utf-8");
}

/** 문법 단어장 id로 메타 조회 */
function getGrammarWordbookMetaFromCsv(
  wordbookId: string
): GrammarWordbookMeta | null {
  const list = loadManifest();
  return list.find((m) => m.id === wordbookId) ?? null;
}

export async function getGrammarWordbookMeta(
  wordbookId: string
): Promise<GrammarWordbookMeta | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("grammar_wordbooks")
    .select("id,name")
    .eq("id", wordbookId)
    .maybeSingle();

  if (error || !data) return getGrammarWordbookMetaFromCsv(wordbookId);
  return { id: String(data.id ?? ""), name: String(data.name ?? ""), file: "" };
}

/** 문법 단어장 내 no에 해당하는 문법 1건 */
export async function getGrammarWordbookWordByNo(
  wordbookId: string,
  no: string
): Promise<GrammarWordbookRow | null> {
  const words = await getGrammarWordbookWords(wordbookId);
  const noTrim = String(no ?? "").trim();
  const row = words.find((r) => String(r.no).trim() === noTrim);
  return row ?? null;
}

/** 문법 단어장 목록 순서 변경 (manifest 배열 순서 업데이트) */
export function reorderGrammarWordbooks(wordbookIds: string[]): void {
  if (!Array.isArray(wordbookIds))
    throw new Error("wordbookIds must be an array");

  const list = loadManifest();
  const byId = new Map(list.map((m) => [m.id, m] as const));

  const ordered: GrammarWordbookMeta[] = [];
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

