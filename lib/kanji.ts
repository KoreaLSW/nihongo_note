import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PER_PAGE = 10;

export type KanjiRow = {
  no: string;
  kanji: string;
  meaning_quoted: string;
  memorized: string;
  level: string;
};

export type KanjiListResult = {
  rows: KanjiRow[];
  total: number;
  totalPages: number;
  page: number;
};

function getCsvPath(): string {
  return path.join(process.cwd(), "public", "kanji.csv");
}

/** N1~N5는 public/N1.csv ~ N5.csv, 그 외(ALL 등)는 kanji.csv */
function getCsvPathForLevel(level: string): string {
  const levelUpper = level.toUpperCase();
  if (["N1", "N2", "N3", "N4", "N5"].includes(levelUpper)) {
    return path.join(process.cwd(), "public", `${levelUpper}.csv`);
  }
  return getCsvPath();
}

function getKanjiByLevelFromCsv(
  level: string,
  page: number = 1,
  searchQuery?: string
): KanjiListResult {
  const levelUpper = level.toUpperCase();
  const csvPath = getCsvPathForLevel(level);

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

  let filtered =
    levelUpper === "ALL"
      ? records
      : records; /* N1~N5 CSV는 해당 레벨만 있음, no 이미 1부터 */

  const q = (searchQuery ?? "").trim();
  if (q) {
    const qLower = q.toLowerCase();
    filtered = filtered.filter((r) =>
      (r.meaning_quoted ?? "").toLowerCase().includes(qLower)
    );
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);

  const rows: KanjiRow[] = slice.map((r) => ({
    no: r.no ?? "",
    kanji: r.kanji ?? "",
    meaning_quoted: r.meaning_quoted ?? "",
    memorized: r.memorized ?? "no",
    level: r.level ?? levelUpper,
  }));

  return {
    rows,
    total,
    totalPages,
    page: safePage,
  };
}

export async function getKanjiByLevel(
  level: string,
  page: number = 1,
  searchQuery?: string
): Promise<KanjiListResult> {
  const levelLower = level.toLowerCase();
  const isAll = levelLower === "all";
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("kanji_items")
    .select("id,no,kanji,meaning_quoted,level,user_kanji_progress(memorized)", {
      count: "exact",
    })
    .order("level", { ascending: false })
    .order("no", { ascending: true })
    .range(from, to);

  if (!isAll) query = query.eq("level", levelLower);
  const q = (searchQuery ?? "").trim();
  if (q) query = query.ilike("meaning_quoted", `%${q}%`);

  const { data, error, count } = await query;
  if (error || !data || count === null) {
    return getKanjiByLevelFromCsv(level, page, searchQuery);
  }

  const total = count;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.max(1, Math.min(safePage, totalPages));

  return {
    rows: data.map((r) => {
      const progress = Array.isArray(r.user_kanji_progress)
        ? r.user_kanji_progress[0]
        : undefined;
      return {
        no: String(r.no ?? ""),
        kanji: String(r.kanji ?? ""),
        meaning_quoted: String(r.meaning_quoted ?? ""),
        memorized: progress?.memorized ? "yes" : "no",
        level: String(r.level ?? "").toUpperCase(),
      };
    }),
    total,
    totalPages,
    page: currentPage,
  };
}

export type KanjiDetail = {
  no: string;
  level: string;
  kanji: string;
  meaning_quoted: string;
  meaning: string;
  onyomi: string;
  kunyomi: string;
  shape_explanation: string;
  onyomi_detail: string;
  kunyomi_detail: string;
  memorized: string;
  imageUrl: string | null;
  prevNo: string | null;
  nextNo: string | null;
};

function findImageForNo(no: string): string | null {
  const publicDir = path.join(process.cwd(), "public");
  const candidates = [
    path.join(publicDir, `${no}.png`),
    path.join(publicDir, `${no}.jpg`),
    path.join(publicDir, `${no}.jpeg`),
    path.join(publicDir, `${no}.webp`),
    path.join(publicDir, `${no}.gif`),
    path.join(publicDir, "kanji", `${no}.png`),
    path.join(publicDir, "kanji", `${no}.jpg`),
    path.join(publicDir, "kanji", `${no}.jpeg`),
    path.join(publicDir, "kanji", `${no}.webp`),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const sub = filePath.includes(path.sep + "kanji" + path.sep)
        ? "/kanji/"
        : "/";
      return `${sub}${no}${ext}`;
    }
  }
  return null;
}

/** level이 N1~N5면 해당 레벨 CSV에서 no로 조회(no는 1부터). 없거나 ALL이면 kanji.csv에서 전역 no로 조회 */
export function getKanjiDetail(no: string, level?: string): KanjiDetail | null {
  const csvPath = level ? getCsvPathForLevel(level) : getCsvPath();
  if (!fs.existsSync(csvPath)) return null;

  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  const allNos = new Set(
    records.map((r) => String(r.no ?? "").trim()).filter(Boolean)
  );
  const noTrim = String(no).trim();
  const noNum = Number(noTrim);
  const prevNo =
    allNos.has(String(noNum - 1)) ? String(noNum - 1) : null;
  const nextNo =
    allNos.has(String(noNum + 1)) ? String(noNum + 1) : null;

  const row = records.find((r) => String(r.no).trim() === noTrim);
  if (!row) return null;

  const imageUrl = findImageForNo(String(row.no ?? "").trim());

  return {
    no: row.no ?? "",
    level: row.level ?? "",
    kanji: row.kanji ?? "",
    meaning_quoted: row.meaning_quoted ?? "",
    meaning: row.meaning ?? "",
    onyomi: row.onyomi ?? "",
    kunyomi: row.kunyomi ?? "",
    shape_explanation: row.shape_explanation ?? "",
    onyomi_detail: row.onyomi_detail ?? "",
    kunyomi_detail: row.kunyomi_detail ?? "",
    memorized: row.memorized ?? "no",
    imageUrl,
    prevNo,
    nextNo,
  };
}

/** word(한자)로 kanji.csv에서 상세 조회 (단어장 상세에서 사용) */
export function getKanjiDetailByWord(word: string): KanjiDetail | null {
  const csvPath = getCsvPath();
  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;
  const w = (word ?? "").trim();
  const row = records.find((r) => (r.kanji ?? "").trim() === w);
  if (!row || !row.no) return null;
  return getKanjiDetail(String(row.no).trim());
}

export type JlptKanjiCardInfo = {
  level: string;
  meaningQuoted: string;
  /** 해당 레벨 CSV(`N1.csv` 등) 행의 `no` — 한자 상세 URL에 사용 */
  listNo: string;
};

let jlptKanjiCardInfoCache: Map<string, JlptKanjiCardInfo> | null = null;

/**
 * 단어 카드용: 한 글자 한자 → JLPT 레벨 + meaning_quoted + 레벨 파일 내 번호.
 * `public/N5.csv`→…→`N1.csv` 순으로 읽으며, 동일 글자는 먼저 나온 레벨만 유지.
 */
export function getJlptKanjiCardInfoMap(): Map<string, JlptKanjiCardInfo> {
  if (jlptKanjiCardInfoCache) return jlptKanjiCardInfoCache;
  const map = new Map<string, JlptKanjiCardInfo>();
  const cwd = process.cwd();
  for (const lv of ["N5", "N4", "N3", "N2", "N1"] as const) {
    const csvPath = path.join(cwd, "public", `${lv}.csv`);
    if (!fs.existsSync(csvPath)) continue;
    let raw = fs.readFileSync(csvPath, "utf-8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Array<Record<string, string>>;
    for (const r of records) {
      const k = (r.kanji ?? "").trim();
      if (!k || k.length !== 1) continue;
      if (map.has(k)) continue;
      const listNo = String(r.no ?? "").trim();
      const mq = (r.meaning_quoted ?? "").trim();
      map.set(k, { level: lv, meaningQuoted: mq, listNo });
    }
  }
  jlptKanjiCardInfoCache = map;
  return map;
}

const KANJI_CHAR_FOR_WORD_RE = /^[\u4e00-\u9fff\u3400-\u4dbf]$/;

export type JlptWordKanjiLine = {
  char: string;
  found: boolean;
  meaningShort: string;
  level: string | null;
  /** 표에 있고 `listNo`가 있을 때만 — `/level/n4/kanji/3` 형식 */
  detailHref: string | null;
};

/** 단어에 등장하는 한자(순서 유지·중복 제거)별 JLPT 표시 줄. */
export function getJlptKanjiLinesForWord(word: string): JlptWordKanjiLine[] {
  const map = getJlptKanjiCardInfoMap();
  const seen = new Set<string>();
  const out: JlptWordKanjiLine[] = [];
  for (const ch of word) {
    if (!KANJI_CHAR_FOR_WORD_RE.test(ch)) continue;
    if (seen.has(ch)) continue;
    seen.add(ch);
    const info = map.get(ch);
    if (info) {
      const detailHref =
        info.listNo && info.level
          ? `/level/${info.level.toLowerCase()}/kanji/${info.listNo}`
          : null;
      out.push({
        char: ch,
        found: true,
        meaningShort: info.meaningQuoted,
        level: info.level,
        detailHref,
      });
    } else {
      out.push({
        char: ch,
        found: false,
        meaningShort: "",
        level: null,
        detailHref: null,
      });
    }
  }
  return out;
}

/** kanji → { onyomi, kunyomi, shape_explanation } 맵 (단어장 카드 표시용) */
export function getKanjiReadingsMap(): Map<
  string,
  { onyomi: string; kunyomi: string; shape_explanation: string }
> {
  const csvPath = getCsvPath();
  if (!fs.existsSync(csvPath)) return new Map();
  let raw = fs.readFileSync(csvPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;
  const map = new Map<
    string,
    { onyomi: string; kunyomi: string; shape_explanation: string }
  >();
  for (const r of records) {
    const k = (r.kanji ?? "").trim();
    if (!k) continue;
    map.set(k, {
      onyomi: r.onyomi ?? "",
      kunyomi: r.kunyomi ?? "",
      shape_explanation: r.shape_explanation ?? "",
    });
  }
  return map;
}
