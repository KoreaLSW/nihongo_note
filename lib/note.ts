import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { getMemorizedMap, removeMemorized } from "./memorized";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PER_PAGE = 10;

export type NoteRow = {
  no: string;
  word: string;
  reading: string;
  meaning: string;
  level: string;
  memorized: string;
  memorized_at: string;
  reviewed_at: string;
  created_at: string;
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

export type NoteListResult = {
  rows: NoteRow[];
  total: number;
  totalPages: number;
  page: number;
};

function getCsvPath(): string {
  return path.join(process.cwd(), "public", "note.csv");
}

/** 단어장에 등록된 날짜 목록 (YYYY-MM-DD, 최신순) */
export function getNoteDates(): string[] {
  const records = loadNoteRecords();
  const set = new Set<string>();
  for (const r of records) {
    const at = (r.created_at ?? "").trim();
    if (at.length >= 10) set.add(at.slice(0, 10));
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

function getNotesFromCsv(
  page: number = 1,
  level?: string,
  searchQuery?: string,
  memorized?: string,
  date?: string
): NoteListResult {
  const csvPath = getCsvPath();
  if (!fs.existsSync(csvPath)) {
    return { rows: [], total: 0, totalPages: 1, page: 1 };
  }

  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  let filtered = records;
  const levelUpper = (level ?? "").toUpperCase();
  if (levelUpper && levelUpper !== "ALL") {
    filtered = filtered.filter(
      (r) => (r.level ?? "").toUpperCase() === levelUpper
    );
  }

  const q = (searchQuery ?? "").trim();
  if (q) {
    const qLower = q.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.word ?? "").toLowerCase().includes(qLower) ||
        (r.reading ?? "").toLowerCase().includes(qLower) ||
        (r.meaning ?? "").toLowerCase().includes(qLower)
    );
  }

  const dateTrim = (date ?? "").trim();
  if (dateTrim.length >= 10) {
    const datePrefix = dateTrim.slice(0, 10);
    filtered = filtered.filter(
      (r) => (r.created_at ?? "").slice(0, 10) === datePrefix
    );
  }

  const memoMap = getMemorizedMap();
  const withMemo: Array<Record<string, string>> = filtered.map((r) => {
    const word = (r.word ?? "").trim();
    const memo = memoMap.get(word);
    return {
      ...r,
      memorized: memo?.memorized ?? "no",
      memorized_at: memo?.memorized_at ?? "",
      reviewed_at: memo?.reviewed_at ?? "",
    };
  });

  const memFilter = (memorized ?? "").toLowerCase();
  const afterMem =
    memFilter === "yes" || memFilter === "no"
      ? withMemo.filter((r) => r.memorized === memFilter)
      : withMemo;

  const total = afterMem.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * PER_PAGE;
  const slice = afterMem.slice(start, start + PER_PAGE);

  const rows: NoteRow[] = slice.map((r) => ({
    no: r.no ?? "",
    word: r.word ?? "",
    reading: r.reading ?? "",
    meaning: r.meaning ?? "",
    level: r.level ?? "",
    created_at: r.created_at ?? "",
    memorized: r.memorized ?? "no",
    memorized_at: r.memorized_at ?? "",
    reviewed_at: r.reviewed_at ?? "",
  }));

  return {
    rows,
    total,
    totalPages,
    page: safePage,
  };
}

export async function getNotes(
  page: number = 1,
  level?: string,
  searchQuery?: string,
  memorized?: string,
  date?: string
): Promise<NoteListResult> {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("vocabulary_notes")
    .select(
      "id,no,word,reading,meaning,level,memorized,memorized_at,reviewed_at,created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  const levelUpper = (level ?? "").toUpperCase();
  if (levelUpper && levelUpper !== "ALL") query = query.eq("level", levelUpper);
  if (memorized && memorized !== "all") query = query.eq("memorized", memorized === "yes");
  if (date) {
    query = query.gte("created_at", `${date}T00:00:00`).lt("created_at", `${date}T23:59:59.999`);
  }
  const q = (searchQuery ?? "").trim();
  if (q) {
    query = query.or(`word.ilike.%${q}%,reading.ilike.%${q}%,meaning.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error || !data || count === null) {
    return getNotesFromCsv(page, level, searchQuery, memorized, date);
  }

  const total = count;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  return {
    rows: data.map(mapVocabularyNoteRow),
    total,
    totalPages,
    page: Math.max(1, Math.min(safePage, totalPages)),
  };
}

export type NoteInsert = {
  word: string;
  reading?: string;
  meaning: string;
  level: string;
};

function loadNoteRecords(): Array<Record<string, string>> {
  const csvPath = getCsvPath();
  if (!fs.existsSync(csvPath)) return [];
  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const parsed = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;
  return parsed;
}

function saveNoteRecords(records: Array<Record<string, string>>): void {
  const csvPath = getCsvPath();
  const fullRecords = records.map(ensureRecordHasAllColumns);
  const headers = [
    "no",
    "word",
    "reading",
    "meaning",
    "level",
    "created_at",
  ];
  const csv = stringify(fullRecords, { header: true, columns: headers });
  fs.writeFileSync(csvPath, csv, "utf-8");
}

/** 레벨별 단어장 전체 목록 (퀴즈용, 페이지네이션 없음) */
function getNotesByLevelFromCsv(level?: string): NoteRow[] {
  const csvPath = getCsvPath();
  if (!fs.existsSync(csvPath)) return [];

  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  let filtered = records;
  const levelUpper = (level ?? "").toUpperCase();
  if (levelUpper && levelUpper !== "ALL") {
    filtered = filtered.filter(
      (r) => (r.level ?? "").toUpperCase() === levelUpper
    );
  }

  const memoMap = getMemorizedMap();
  return filtered.map((r) => {
    const word = (r.word ?? "").trim();
    const memo = memoMap.get(word);
    return {
      no: r.no ?? "",
      word: r.word ?? "",
      reading: r.reading ?? "",
      meaning: r.meaning ?? "",
      level: r.level ?? "",
      created_at: r.created_at ?? "",
      memorized: memo?.memorized ?? "no",
      memorized_at: memo?.memorized_at ?? "",
      reviewed_at: memo?.reviewed_at ?? "",
    };
  });
}

export async function getNotesByLevel(level?: string): Promise<NoteRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("vocabulary_notes")
    .select("id,no,word,reading,meaning,level,memorized,memorized_at,reviewed_at,created_at")
    .order("created_at", { ascending: false });
  const levelUpper = (level ?? "").toUpperCase();
  if (levelUpper && levelUpper !== "ALL") query = query.eq("level", levelUpper);

  const { data, error } = await query;
  if (error || !data) return getNotesByLevelFromCsv(level);
  return data.map(mapVocabularyNoteRow);
}

/** 단어장에 있는 word 목록 (중복 체크용) */
export async function getNoteWords(): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("vocabulary_notes").select("word");
  if (!error && data) {
    return new Set(data.map((r) => String(r.word ?? "").trim()).filter(Boolean));
  }
  const records = loadNoteRecords();
  const words = new Set<string>();
  for (const r of records) {
    const w = (r.word ?? "").trim();
    if (w) words.add(w);
  }
  return words;
}

/** no로 단어 한 건 조회 (상세용) */
function getNoteByNoFromCsv(no: string): NoteRow | null {
  const records = loadNoteRecords();
  const noTrim = String(no ?? "").trim();
  const r = records.find((x) => String(x.no ?? "").trim() === noTrim);
  if (!r) return null;
  const memoMap = getMemorizedMap();
  const word = (r.word ?? "").trim();
  const memo = memoMap.get(word);
  return {
    no: r.no ?? "",
    word: r.word ?? "",
    reading: r.reading ?? "",
    meaning: r.meaning ?? "",
    level: r.level ?? "",
    created_at: r.created_at ?? "",
    memorized: memo?.memorized ?? "no",
    memorized_at: memo?.memorized_at ?? "",
    reviewed_at: memo?.reviewed_at ?? "",
  };
}

export async function getNoteByNo(no: string): Promise<NoteRow | null> {
  const noTrim = String(no ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vocabulary_notes")
    .select("id,no,word,reading,meaning,level,memorized,memorized_at,reviewed_at,created_at")
    .eq("no", parseInt(noTrim, 10) || -1)
    .maybeSingle();

  if (error || !data) return getNoteByNoFromCsv(no);
  return mapVocabularyNoteRow(data);
}

function mapVocabularyNoteRow(r: {
  no: number | string | null;
  word: string | null;
  reading: string | null;
  meaning: string | null;
  level: string | null;
  memorized: boolean | null;
  memorized_at: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}): NoteRow {
  return {
    no: String(r.no ?? ""),
    word: String(r.word ?? ""),
    reading: String(r.reading ?? ""),
    meaning: String(r.meaning ?? ""),
    level: String(r.level ?? ""),
    created_at: String(r.created_at ?? ""),
    memorized: r.memorized ? "yes" : "no",
    memorized_at: String(r.memorized_at ?? ""),
    reviewed_at: String(r.reviewed_at ?? ""),
  };
}

export function appendNote(record: NoteInsert): NoteRow {
  const word = (record.word ?? "").trim();
  if (!word) throw new Error("word is required");

  const records = loadNoteRecords();
  const exists = records.some((r) => (r.word ?? "").trim() === word);
  if (exists) throw new Error("duplicate: word already exists");

  const maxNo = records.reduce((max, r) => {
    const n = parseInt(String(r.no ?? "0"), 10) || 0;
    return n > max ? n : max;
  }, 0);
  const nextNo = String(maxNo + 1);

  const newRow: Record<string, string> = {
    no: nextNo,
    word,
    reading: (record.reading ?? "").trim(),
    meaning: (record.meaning ?? "").trim(),
    level: (record.level ?? "").trim() || "N5",
    created_at: getKstNow(),
  };
  records.push(newRow);
  saveNoteRecords(records);

  return {
    no: newRow.no,
    word: newRow.word,
    reading: newRow.reading,
    meaning: newRow.meaning,
    level: newRow.level,
    created_at: newRow.created_at,
    memorized: "no",
    memorized_at: "",
    reviewed_at: "",
  };
}

export function removeNote(word: string): void {
  const w = (word ?? "").trim();
  if (!w) throw new Error("word is required");

  const records = loadNoteRecords();
  const filtered = records.filter((r) => (r.word ?? "").trim() !== w);
  if (filtered.length === records.length) throw new Error("word not found");
  saveNoteRecords(filtered);
  removeMemorized(w);
}

function ensureRecordHasAllColumns(r: Record<string, string>): Record<string, string> {
  const headers = ["no", "word", "reading", "meaning", "level", "created_at"];
  const out: Record<string, string> = {};
  for (const h of headers) {
    out[h] = r[h] ?? "";
  }
  return out;
}
