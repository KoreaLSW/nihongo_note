"use server";

import { parse } from "csv-parse/sync";
import {
  normalizeJlptLevel,
  type JlptQuizMemorizedView,
  type JlptCsvImportResult,
} from "@/lib/jlptWordbook";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionFail = { ok: false; error: string };
type ActionOk = { ok: true };
type ImportJlptWordbookCsvActionResult = ActionFail | (ActionOk & JlptCsvImportResult);

function getKstNowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function toDbDate(value: string | null | undefined): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return `${s.replace(" ", "T")}+09:00`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function wordbookOwnershipFilter(userId: string) {
  return { user_id: userId };
}

async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("로그인이 필요합니다.");
  return { supabase, user };
}

async function getNextJlptWordbookSortOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  level: string
): Promise<number> {
  const { data, error } = await supabase
    .from("jlpt_wordbooks")
    .select("sort_order")
    .match({ user_id: userId, level })
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.sort_order ?? 0) + 1;
}

async function getNextJlptWordSortOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  wordbookId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("jlpt_words")
    .select("sort_order")
    .eq("wordbook_id", wordbookId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.sort_order ?? 0) + 1;
}

async function assertJlptWordbookOwner(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  wordbookId: string
) {
  const { data, error } = await supabase
    .from("jlpt_wordbooks")
    .select("id")
    .match({ id: wordbookId, ...wordbookOwnershipFilter(userId) })
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("wordbook not found");
}

export async function createJlptWordbookAction(formData: FormData) {
  const level = (formData.get("level") as string) ?? "";
  const name = (formData.get("name") as string) ?? "";

  if (!name.trim()) return { ok: false, error: "단어장 이름을 입력하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const normalizedLevel = normalizeJlptLevel(level);
    const id = makeId();
    const sortOrder = await getNextJlptWordbookSortOrder(
      supabase,
      user.id,
      normalizedLevel
    );
    const { error: insertError } = await supabase.from("jlpt_wordbooks").insert({
      id,
      level: normalizedLevel,
      name: name.trim(),
      user_id: user.id,
      sort_order: sortOrder,
    });

    if (insertError) throw insertError;

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("createJlptWordbookAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function insertToJlptWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const word = (formData.get("word") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const hiragana = (formData.get("hiragana") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!word.trim()) return { ok: false, error: "단어를 입력하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const id = wordbookId.trim();
    await assertJlptWordbookOwner(supabase, user.id, id);
    const sortOrder = await getNextJlptWordSortOrder(supabase, id);

    const { error } = await supabase.from("jlpt_words").insert({
      wordbook_id: id,
      sort_order: sortOrder,
      word: word.trim(),
      meaning: meaning.trim(),
      hiragana: hiragana.trim(),
      created_at: getKstNowIso(),
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate")) {
      return { ok: false, error: "이미 이 단어장에 있는 단어입니다." };
    }
    console.error("insertToJlptWordbookAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function setJlptWordMemorizedAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const no = (formData.get("no") as string) ?? "";
  const value = (formData.get("value") as string) ?? "no";
  const rawView = (formData.get("quizView") as string) ?? "word";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!no.trim()) return { ok: false, error: "항목 번호가 필요합니다." };

  const view: JlptQuizMemorizedView =
    rawView === "meaning" || rawView === "hiragana" ? rawView : "word";

  try {
    const { supabase, user } = await getAuthedSupabase();
    const id = wordbookId.trim();
    await assertJlptWordbookOwner(supabase, user.id, id);

    const now = value === "yes" ? getKstNowIso() : null;
    const patch =
      view === "word"
        ? { memorized_word: value === "yes", memorized_word_at: now }
        : view === "meaning"
          ? { memorized_meaning: value === "yes", memorized_meaning_at: now }
          : { memorized_hiragana: value === "yes", memorized_hiragana_at: now };

    const { error } = await supabase
      .from("jlpt_words")
      .update(patch)
      .match({ wordbook_id: id, sort_order: parseInt(no.trim(), 10) || -1 });

    if (error) throw error;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("setJlptWordMemorizedAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function importJlptWordbookCsvAction(
  formData: FormData
): Promise<ImportJlptWordbookCsvActionResult> {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const file = formData.get("file");

  if (!wordbookId.trim()) return { ok: false as const, error: "단어장을 선택하세요." };
  if (!(file instanceof File)) return { ok: false as const, error: "CSV 파일을 선택하세요." };
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false as const, error: "CSV 파일만 업로드할 수 있습니다." };
  }

  try {
    const { supabase, user } = await getAuthedSupabase();
    const id = wordbookId.trim();
    await assertJlptWordbookOwner(supabase, user.id, id);

    const text = await file.text();
    const parsed = parse(String(text ?? ""), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as Array<Record<string, string>>;

    const { data: existingRows, error: existingError } = await supabase
      .from("jlpt_words")
      .select("word,sort_order")
      .eq("wordbook_id", id);

    if (existingError) throw existingError;

    const existingWords = new Set((existingRows ?? []).map((r) => String(r.word ?? "")));
    const maxSortOrder = (existingRows ?? []).reduce(
      (max, r) => Math.max(max, Number(r.sort_order ?? 0)),
      0
    );
    const newWordSet = new Set<string>();
    const fails: JlptCsvImportResult["fails"] = [];
    const rowsToInsert: Array<Record<string, unknown>> = [];

    parsed.forEach((raw, idx) => {
      const rowNumber = idx + 2;
      const w = String(raw.word ?? raw.단어 ?? "").trim();
      const m = String(raw.meaning ?? raw.뜻 ?? "").trim();
      const h = String(raw.hiragana ?? raw.히라가나 ?? "").trim();

      if (!w) {
        fails.push({ row: rowNumber, reason: "단어 값이 비어 있습니다." });
        return;
      }
      if (!m) {
        fails.push({ row: rowNumber, reason: "뜻 값이 비어 있습니다." });
        return;
      }
      if (existingWords.has(w)) {
        fails.push({ row: rowNumber, reason: `이미 단어장에 있는 단어입니다. (단어: ${w})` });
        return;
      }
      if (newWordSet.has(w)) {
        fails.push({ row: rowNumber, reason: `업로드 파일 안에서 중복된 단어입니다. (단어: ${w})` });
        return;
      }
      newWordSet.add(w);
      rowsToInsert.push({
        wordbook_id: id,
        sort_order: maxSortOrder + rowsToInsert.length + 1,
        word: w,
        meaning: m,
        hiragana: h,
        created_at: getKstNowIso(),
      });
    });

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("jlpt_words").insert(rowsToInsert);
      if (insertError) throw insertError;
    }

    return {
      ok: true as const,
      total: parsed.length,
      inserted: rowsToInsert.length,
      failed: fails.length,
      fails,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("importJlptWordbookCsvAction error:", e);
    return { ok: false as const, error: msg };
  }
}

export async function deleteJlptWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const { error } = await supabase
      .from("jlpt_wordbooks")
      .delete()
      .match({ id: wordbookId.trim(), user_id: user.id });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("deleteJlptWordbookAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function renameJlptWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const name = (formData.get("name") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!name.trim()) return { ok: false, error: "단어장 이름을 입력하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const { error } = await supabase
      .from("jlpt_wordbooks")
      .update({ name: name.trim() })
      .match({ id: wordbookId.trim(), user_id: user.id });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("renameJlptWordbookAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function updateJlptWordbookWordAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const no = (formData.get("no") as string) ?? "";
  const word = (formData.get("word") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const hiragana = (formData.get("hiragana") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!no.trim()) return { ok: false, error: "항목 번호가 필요합니다." };
  if (!word.trim()) return { ok: false, error: "단어를 입력하세요." };
  if (!meaning.trim()) return { ok: false, error: "뜻을 입력하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const id = wordbookId.trim();
    await assertJlptWordbookOwner(supabase, user.id, id);
    const { error } = await supabase
      .from("jlpt_words")
      .update({
        word: word.trim(),
        meaning: meaning.trim(),
        hiragana: hiragana.trim(),
      })
      .match({ wordbook_id: id, sort_order: parseInt(no.trim(), 10) || -1 });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate")) {
      return { ok: false, error: "이미 이 단어장에 있는 단어입니다." };
    }
    console.error("updateJlptWordbookWordAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function deleteFromJlptWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const no = (formData.get("no") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!no.trim()) return { ok: false, error: "항목 번호가 필요합니다." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const id = wordbookId.trim();
    await assertJlptWordbookOwner(supabase, user.id, id);
    const sortOrder = parseInt(no.trim(), 10) || -1;
    const { error } = await supabase
      .from("jlpt_words")
      .delete()
      .match({ wordbook_id: id, sort_order: sortOrder });
    if (error) throw error;

    const { data: rows, error: rowsError } = await supabase
      .from("jlpt_words")
      .select("id")
      .eq("wordbook_id", id)
      .order("sort_order", { ascending: true });
    if (rowsError) throw rowsError;
    for (let i = 0; i < (rows ?? []).length; i += 1) {
      const row = rows![i];
      const { error: updateError } = await supabase
        .from("jlpt_words")
        .update({ sort_order: i + 1 })
        .eq("id", row.id);
      if (updateError) throw updateError;
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("deleteFromJlptWordbookAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function reorderJlptWordbooksAction(level: string, wordbookIds: string[]) {
  if (!String(level ?? "").trim()) {
    return { ok: false, error: "레벨 정보가 올바르지 않습니다." };
  }
  if (!Array.isArray(wordbookIds)) {
    return { ok: false, error: "순서 데이터가 올바르지 않습니다." };
  }

  try {
    const { supabase, user } = await getAuthedSupabase();
    const normalizedLevel = normalizeJlptLevel(level);
    for (let i = 0; i < wordbookIds.length; i += 1) {
      const { error } = await supabase
        .from("jlpt_wordbooks")
        .update({ sort_order: i + 1 })
        .match({
          id: String(wordbookIds[i] ?? "").trim(),
          user_id: user.id,
          level: normalizedLevel,
        });
      if (error) throw error;
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorderJlptWordbooksAction error:", e);
    return { ok: false, error: msg };
  }
}
