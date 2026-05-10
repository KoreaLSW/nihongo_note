"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getNowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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

async function assertWordbookOwner(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  wordbookId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("vocabulary_wordbooks")
    .select("id")
    .eq("id", wordbookId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("단어장을 찾을 수 없습니다.");
}

async function getNextWordbookSortOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("vocabulary_wordbooks")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.sort_order ?? 0) + 1;
}

async function getNextWordSortOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  wordbookId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("vocabulary_words")
    .select("sort_order")
    .eq("wordbook_id", wordbookId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.sort_order ?? 0) + 1;
}

async function resequenceWordSortOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  wordbookId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("vocabulary_words")
    .select("id")
    .eq("wordbook_id", wordbookId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data) return;

  for (let i = 0; i < data.length; i++) {
    const { error: updateError } = await supabase
      .from("vocabulary_words")
      .update({ sort_order: i + 1, updated_at: getNowIso() })
      .eq("id", data[i].id);
    if (updateError) throw updateError;
  }
}

export async function createWordbook(formData: FormData) {
  const name = (formData.get("name") as string) ?? "";

  if (!name.trim()) return { ok: false, error: "단어장 이름을 입력하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const now = getNowIso();

    const { error: insertError } = await supabase
      .from("vocabulary_wordbooks")
      .insert({
        id: makeId(),
        name: name.trim(),
        user_id: user.id,
        sort_order: await getNextWordbookSortOrder(supabase, user.id),
        created_at: now,
        updated_at: now,
      });

    if (insertError) throw insertError;

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("createWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function insertToWordbook(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const word = (formData.get("word") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const level = (formData.get("level") as string) ?? "";
  const reading = (formData.get("reading") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const wbId = wordbookId.trim();
    await assertWordbookOwner(supabase, user.id, wbId);

    const now = getNowIso();
    const { error: insertError } = await supabase.from("vocabulary_words").insert({
      wordbook_id: wbId,
      sort_order: await getNextWordSortOrder(supabase, wbId),
      word: word.trim(),
      reading: reading.trim(),
      meaning: meaning.trim(),
      level: level.trim() || "N5",
      created_at: now,
      updated_at: now,
    });

    if (insertError) throw insertError;

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate") || msg.includes("duplicate key")) {
      return { ok: false, error: "이미 이 단어장에 있는 단어입니다." };
    }
    console.error("insertToWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function deleteFromWordbook(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const word = (formData.get("word") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "wordbookId is required" };
  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const wbId = wordbookId.trim();
    await assertWordbookOwner(supabase, user.id, wbId);

    const { data, error } = await supabase
      .from("vocabulary_words")
      .delete()
      .eq("wordbook_id", wbId)
      .eq("word", word.trim())
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: "단어장에 없는 단어입니다." };
    }

    await resequenceWordSortOrder(supabase, wbId);

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "word not found") {
      return { ok: false, error: "단어장에 없는 단어입니다." };
    }
    console.error("deleteFromWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function reorderWordbookWordsAction(
  wordbookId: string,
  wordOrder: string[]
) {
  if (!wordbookId?.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!Array.isArray(wordOrder)) return { ok: false, error: "순서 데이터가 올바르지 않습니다." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const wbId = wordbookId.trim();
    await assertWordbookOwner(supabase, user.id, wbId);

    const cleaned = wordOrder
      .map((word) => String(word ?? "").trim())
      .filter(Boolean);

    for (let i = 0; i < cleaned.length; i++) {
      const { error } = await supabase
        .from("vocabulary_words")
        .update({ sort_order: i + 1, updated_at: getNowIso() })
        .eq("wordbook_id", wbId)
        .eq("word", cleaned[i]);
      if (error) throw error;
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorderWordbookWords error:", e);
    return { ok: false, error: msg };
  }
}

export async function renameWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const name = (formData.get("name") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!name.trim()) return { ok: false, error: "단어장 이름을 입력하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const { data, error } = await supabase
      .from("vocabulary_wordbooks")
      .update({ name: name.trim(), updated_at: getNowIso() })
      .eq("id", wordbookId.trim())
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: "단어장을 찾을 수 없습니다." };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("renameWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function reorderWordbooksAction(wordbookIds: string[]) {
  if (!Array.isArray(wordbookIds)) {
    return { ok: false, error: "순서 데이터가 올바르지 않습니다." };
  }

  try {
    const { supabase, user } = await getAuthedSupabase();
    const cleaned = wordbookIds
      .map((id) => String(id ?? "").trim())
      .filter(Boolean);

    for (let i = 0; i < cleaned.length; i++) {
      const { error } = await supabase
        .from("vocabulary_wordbooks")
        .update({ sort_order: i + 1, updated_at: getNowIso() })
        .eq("id", cleaned[i])
        .eq("user_id", user.id);
      if (error) throw error;
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorderWordbooks error:", e);
    return { ok: false, error: msg };
  }
}

export async function deleteWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const { data, error } = await supabase
      .from("vocabulary_wordbooks")
      .delete()
      .eq("id", wordbookId.trim())
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: "단어장을 찾을 수 없습니다." };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("deleteWordbook error:", e);
    return { ok: false, error: msg };
  }
}
