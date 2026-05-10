import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GrammarWordbookMeta = {
  id: string;
  name: string;
  file: string;
  user_id?: string;
};

export type GrammarWordbookRow = {
  no: string;
  grammar: string;
  shape: string;
  meaning: string;
  interpretation: string;
  example: string;
  created_at: string;
  memorized?: string;
  memorized_at?: string;
};

const GRAMMAR_ITEMS_PAGE = 1000;

async function fetchAllUserGrammarWordbookItems(
  selectColumns: string
): Promise<Array<Record<string, unknown>>> {
  const supabase = await createSupabaseServerClient();
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += GRAMMAR_ITEMS_PAGE) {
    const { data, error } = await supabase
      .from("grammar_wordbook_items")
      .select(selectColumns)
      .order("id", { ascending: true })
      .range(from, from + GRAMMAR_ITEMS_PAGE - 1);

    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as unknown as Array<Record<string, unknown>>));
    if (data.length < GRAMMAR_ITEMS_PAGE) break;
  }
  return rows;
}

/** 문법 단어장별 항목 개수 (목록 카드용, 페이지네이션으로 전 행 스캔) */
export async function getGrammarWordbookItemCountsByWordbookId(): Promise<
  Map<string, number>
> {
  const data = await fetchAllUserGrammarWordbookItems("wordbook_id");

  const counts = new Map<string, number>();
  for (const row of data) {
    const id = String(row["wordbook_id"] ?? "");
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** 사용자 문법 단어장에 담긴 `grammar` 제목 집합 (JLPT 목록 ‘추가됨’ 배지용, 단어장별 순차 조회 대신 한 테이블 스캔) */
export async function getAllGrammarWordbookGrammarTitles(): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const titles = new Set<string>();
  for (let from = 0; ; from += GRAMMAR_ITEMS_PAGE) {
    const { data, error } = await supabase
      .from("grammar_wordbook_items")
      .select("grammar")
      .order("id", { ascending: true })
      .range(from, from + GRAMMAR_ITEMS_PAGE - 1);

    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) {
      const g = String(r.grammar ?? "").trim();
      if (g) titles.add(g);
    }
    if (data.length < GRAMMAR_ITEMS_PAGE) break;
  }
  return titles;
}

export async function getGrammarWordbookList(): Promise<GrammarWordbookMeta[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("grammar_wordbooks")
    .select("id,name")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error || !data) throw error ?? new Error("grammar_wordbooks query failed");
  return data.map((r) => ({
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    file: "",
  }));
}

export async function getGrammarWordbookWords(
  wordbookId: string
): Promise<GrammarWordbookRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("grammar_wordbook_items")
    .select("id,sort_order,grammar,shape,meaning,interpretation,example,created_at")
    .eq("wordbook_id", wordbookId)
    .order("sort_order", { ascending: true });

  if (error || !data) throw error ?? new Error("grammar_wordbook_items query failed");
  const rows = data.map((r) => ({
    no: String(r.sort_order ?? ""),
    grammar: String(r.grammar ?? ""),
    shape: String(r.shape ?? ""),
    meaning: String(r.meaning ?? ""),
    interpretation: String(r.interpretation ?? ""),
    example: String(r.example ?? ""),
    created_at: String(r.created_at ?? ""),
  }));
  return attachJlptGrammarProgress(supabase, rows);
}

async function attachJlptGrammarProgress(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: GrammarWordbookRow[]
): Promise<GrammarWordbookRow[]> {
  const grammars = Array.from(
    new Set(rows.map((row) => row.grammar.trim()).filter(Boolean))
  );
  if (grammars.length === 0) return rows;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return rows;

  const { data: grammarRows, error: grammarError } = await supabase
    .from("jlpt_grammar_items")
    .select("id,grammar")
    .in("grammar", grammars);

  if (grammarError || !grammarRows || grammarRows.length === 0) return rows;

  const grammarIdByTitle = new Map(
    grammarRows.map((row) => [String(row.grammar ?? ""), Number(row.id)])
  );
  const ids = Array.from(grammarIdByTitle.values()).filter((id) =>
    Number.isFinite(id)
  );
  if (ids.length === 0) return rows;

  const { data: progressRows, error: progressError } = await supabase
    .from("user_jlpt_grammar_progress")
    .select("grammar_id,memorized,memorized_at")
    .eq("user_id", user.id)
    .in("grammar_id", ids);

  if (progressError || !progressRows) return rows;

  const progressByGrammarId = new Map(
    progressRows.map((row) => [
      Number(row.grammar_id),
      {
        memorized: row.memorized ? "yes" : "no",
        memorized_at: String(row.memorized_at ?? ""),
      },
    ])
  );

  return rows.map((row) => {
    const grammarId = grammarIdByTitle.get(row.grammar);
    const progress = grammarId ? progressByGrammarId.get(grammarId) : undefined;
    return {
      ...row,
      memorized: progress?.memorized ?? "no",
      memorized_at: progress?.memorized_at ?? "",
    };
  });
}

export async function getGrammarWordbookMeta(
  wordbookId: string
): Promise<GrammarWordbookMeta | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("grammar_wordbooks")
    .select("id,name")
    .eq("id", wordbookId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { id: String(data.id ?? ""), name: String(data.name ?? ""), file: "" };
}

export async function getGrammarWordbookWordByNo(
  wordbookId: string,
  no: string
): Promise<GrammarWordbookRow | null> {
  const noTrim = String(no ?? "").trim();
  const words = await getGrammarWordbookWords(wordbookId);
  return words.find((r) => String(r.no).trim() === noTrim) ?? null;
}
