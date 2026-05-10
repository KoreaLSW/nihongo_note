"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getNowIso(): string {
  return new Date().toISOString();
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

async function getKanjiIdForWord(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  word: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("kanji_items")
    .select("id")
    .eq("kanji", word)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

async function getNextVocabularyNoteNo(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("vocabulary_notes")
    .select("no")
    .eq("user_id", userId)
    .order("no", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.no ?? 0) + 1;
}

export async function insertToNote(formData: FormData) {
  const word = (formData.get("word") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const level = (formData.get("level") as string) ?? "";
  const reading = (formData.get("reading") as string) ?? "";

  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const now = getNowIso();
    const { error: insertError } = await supabase.from("vocabulary_notes").insert({
      user_id: user.id,
      no: await getNextVocabularyNoteNo(supabase, user.id),
      word: word.trim(),
      reading: reading.trim(),
      meaning: meaning.trim(),
      level: level.trim() || "N5",
      memorized: false,
      memorized_at: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
    });

    if (insertError) throw insertError;

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate") || msg.includes("duplicate key")) {
      return { ok: false, error: "이미 단어장에 있는 단어입니다." };
    }
    console.error("insertToNote error:", e);
    return { ok: false, error: msg };
  }
}

export async function deleteFromNote(formData: FormData) {
  const word = (formData.get("word") as string) ?? "";

  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const { data, error } = await supabase
      .from("vocabulary_notes")
      .delete()
      .match({ user_id: user.id, word: word.trim() })
      .select("word");

    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: "단어장에 없는 단어입니다." };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "word not found") {
      return { ok: false, error: "단어장에 없는 단어입니다." };
    }
    console.error("deleteFromNote error:", e);
    return { ok: false, error: msg };
  }
}

export async function setMemorized(formData: FormData) {
  const word = (formData.get("word") as string) ?? "";
  const value = (formData.get("value") as string) ?? "no";

  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const w = word.trim();
    const memorized = value === "yes";
    const now = getNowIso();
    const memorizedAt = memorized ? now : null;

    const { error: noteError } = await supabase
      .from("vocabulary_notes")
      .update({
        memorized,
        memorized_at: memorizedAt,
        reviewed_at: memorized ? undefined : null,
        updated_at: now,
      })
      .match({ user_id: user.id, word: w });
    if (noteError) throw noteError;

    const kanjiId = await getKanjiIdForWord(supabase, w);
    if (kanjiId) {
      const { error: progressError } = await supabase
        .from("user_kanji_progress")
        .upsert(
          {
            user_id: user.id,
            kanji_id: kanjiId,
            memorized,
            memorized_at: memorizedAt,
            reviewed_at: memorized ? undefined : null,
            updated_at: now,
          },
          { onConflict: "user_id,kanji_id" }
        );
      if (progressError) throw progressError;
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("setMemorized error:", e);
    return { ok: false, error: msg };
  }
}

export async function setReviewed(formData: FormData) {
  const word = (formData.get("word") as string) ?? "";

  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const w = word.trim();
    const now = getNowIso();

    const { error: noteError } = await supabase
      .from("vocabulary_notes")
      .update({ reviewed_at: now, updated_at: now })
      .match({ user_id: user.id, word: w });
    if (noteError) throw noteError;

    const kanjiId = await getKanjiIdForWord(supabase, w);
    if (kanjiId) {
      const { error: progressError } = await supabase
        .from("user_kanji_progress")
        .upsert(
          {
            user_id: user.id,
            kanji_id: kanjiId,
            reviewed_at: now,
            updated_at: now,
          },
          { onConflict: "user_id,kanji_id" }
        );
      if (progressError) throw progressError;
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("setReviewed error:", e);
    return { ok: false, error: msg };
  }
}
