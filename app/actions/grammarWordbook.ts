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

async function assertGrammarWordbookOwner(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  wordbookId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("grammar_wordbooks")
    .select("id")
    .eq("id", wordbookId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("문법 단어장을 찾을 수 없습니다.");
}

async function getNextGrammarWordbookSortOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("grammar_wordbooks")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.sort_order ?? 0) + 1;
}

async function getNextGrammarItemSortOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  wordbookId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("grammar_wordbook_items")
    .select("sort_order")
    .eq("wordbook_id", wordbookId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.sort_order ?? 0) + 1;
}

async function resequenceGrammarItemSortOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  wordbookId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("grammar_wordbook_items")
    .select("id")
    .eq("wordbook_id", wordbookId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data) return;

  for (let i = 0; i < data.length; i++) {
    const { error: updateError } = await supabase
      .from("grammar_wordbook_items")
      .update({ sort_order: i + 1, updated_at: getNowIso() })
      .eq("id", data[i].id);
    if (updateError) throw updateError;
  }
}

export async function createGrammarWordbook(formData: FormData) {
  const name = (formData.get("name") as string) ?? "";
  if (!name.trim()) return { ok: false, error: "문법 단어장 이름을 입력하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const now = getNowIso();
    const { error: insertError } = await supabase
      .from("grammar_wordbooks")
      .insert({
        id: makeId(),
        user_id: user.id,
        name: name.trim(),
        sort_order: await getNextGrammarWordbookSortOrder(supabase, user.id),
        created_at: now,
        updated_at: now,
      });

    if (insertError) throw insertError;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("createGrammarWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function insertGrammarRowToWordbook(params: {
  wordbookId: string;
  grammar: string;
  shape?: string;
  meaning?: string;
  interpretation?: string;
  example?: string;
}) {
  const wordbookId = String(params.wordbookId ?? "").trim();
  const grammar = String(params.grammar ?? "").trim();

  if (!wordbookId) return { ok: false, error: "단어장을 선택하세요." };
  if (!grammar) return { ok: false, error: "grammar is required" };

  try {
    const { supabase, user } = await getAuthedSupabase();
    await assertGrammarWordbookOwner(supabase, user.id, wordbookId);

    const now = getNowIso();
    const { error: insertError } = await supabase
      .from("grammar_wordbook_items")
      .insert({
        wordbook_id: wordbookId,
        sort_order: await getNextGrammarItemSortOrder(supabase, wordbookId),
        grammar,
        shape: String(params.shape ?? "").trim(),
        meaning: String(params.meaning ?? "").trim(),
        interpretation: String(params.interpretation ?? "").trim(),
        example: String(params.example ?? "").trim(),
        created_at: now,
        updated_at: now,
      });

    if (insertError) throw insertError;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate") || msg.includes("duplicate key")) {
      return { ok: false, error: "이미 이 문법 단어장에 있는 문법입니다." };
    }
    console.error("insertGrammarRowToWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function insertToGrammarWordbook(formData: FormData) {
  return insertGrammarRowToWordbook({
    wordbookId: (formData.get("wordbookId") as string) ?? "",
    grammar: (formData.get("grammar") as string) ?? "",
    shape: (formData.get("shape") as string) ?? "",
    meaning: (formData.get("meaning") as string) ?? "",
    interpretation: (formData.get("interpretation") as string) ?? "",
    example: (formData.get("example") as string) ?? "",
  });
}

export async function deleteFromGrammarWordbook(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const grammar = (formData.get("grammar") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "wordbookId is required" };
  if (!grammar.trim()) return { ok: false, error: "grammar is required" };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const wbId = wordbookId.trim();
    await assertGrammarWordbookOwner(supabase, user.id, wbId);

    const { data, error } = await supabase
      .from("grammar_wordbook_items")
      .delete()
      .eq("wordbook_id", wbId)
      .eq("grammar", grammar.trim())
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: "문법 단어장에 없는 문법입니다." };
    }

    await resequenceGrammarItemSortOrder(supabase, wbId);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("deleteFromGrammarWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function reorderGrammarWordbookWordsAction(
  wordbookId: string,
  grammarOrder: string[]
) {
  if (!wordbookId?.trim())
    return { ok: false, error: "단어장을 선택하세요." };
  if (!Array.isArray(grammarOrder))
    return { ok: false, error: "순서 데이터가 올바르지 않습니다." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const wbId = wordbookId.trim();
    await assertGrammarWordbookOwner(supabase, user.id, wbId);

    const cleaned = grammarOrder
      .map((grammar) => String(grammar ?? "").trim())
      .filter(Boolean);

    for (let i = 0; i < cleaned.length; i++) {
      const { error } = await supabase
        .from("grammar_wordbook_items")
        .update({ sort_order: i + 1, updated_at: getNowIso() })
        .eq("wordbook_id", wbId)
        .eq("grammar", cleaned[i]);
      if (error) throw error;
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorderGrammarWordbookWords error:", e);
    return { ok: false, error: msg };
  }
}

export async function renameGrammarWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const name = (formData.get("name") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!name.trim()) return { ok: false, error: "문법 단어장 이름을 입력하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const { data, error } = await supabase
      .from("grammar_wordbooks")
      .update({ name: name.trim(), updated_at: getNowIso() })
      .eq("id", wordbookId.trim())
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: "문법 단어장을 찾을 수 없습니다." };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("renameGrammarWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function reorderGrammarWordbooksAction(wordbookIds: string[]) {
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
        .from("grammar_wordbooks")
        .update({ sort_order: i + 1, updated_at: getNowIso() })
        .eq("id", cleaned[i])
        .eq("user_id", user.id);
      if (error) throw error;
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorderGrammarWordbooks error:", e);
    return { ok: false, error: msg };
  }
}

export async function setGrammarMemorizedAction(formData: FormData) {
  const grammar = (formData.get("grammar") as string) ?? "";
  const value = (formData.get("value") as string) ?? "no";

  if (!grammar.trim()) return { ok: false, error: "grammar is required" };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const { data: grammarRow, error: grammarError } = await supabase
      .from("jlpt_grammar_items")
      .select("id")
      .eq("grammar", grammar.trim())
      .maybeSingle();

    if (grammarError) throw grammarError;
    if (!grammarRow?.id) {
      return { ok: false, error: "JLPT 문법 데이터에서 해당 문법을 찾지 못했습니다." };
    }

    const memorized = value === "yes";
    const now = getNowIso();
    const { error: progressError } = await supabase
      .from("user_jlpt_grammar_progress")
      .upsert(
        {
          user_id: user.id,
          grammar_id: grammarRow.id,
          memorized,
          memorized_at: memorized ? now : null,
          updated_at: now,
        },
        { onConflict: "user_id,grammar_id" }
      );

    if (progressError) throw progressError;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("setGrammarMemorized error:", e);
    return { ok: false, error: msg };
  }
}

export async function updateGrammarWordbookWordAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const no = (formData.get("no") as string) ?? "";
  const grammar = (formData.get("grammar") as string) ?? "";
  const shape = (formData.get("shape") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const interpretation = (formData.get("interpretation") as string) ?? "";
  const example = (formData.get("example") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!no.trim()) return { ok: false, error: "no is required" };
  if (!grammar.trim()) return { ok: false, error: "grammar is required" };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const wbId = wordbookId.trim();
    await assertGrammarWordbookOwner(supabase, user.id, wbId);

    const { data, error } = await supabase
      .from("grammar_wordbook_items")
      .update({
        grammar: grammar.trim(),
        shape: shape.trim(),
        meaning: meaning.trim(),
        interpretation: interpretation.trim(),
        example: example.trim(),
        updated_at: getNowIso(),
      })
      .eq("wordbook_id", wbId)
      .eq("sort_order", parseInt(no.trim(), 10) || -1)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: "문법 단어장에 없는 문법입니다." };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate") || msg.includes("duplicate key")) {
      return { ok: false, error: "이미 이 문법 단어장에 있는 문법입니다." };
    }
    console.error("updateGrammarWordbookWord error:", e);
    return { ok: false, error: msg };
  }
}

export async function deleteGrammarWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };

  try {
    const { supabase, user } = await getAuthedSupabase();
    const { data, error } = await supabase
      .from("grammar_wordbooks")
      .delete()
      .eq("id", wordbookId.trim())
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: "문법 단어장을 찾을 수 없습니다." };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("deleteGrammarWordbook error:", e);
    return { ok: false, error: msg };
  }
}
