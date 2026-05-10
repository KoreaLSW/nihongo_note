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

export function normalizeJlptLevel(level: string): JlptLevel {
  const normalized = String(level ?? "").trim().toLowerCase();
  if (JLPT_LEVELS.includes(normalized as JlptLevel)) {
    return normalized as JlptLevel;
  }
  return "n5";
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
  if (error || !data) throw error ?? new Error("jlpt_wordbooks query failed");
  return data.map((r) => ({
    id: String(r.id ?? ""),
    level: normalizeJlptLevel(String(r.level ?? "")),
    name: String(r.name ?? ""),
    file: "",
  }));
}

export async function getJlptWordbookMeta(
  wordbookId: string
): Promise<JlptWordbookMeta | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jlpt_wordbooks")
    .select("id,level,name")
    .eq("id", wordbookId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: String(data.id ?? ""),
    level: normalizeJlptLevel(String(data.level ?? "")),
    name: String(data.name ?? ""),
    file: "",
  };
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

  if (error || !data) throw error ?? new Error("jlpt_words query failed");
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

const JLPT_WORDS_BATCH = 1000;

/** 단어장 id별 단어 개수 (목록 화면용, Supabase 페이징으로 한 레벨의 모든 단어장을 최소 요청으로 집계) */
export async function getJlptWordbookWordsCountsByWordbookIds(
  wordbookIds: string[]
): Promise<Map<string, number>> {
  const unique = [
    ...new Set(wordbookIds.map((id) => id.trim()).filter(Boolean)),
  ];
  const counts = new Map<string, number>();
  for (const id of unique) counts.set(id, 0);
  if (unique.length === 0) return counts;

  const supabase = await createSupabaseServerClient();
  for (let from = 0; ; from += JLPT_WORDS_BATCH) {
    const { data, error } = await supabase
      .from("jlpt_words")
      .select("wordbook_id")
      .in("wordbook_id", unique)
      .order("id", { ascending: true })
      .range(from, from + JLPT_WORDS_BATCH - 1);

    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      const wb = String(row.wordbook_id ?? "");
      if (wb) counts.set(wb, (counts.get(wb) ?? 0) + 1);
    }
    if (data.length < JLPT_WORDS_BATCH) break;
  }
  return counts;
}

export async function getJlptWordbookWordsCount(wordbookId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("jlpt_words")
    .select("id", { count: "exact", head: true })
    .eq("wordbook_id", wordbookId);
  if (error) throw error;
  return count ?? 0;
}
