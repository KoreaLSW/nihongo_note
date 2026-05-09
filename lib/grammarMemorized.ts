import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const CSV_PATH = path.join(process.cwd(), "public", "grammar_memorized.csv");
const HEADERS = ["grammar", "memorized", "memorized_at"] as const;

export type GrammarMemorizedRow = {
  grammar: string;
  memorized: string;
  memorized_at: string;
};

function getKstNow(): string {
  return new Date().toLocaleString("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function loadRecords(): Array<Record<string, string>> {
  if (!fs.existsSync(CSV_PATH)) return [];
  let raw = fs.readFileSync(CSV_PATH, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;
}

function saveRecords(records: Array<Record<string, string>>): void {
  const full = records.map((r) => ({
    grammar: r.grammar ?? "",
    memorized: r.memorized ?? "no",
    memorized_at: r.memorized_at ?? "",
  }));
  const csv = stringify(full, { header: true, columns: [...HEADERS] });
  fs.writeFileSync(CSV_PATH, csv, "utf-8");
}

/** grammar -> { memorized, memorized_at } */
export function getGrammarMemorizedMap(): Map<
  string,
  { memorized: string; memorized_at: string }
> {
  const records = loadRecords();
  const map = new Map<string, { memorized: string; memorized_at: string }>();
  for (const r of records) {
    const g = (r.grammar ?? "").trim();
    if (!g) continue;
    map.set(g, {
      memorized: r.memorized ?? "no",
      memorized_at: r.memorized_at ?? "",
    });
  }
  return map;
}

/** 문법 문자열로 암기 토글 */
export function setGrammarMemorized(
  grammar: string,
  memorized: boolean
): void {
  const g = (grammar ?? "").trim();
  if (!g) throw new Error("grammar is required");

  const records = loadRecords();
  const idx = records.findIndex((r) => (r.grammar ?? "").trim() === g);
  const now = getKstNow();

  if (idx >= 0) {
    records[idx].memorized = memorized ? "yes" : "no";
    records[idx].memorized_at = memorized ? now : "";
  } else {
    records.push({
      grammar: g,
      memorized: memorized ? "yes" : "no",
      memorized_at: memorized ? now : "",
    });
  }
  saveRecords(records);
}

/** 문법 암기 정보 삭제 */
export function removeGrammarMemorized(grammar: string): void {
  const g = (grammar ?? "").trim();
  if (!g) return;

  const records = loadRecords();
  const filtered = records.filter((r) => (r.grammar ?? "").trim() !== g);
  if (filtered.length !== records.length) saveRecords(filtered);
}

/** 암기 정보를 fromGrammar -> toGrammar로 이동(값/시간 유지) */
export function moveGrammarMemorized(fromGrammar: string, toGrammar: string): void {
  const from = (fromGrammar ?? "").trim();
  const to = (toGrammar ?? "").trim();
  if (!from || !to) return;
  if (from === to) return;

  const records = loadRecords();
  const fromIdx = records.findIndex((r) => (r.grammar ?? "").trim() === from);
  if (fromIdx < 0) return;

  const moved = records[fromIdx];
  const withoutFrom = records.filter((_, i) => i !== fromIdx);
  const toIdx = withoutFrom.findIndex((r) => (r.grammar ?? "").trim() === to);

  if (toIdx >= 0) {
    withoutFrom[toIdx] = {
      ...withoutFrom[toIdx],
      grammar: to,
      memorized: moved.memorized ?? "no",
      memorized_at: moved.memorized_at ?? "",
    };
  } else {
    withoutFrom.push({
      grammar: to,
      memorized: moved.memorized ?? "no",
      memorized_at: moved.memorized_at ?? "",
    });
  }

  saveRecords(withoutFrom);
}

