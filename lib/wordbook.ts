import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WordbookMeta = {
  id: string;
  name: string;
  file: string;
  user_id?: string;
};

export type WordbookRow = {
  no: string;
  word: string;
  reading: string;
  meaning: string;
  level: string;
  created_at: string;
  memorized?: string;
  memorized_at?: string;
  reviewed_at?: string;
};

const VOCAB_WORDS_PAGE = 1000;

async function fetchAllUserVocabularyWordRows(
  selectColumns: string
): Promise<Array<Record<string, unknown>>> {
  const supabase = await createSupabaseServerClient();
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += VOCAB_WORDS_PAGE) {
    const { data, error } = await supabase
      .from("vocabulary_words")
      .select(selectColumns)
      .order("id", { ascending: true })
      .range(from, from + VOCAB_WORDS_PAGE - 1);

    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as unknown as Array<Record<string, unknown>>));
    if (data.length < VOCAB_WORDS_PAGE) break;
  }
  return rows;
}

/** RLS 범위 내 모든 `vocabulary_words`를 페이지 단위로 가져와 한자 → 속한 단어장 id 집합 맵 생성 */
export async function getWordToWordbookIdsMap(): Promise<
  Map<string, Set<string>>
> {
  const data = await fetchAllUserVocabularyWordRows("word,wordbook_id");

  const map = new Map<string, Set<string>>();
  for (const row of data) {
    const w = String(row["word"] ?? "").trim();
    const wbId = String(row["wordbook_id"] ?? "").trim();
    if (!w || !wbId) continue;
    const set = map.get(w) ?? new Set<string>();
    set.add(wbId);
    map.set(w, set);
  }
  return map;
}

/** 단어장별 단어 개수 (목록 카드용, 페이지네이션으로 전 행 스캔) */
export async function getVocabularyWordCountsByWordbookId(): Promise<
  Map<string, number>
> {
  const data = await fetchAllUserVocabularyWordRows("wordbook_id");

  const counts = new Map<string, number>();
  for (const row of data) {
    const id = String(row["wordbook_id"] ?? "");
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

type WordbookRowWithItemMemo = {
  no: string;
  word: string;
  reading: string;
  meaning: string;
  level: string;
  created_at: string;
  memorized_item: boolean;
  memorized_item_at: string;
  reviewed_item_at: string;
};

function mapDbRowToWordbookRow(r: {
  sort_order?: number | string | null;
  word?: string | null;
  reading?: string | null;
  meaning?: string | null;
  level?: string | null;
  created_at?: string | null;
  memorized?: boolean | null;
  memorized_at?: string | null;
  reviewed_at?: string | null;
}): WordbookRowWithItemMemo {
  return {
    no: String(r.sort_order ?? ""),
    word: String(r.word ?? ""),
    reading: String(r.reading ?? ""),
    meaning: String(r.meaning ?? ""),
    level: String(r.level ?? ""),
    created_at: String(r.created_at ?? ""),
    memorized_item: r.memorized === true,
    memorized_item_at: r.memorized_at ? String(r.memorized_at) : "",
    reviewed_item_at: r.reviewed_at ? String(r.reviewed_at) : "",
  };
}

/** 단어장 행 시각과 한자 진행 행 시각 중 더 최근 표시값 */
function pickLaterIso(fromItem: string, fromKanji: string): string {
  const i = String(fromItem ?? "").trim();
  const k = String(fromKanji ?? "").trim();
  const ti = Date.parse(i);
  const tk = Date.parse(k);
  if (!Number.isFinite(ti) && !Number.isFinite(tk)) return "";
  if (!Number.isFinite(ti)) return k;
  if (!Number.isFinite(tk)) return i;
  return ti >= tk ? i : k;
}

async function kanjiProgressByTrimmedWords(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  words: string[]
): Promise<
  Map<
    string,
    { memorized: string; memorized_at: string; reviewed_at: string }
  >
> {
  const result = new Map<
    string,
    { memorized: string; memorized_at: string; reviewed_at: string }
  >();
  const uniq = Array.from(
    new Set(words.map((w) => w.trim()).filter(Boolean))
  );
  if (uniq.length === 0) return result;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return result;

  const KANJI_ID_CHUNK = 200;
  const kanjiIdByWord = new Map<string, number>();
  for (let i = 0; i < uniq.length; i += KANJI_ID_CHUNK) {
    const chunk = uniq.slice(i, i + KANJI_ID_CHUNK);
    const { data: kanjiRows, error: kanjiError } = await supabase
      .from("kanji_items")
      .select("id,kanji")
      .in("kanji", chunk);
    if (kanjiError) return result;
    for (const row of kanjiRows ?? []) {
      const k = String(row.kanji ?? "").trim();
      const idNum = Number(row.id);
      if (k && Number.isFinite(idNum)) kanjiIdByWord.set(k, idNum);
    }
  }
  if (kanjiIdByWord.size === 0) return result;

  const ids = Array.from(kanjiIdByWord.values()).filter((id) =>
    Number.isFinite(id)
  );

  const progressByKanjiId = new Map<
    number,
    { memorized: string; memorized_at: string; reviewed_at: string }
  >();
  for (let i = 0; i < ids.length; i += KANJI_ID_CHUNK) {
    const chunk = ids.slice(i, i + KANJI_ID_CHUNK);
    const { data: progressRows, error: progressError } = await supabase
      .from("user_kanji_progress")
      .select("kanji_id,memorized,memorized_at,reviewed_at")
      .eq("user_id", user.id)
      .in("kanji_id", chunk);
    if (progressError || !progressRows) return result;
    for (const row of progressRows) {
      const kid = Number(row.kanji_id);
      if (!Number.isFinite(kid)) continue;
      progressByKanjiId.set(kid, {
        memorized: row.memorized ? "yes" : "no",
        memorized_at: String(row.memorized_at ?? ""),
        reviewed_at: String(row.reviewed_at ?? ""),
      });
    }
  }

  for (const w of uniq) {
    const kanjiId = kanjiIdByWord.get(w);
    const progress = kanjiId ? progressByKanjiId.get(kanjiId) : undefined;
    result.set(w, {
      memorized: progress?.memorized ?? "no",
      memorized_at: progress?.memorized_at ?? "",
      reviewed_at: progress?.reviewed_at ?? "",
    });
  }
  return result;
}

export async function getWordbookList(): Promise<WordbookMeta[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vocabulary_wordbooks")
    .select("id,name")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error || !data) throw error ?? new Error("vocabulary_wordbooks query failed");
  return data.map((r) => ({
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    file: "",
  }));
}

export async function getWordbookWords(wordbookId: string): Promise<WordbookRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vocabulary_words")
    .select(
      "id,sort_order,word,reading,meaning,level,created_at,memorized,memorized_at,reviewed_at"
    )
    .eq("wordbook_id", wordbookId)
    .order("sort_order", { ascending: true });

  if (error || !data) throw error ?? new Error("vocabulary_words query failed");

  const rows = data.map((r) => mapDbRowToWordbookRow(r));
  return attachKanjiProgress(supabase, rows);
}

async function attachKanjiProgress(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: WordbookRowWithItemMemo[]
): Promise<WordbookRow[]> {
  const words = rows.map((row) => row.word.trim()).filter(Boolean);
  if (words.length === 0) {
    return rows.map((row) => ({
      no: row.no,
      word: row.word,
      reading: row.reading,
      meaning: row.meaning,
      level: row.level,
      created_at: row.created_at,
      memorized: row.memorized_item ? "yes" : "no",
      memorized_at: row.memorized_item ? row.memorized_item_at : "",
      reviewed_at: row.reviewed_item_at,
    }));
  }

  const progressMap = await kanjiProgressByTrimmedWords(supabase, words);
  return rows.map((row) => {
    const k = row.word.trim();
    const progress = k ? progressMap.get(k) : undefined;
    const kanjiYes = progress?.memorized === "yes";
    const itemYes = row.memorized_item;
    const yes = itemYes || kanjiYes;
    const kanjiMemoAt = progress?.memorized_at ?? "";
    const kanjiRevAt = progress?.reviewed_at ?? "";
    return {
      no: row.no,
      word: row.word,
      reading: row.reading,
      meaning: row.meaning,
      level: row.level,
      created_at: row.created_at,
      memorized: yes ? "yes" : "no",
      memorized_at: yes ? (itemYes ? row.memorized_item_at : kanjiMemoAt) : "",
      reviewed_at: pickLaterIso(row.reviewed_item_at, kanjiRevAt),
    };
  });
}

export async function getWordbookWordsCount(
  wordbookId: string
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("vocabulary_words")
    .select("id", { count: "exact", head: true })
    .eq("wordbook_id", wordbookId);

  if (error) throw error;
  return count ?? 0;
}

/** 한자단어장 목록: `memorizedMode=all`이면 페이지만 DB에서 가져오고, yes/no면 암기 판별용으로 `sort_order+word` 전행을 한 번 로드한 뒤 해당 페이지 행만 풀 조회합니다. */
export async function getWordbookWordsListPage(opts: {
  wordbookId: string;
  page: number;
  perPage: number;
  memorizedMode: "all" | "yes" | "no";
}): Promise<{
  words: WordbookRow[];
  filteredTotal: number;
  wordbookTotal: number;
  page: number;
}> {
  const { wordbookId, perPage, memorizedMode } = opts;
  const requestedPage = Math.max(1, opts.page || 1);

  const supabase = await createSupabaseServerClient();
  const wordbookTotal = await getWordbookWordsCount(wordbookId);

  if (wordbookTotal === 0) {
    return { words: [], filteredTotal: 0, wordbookTotal: 0, page: 1 };
  }

  if (memorizedMode === "all") {
    const filteredTotal = wordbookTotal;
    const totalPages = Math.max(1, Math.ceil(filteredTotal / perPage));
    const page = Math.min(requestedPage, totalPages);
    const from = (page - 1) * perPage;

    const { data, error } = await supabase
      .from("vocabulary_words")
      .select(
        "id,sort_order,word,reading,meaning,level,created_at,memorized,memorized_at,reviewed_at"
      )
      .eq("wordbook_id", wordbookId)
      .order("sort_order", { ascending: true })
      .range(from, from + perPage - 1);

    if (error || !data)
      throw error ?? new Error("vocabulary_words page query failed");

    const rows = data.map((r) => mapDbRowToWordbookRow(r));
    const words = await attachKanjiProgress(supabase, rows);
    return { words, filteredTotal, wordbookTotal, page };
  }

  const { data: skeletonRaw, error: skErr } = await supabase
    .from("vocabulary_words")
    .select("sort_order,word,memorized,memorized_at,reviewed_at")
    .eq("wordbook_id", wordbookId)
    .order("sort_order", { ascending: true });

  if (skErr || !skeletonRaw)
    throw skErr ?? new Error("vocabulary_words skeleton failed");

  const trimmedList = skeletonRaw.map((row) =>
    String(row.word ?? "").trim()
  );
  const progressMap = await kanjiProgressByTrimmedWords(
    supabase,
    trimmedList
  );

  type Sk = { sortOrder: number; wordTrim: string };
  const filtered: Sk[] = [];
  for (const row of skeletonRaw) {
    const so = Number(row.sort_order);
    if (!Number.isFinite(so)) continue;
    const wordTrim = String(row.word ?? "").trim();
    const itemYes = row.memorized === true;
    const kanjiM =
      (wordTrim ? progressMap.get(wordTrim)?.memorized : undefined) ?? "no";
    const yes = itemYes || kanjiM === "yes";
    if (memorizedMode === "yes") {
      if (!yes) continue;
    } else {
      /* memorizedMode === "no" */
      if (yes) continue;
    }
    filtered.push({ sortOrder: so, wordTrim });
  }

  const filteredTotal = filtered.length;
  if (filteredTotal === 0) {
    return { words: [], filteredTotal: 0, wordbookTotal, page: 1 };
  }

  const totalPages = Math.max(1, Math.ceil(filteredTotal / perPage));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * perPage;
  const slice = filtered.slice(start, start + perPage);
  const sortOrders = slice.map((s) => s.sortOrder);

  const { data: fullRowsRaw, error: fullErr } = await supabase
    .from("vocabulary_words")
    .select(
      "id,sort_order,word,reading,meaning,level,created_at,memorized,memorized_at,reviewed_at"
    )
    .eq("wordbook_id", wordbookId)
    .in("sort_order", sortOrders);

  if (fullErr || !fullRowsRaw)
    throw fullErr ?? new Error("vocabulary_words full row fetch failed");

  const bySort = new Map<number, WordbookRowWithItemMemo>();
  for (const r of fullRowsRaw) {
    const so = Number(r.sort_order);
    if (Number.isFinite(so)) bySort.set(so, mapDbRowToWordbookRow(r));
  }

  const orderedBase: WordbookRowWithItemMemo[] = [];
  for (const s of slice) {
    const row = bySort.get(s.sortOrder);
    if (row) orderedBase.push(row);
  }

  const ordered = await attachKanjiProgress(supabase, orderedBase);

  return { words: ordered, filteredTotal, wordbookTotal, page };
}

/** 같은 단어장 내 이전·다음 `sort_order` (상세 페이지 네비) */
export async function getWordbookPrevNextNos(
  wordbookId: string,
  currentNo: string
): Promise<{ prevNo: string | null; nextNo: string | null }> {
  const cur = Number(String(currentNo ?? "").trim());
  if (!Number.isFinite(cur)) {
    return { prevNo: null, nextNo: null };
  }

  const supabase = await createSupabaseServerClient();
  const [prevResult, nextResult] = await Promise.all([
    supabase
      .from("vocabulary_words")
      .select("sort_order")
      .eq("wordbook_id", wordbookId)
      .lt("sort_order", cur)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("vocabulary_words")
      .select("sort_order")
      .eq("wordbook_id", wordbookId)
      .gt("sort_order", cur)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (prevResult.error) throw prevResult.error;
  if (nextResult.error) throw nextResult.error;

  return {
    prevNo:
      prevResult.data?.sort_order != null
        ? String(prevResult.data.sort_order)
        : null,
    nextNo:
      nextResult.data?.sort_order != null
        ? String(nextResult.data.sort_order)
        : null,
  };
}

export async function getWordbookMeta(
  wordbookId: string
): Promise<WordbookMeta | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vocabulary_wordbooks")
    .select("id,name")
    .eq("id", wordbookId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { id: String(data.id ?? ""), name: String(data.name ?? ""), file: "" };
}

export async function getWordbookWordByNo(
  wordbookId: string,
  no: string
): Promise<WordbookRow | null> {
  const noTrim = String(no ?? "").trim();
  const sortNum = Number(noTrim);
  if (!Number.isFinite(sortNum)) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vocabulary_words")
    .select(
      "id,sort_order,word,reading,meaning,level,created_at,memorized,memorized_at,reviewed_at"
    )
    .eq("wordbook_id", wordbookId)
    .eq("sort_order", sortNum)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = mapDbRowToWordbookRow(data);
  const [withProgress] = await attachKanjiProgress(supabase, [row]);
  return withProgress ?? null;
}
