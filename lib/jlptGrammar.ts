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

export async function getJlptGrammarItems(level: JlptGrammarLevel): Promise<JlptGrammarItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jlpt_grammar_items")
    .select("id,level,no,grammar,shape,meaning,interpretation,example")
    .eq("level", level)
    .order("no", { ascending: true });

  if (!error && data && data.length > 0) {
    return attachUserProgress(supabase, data.map(mapDbRow));
  }
  return loadGrammarDetailFromJson(level);
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
    return attachUserProgress(supabase, data.map(mapDbRow));
  }

  const lists = await Promise.all(JLPT_GRAMMAR_LEVELS.map((level) => getJlptGrammarItems(level)));
  const queryLower = q.toLowerCase();
  return lists
    .flat()
    .filter((item) =>
      `${item.title ?? ""}\n${item.meaning ?? ""}\n${item.connection ?? ""}`.toLowerCase().includes(queryLower)
    );
}
