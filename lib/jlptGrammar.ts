import fs from "fs/promises";
import path from "path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const JLPT_GRAMMAR_LEVELS = ["n3", "n2", "n1"] as const;
export type JlptGrammarLevel = (typeof JLPT_GRAMMAR_LEVELS)[number];

export type JlptGrammarItem = {
  id?: number;
  no: number;
  level: JlptGrammarLevel;
  title?: string;
  href?: string;
  meaning?: string;
  connection?: string;
  description?: string;
  related?: Array<{ title?: string; href?: string }>;
  video?: { title?: string; text?: string; youtube?: string };
  examples_items?: Array<{ text?: string; audio?: Record<string, string> }>;
  memorized?: "yes" | "no";
  memorized_at?: string;
};

async function loadGrammarDetailFromJson(level: JlptGrammarLevel): Promise<JlptGrammarItem[]> {
  const filePath = path.join(process.cwd(), "public", "grammar_json", `${level}_detail.json`);
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed)
    ? (parsed as Omit<JlptGrammarItem, "level">[]).map((item) => ({ ...item, level }))
    : [];
}

/** 프로세스 수명 동안 레벨별 상세 JSON을 한 번만 파싱해 맵으로 캐시 (목록/상세 재요청 비용 완화) */
const jlptGrammarDetailMaps = new Map<
  JlptGrammarLevel,
  Promise<Map<number, JlptGrammarItem>>
>();

export async function getJlptGrammarDetailMap(
  level: JlptGrammarLevel
): Promise<Map<number, JlptGrammarItem>> {
  let pending = jlptGrammarDetailMaps.get(level);
  if (!pending) {
    pending = loadGrammarDetailFromJson(level).then((items) => {
      return new Map(items.map((item) => [Number(item.no), item]));
    });
    jlptGrammarDetailMaps.set(level, pending);
  }
  return pending;
}

function mergeJlptGrammarJsonExtras(
  item: JlptGrammarItem,
  jsonItem: JlptGrammarItem | undefined
): JlptGrammarItem {
  if (!jsonItem) return item;
  return {
    ...item,
    href: jsonItem.href,
    related: jsonItem.related,
    video: jsonItem.video,
    examples_items: jsonItem.examples_items ?? item.examples_items,
  };
}

async function attachJsonDetailFields(items: JlptGrammarItem[]): Promise<JlptGrammarItem[]> {
  const levels = Array.from(new Set(items.map((item) => item.level)));
  const jsonByLevel = new Map<JlptGrammarLevel, Map<number, JlptGrammarItem>>();

  for (const level of levels) {
    jsonByLevel.set(level, await getJlptGrammarDetailMap(level));
  }

  return items.map((item) => {
    const jsonItem = jsonByLevel.get(item.level)?.get(Number(item.no));
    return mergeJlptGrammarJsonExtras(item, jsonItem);
  });
}

function mapDbRow(row: {
  id?: number | null;
  level: string | null;
  no: number | null;
  grammar: string | null;
  shape: string | null;
  meaning: string | null;
  interpretation: string | null;
  example: string | null;
}): JlptGrammarItem {
  const level = String(row.level ?? "n3").toLowerCase() as JlptGrammarLevel;
  return {
    id: typeof row.id === "number" ? row.id : undefined,
    level,
    no: Number(row.no ?? 0),
    title: row.grammar ?? "",
    connection: row.shape ?? "",
    meaning: row.meaning ?? "",
    description: row.interpretation ?? "",
    examples_items: row.example ? [{ text: row.example }] : [],
    memorized: "no",
    memorized_at: "",
  };
}

async function attachUserProgress(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  items: JlptGrammarItem[]
): Promise<JlptGrammarItem[]> {
  const ids = items
    .map((item) => item.id)
    .filter((id): id is number => typeof id === "number");
  if (ids.length === 0) return items;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return items;

  const { data, error } = await supabase
    .from("user_jlpt_grammar_progress")
    .select("grammar_id,memorized,memorized_at")
    .eq("user_id", user.id)
    .in("grammar_id", ids);

  if (error || !data) return items;

  const progressMap = new Map<
    number,
    { memorized: "yes" | "no"; memorized_at: string }
  >(
    data.map((row) => [
      Number(row.grammar_id),
      {
        memorized: (row.memorized ? "yes" : "no") as "yes" | "no",
        memorized_at: row.memorized_at ? String(row.memorized_at) : "",
      },
    ])
  );

  return items.map((item) => ({
    ...item,
    ...(item.id ? progressMap.get(item.id) : undefined),
  }));
}

/** 목록 카드용(DB 컬럼 + 암기). `*_detail.json` 병합·전부 파싱 없음 */
export async function getJlptGrammarItemsForList(
  level: JlptGrammarLevel
): Promise<JlptGrammarItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jlpt_grammar_items")
    .select("id,level,no,grammar,shape,meaning,interpretation,example")
    .eq("level", level)
    .order("no", { ascending: true });

  if (!error && data && data.length > 0) {
    const items = data.map(mapDbRow);
    return attachUserProgress(supabase, items);
  }

  const jsonMap = await getJlptGrammarDetailMap(level);
  const fallback = [...jsonMap.values()].sort((a, b) => a.no - b.no);
  return attachUserProgress(supabase, fallback);
}

/** 단일 항목 상세(DB 1건 + 해당 no만 JSON 병합). 전 레벨 목록 로드 없음 */
export async function getJlptGrammarItem(
  level: JlptGrammarLevel,
  no: number
): Promise<JlptGrammarItem | null> {
  const supabase = await createSupabaseServerClient();
  const [jsonMap, dbResult] = await Promise.all([
    getJlptGrammarDetailMap(level),
    supabase
      .from("jlpt_grammar_items")
      .select("id,level,no,grammar,shape,meaning,interpretation,example")
      .eq("level", level)
      .eq("no", no)
      .maybeSingle(),
  ]);

  const jsonItem = jsonMap.get(no);
  const { data, error } = dbResult;

  if (data && !error) {
    const base = mapDbRow(data);
    const merged = mergeJlptGrammarJsonExtras(base, jsonItem);
    const [out] = await attachUserProgress(supabase, [merged]);
    return out ?? merged;
  }

  if (jsonItem) {
    const fromJson = { ...jsonItem, level };
    const [out] = await attachUserProgress(supabase, [fromJson]);
    return out ?? fromJson;
  }

  return null;
}

export async function getJlptGrammarItems(level: JlptGrammarLevel): Promise<JlptGrammarItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jlpt_grammar_items")
    .select("id,level,no,grammar,shape,meaning,interpretation,example")
    .eq("level", level)
    .order("no", { ascending: true });

  if (!error && data && data.length > 0) {
    const withJsonDetails = await attachJsonDetailFields(data.map(mapDbRow));
    return attachUserProgress(supabase, withJsonDetails);
  }

  const jsonMap = await getJlptGrammarDetailMap(level);
  return [...jsonMap.values()].sort((a, b) => a.no - b.no);
}

export async function searchJlptGrammarItems(query: string): Promise<JlptGrammarItem[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jlpt_grammar_items")
    .select("id,level,no,grammar,shape,meaning,interpretation,example")
    .or(`grammar.ilike.%${q}%,shape.ilike.%${q}%,meaning.ilike.%${q}%,interpretation.ilike.%${q}%,example.ilike.%${q}%`)
    .order("level", { ascending: false })
    .order("no", { ascending: true });

  if (!error && data && data.length > 0) {
    const withJsonDetails = await attachJsonDetailFields(data.map(mapDbRow));
    return attachUserProgress(supabase, withJsonDetails);
  }

  const lists = await Promise.all(JLPT_GRAMMAR_LEVELS.map((level) => getJlptGrammarItems(level)));
  const queryLower = q.toLowerCase();
  return lists
    .flat()
    .filter((item) =>
      `${item.title ?? ""}\n${item.meaning ?? ""}\n${item.connection ?? ""}`.toLowerCase().includes(queryLower)
    );
}
