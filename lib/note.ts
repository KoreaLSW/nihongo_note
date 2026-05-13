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
  /** `vocabulary_words` 퀴즈·토글 시 서버가 행을 찾기 위해 사용 */
  wordbookId?: string;
};

export type NoteListResult = {
  rows: NoteRow[];
  total: number;
  totalPages: number;
  page: number;
};

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
  if (error || !data || count === null) throw error ?? new Error("vocabulary_notes count failed");

  const total = count;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  return {
    rows: data.map(mapVocabularyNoteRow),
    total,
    totalPages,
    page: Math.max(1, Math.min(safePage, totalPages)),
  };
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
  if (error || !data) throw error ?? new Error("vocabulary_notes query failed");
  return data.map(mapVocabularyNoteRow);
}

/** 단어장에 있는 word 목록 (중복 체크용) */
export async function getNoteWords(): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("vocabulary_notes").select("word");
  if (!error && data) {
    return new Set(data.map((r) => String(r.word ?? "").trim()).filter(Boolean));
  }
  throw error ?? new Error("vocabulary_notes query failed");
}

export async function getNoteByNo(no: string): Promise<NoteRow | null> {
  const noTrim = String(no ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vocabulary_notes")
    .select("id,no,word,reading,meaning,level,memorized,memorized_at,reviewed_at,created_at")
    .eq("no", parseInt(noTrim, 10) || -1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
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
