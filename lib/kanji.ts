import fs from "fs";
import path from "path";
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
    .select("id,no,kanji,meaning_quoted,level", {
      count: "exact",
    })
    .order("level", { ascending: false })
    .order("no", { ascending: true })
    .range(from, to);

  if (!isAll) query = query.eq("level", levelLower);
  const q = (searchQuery ?? "").trim();
  if (q) query = query.ilike("meaning_quoted", `%${q}%`);

  const { data, error, count } = await query;
  if (error || !data || count === null) throw error ?? new Error("kanji_items query failed");

  const kanjiIds = data
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id));
  const memorizedByKanjiId = new Map<number, boolean>();
  if (kanjiIds.length > 0) {
    const { data: progRows, error: progErr } = await supabase
      .from("user_kanji_progress")
      .select("kanji_id,memorized")
      .in("kanji_id", kanjiIds);

    if (progErr) throw progErr;
    for (const p of progRows ?? []) {
      const kid = Number(p.kanji_id);
      if (Number.isFinite(kid))
        memorizedByKanjiId.set(kid, !!p.memorized);
    }
  }

  const total = count;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.max(1, Math.min(safePage, totalPages));

  return {
    rows: data.map((r) => {
      const id = Number(r.id);
      const memorized =
        Number.isFinite(id) && memorizedByKanjiId.get(id)
          ? "yes"
          : "no";
      return {
        no: String(r.no ?? ""),
        kanji: String(r.kanji ?? ""),
        meaning_quoted: String(r.meaning_quoted ?? ""),
        memorized,
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

type KanjiDbRow = {
  no: number | string | null;
  level: string | null;
  kanji: string | null;
  meaning_quoted: string | null;
  meaning: string | null;
  onyomi: string | null;
  kunyomi: string | null;
  shape_explanation: string | null;
  onyomi_detail: string | null;
  kunyomi_detail: string | null;
  user_kanji_progress?: Array<{ memorized: boolean | null }> | null;
};

function mapKanjiDetail(row: KanjiDbRow, prevNo: string | null, nextNo: string | null): KanjiDetail {
  const no = String(row.no ?? "");
  const progress = Array.isArray(row.user_kanji_progress)
    ? row.user_kanji_progress[0]
    : undefined;
  return {
    no,
    level: String(row.level ?? "").toUpperCase(),
    kanji: String(row.kanji ?? ""),
    meaning_quoted: String(row.meaning_quoted ?? ""),
    meaning: String(row.meaning ?? ""),
    onyomi: String(row.onyomi ?? ""),
    kunyomi: String(row.kunyomi ?? ""),
    shape_explanation: String(row.shape_explanation ?? ""),
    onyomi_detail: String(row.onyomi_detail ?? ""),
    kunyomi_detail: String(row.kunyomi_detail ?? ""),
    memorized: progress?.memorized ? "yes" : "no",
    imageUrl: findImageForNo(no),
    prevNo,
    nextNo,
  };
}

export async function getKanjiDetail(no: string, level?: string): Promise<KanjiDetail | null> {
  const noNum = Number(String(no ?? "").trim());
  if (!Number.isFinite(noNum) || noNum <= 0) return null;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("kanji_items")
    .select(
      "no,level,kanji,meaning_quoted,meaning,onyomi,kunyomi,shape_explanation,onyomi_detail,kunyomi_detail,user_kanji_progress(memorized)"
    )
    .eq("no", noNum);

  const levelLower = String(level ?? "").toLowerCase();
  if (levelLower && levelLower !== "all") query = query.eq("level", levelLower);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: prev } = await supabase
    .from("kanji_items")
    .select("no")
    .eq("level", data.level)
    .eq("no", noNum - 1)
    .maybeSingle();
  const { data: next } = await supabase
    .from("kanji_items")
    .select("no")
    .eq("level", data.level)
    .eq("no", noNum + 1)
    .maybeSingle();

  return mapKanjiDetail(
    data as KanjiDbRow,
    prev?.no ? String(prev.no) : null,
    next?.no ? String(next.no) : null
  );
}

export async function getKanjiDetailByWord(word: string): Promise<KanjiDetail | null> {
  const w = String(word ?? "").trim();
  if (!w) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("kanji_items")
    .select(
      "no,level,kanji,meaning_quoted,meaning,onyomi,kunyomi,shape_explanation,onyomi_detail,kunyomi_detail,user_kanji_progress(memorized)"
    )
    .eq("kanji", w)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapKanjiDetail(data as KanjiDbRow, null, null);
}

export type JlptKanjiCardInfo = {
  level: string;
  meaningQuoted: string;
  listNo: string;
};

export async function getJlptKanjiCardInfoMap(): Promise<Map<string, JlptKanjiCardInfo>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("kanji_items")
    .select("level,no,kanji,meaning_quoted")
    .order("level", { ascending: false })
    .order("no", { ascending: true });

  if (error || !data) throw error ?? new Error("kanji_items query failed");

  const map = new Map<string, JlptKanjiCardInfo>();
  for (const r of data) {
    const k = String(r.kanji ?? "").trim();
    if (!k || k.length !== 1 || map.has(k)) continue;
    map.set(k, {
      level: String(r.level ?? "").toUpperCase(),
      meaningQuoted: String(r.meaning_quoted ?? "").trim(),
      listNo: String(r.no ?? "").trim(),
    });
  }
  return map;
}

const KANJI_CHAR_FOR_WORD_RE = /^[\u4e00-\u9fff\u3400-\u4dbf]$/;

export type JlptWordKanjiLine = {
  char: string;
  found: boolean;
  meaningShort: string;
  level: string | null;
  detailHref: string | null;
};

/** 이미 로드한 `JlptKanjiCardInfo` 맵으로 한 줄 처리(페이지 단위로 맵 한 번만 조회할 때 사용) */
export function getJlptKanjiLinesForWordFromMap(
  word: string,
  map: Map<string, JlptKanjiCardInfo>
): JlptWordKanjiLine[] {
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

export async function getJlptKanjiLinesForWord(word: string): Promise<JlptWordKanjiLine[]> {
  const map = await getJlptKanjiCardInfoMap();
  return getJlptKanjiLinesForWordFromMap(word, map);
}

export type KanjiReadingsBundle = {
  onyomi: string;
  kunyomi: string;
  shape_explanation: string;
};

const KANJI_READINGS_IN_CHUNK = 200;

/** 카드 목록 등에 필요한 `kanji` 문자열만 배치 조회(URL·열 길이 제한 회피로 청크) */
export async function getKanjiReadingsMapForWords(
  words: Iterable<string>
): Promise<Map<string, KanjiReadingsBundle>> {
  const uniq = Array.from(
    new Set(
      Array.from(words, (w) => String(w ?? "").trim()).filter(Boolean)
    )
  );
  if (uniq.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const map = new Map<string, KanjiReadingsBundle>();

  for (let i = 0; i < uniq.length; i += KANJI_READINGS_IN_CHUNK) {
    const chunk = uniq.slice(i, i + KANJI_READINGS_IN_CHUNK);
    const { data, error } = await supabase
      .from("kanji_items")
      .select("kanji,onyomi,kunyomi,shape_explanation")
      .in("kanji", chunk);

    if (error || !data) throw error ?? new Error("kanji_items query failed");

    for (const r of data) {
      const k = String(r.kanji ?? "").trim();
      if (!k) continue;
      map.set(k, {
        onyomi: String(r.onyomi ?? ""),
        kunyomi: String(r.kunyomi ?? ""),
        shape_explanation: String(r.shape_explanation ?? ""),
      });
    }
  }

  return map;
}

/** 전 테이블 음훈·형태설명 로드 — 목록 카드에서는 `getKanjiReadingsMapForWords` 권장 */
export async function getKanjiReadingsMap(): Promise<Map<string, KanjiReadingsBundle>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("kanji_items")
    .select("kanji,onyomi,kunyomi,shape_explanation");

  if (error || !data) throw error ?? new Error("kanji_items query failed");

  const map = new Map<string, KanjiReadingsBundle>();
  for (const r of data) {
    const k = String(r.kanji ?? "").trim();
    if (!k) continue;
    map.set(k, {
      onyomi: String(r.onyomi ?? ""),
      kunyomi: String(r.kunyomi ?? ""),
      shape_explanation: String(r.shape_explanation ?? ""),
    });
  }
  return map;
}
