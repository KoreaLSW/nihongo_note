import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const EXECUTE = process.argv.includes("--execute");
const ONLY = getArgValue("--only");
const BATCH_SIZE = Number(getArgValue("--batch-size") ?? "500");

loadEnvFile(path.join(ROOT, ".env"));
loadEnvFile(path.join(ROOT, ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MIGRATION_USER_ID = process.env.MIGRATION_USER_ID;

if (!SUPABASE_URL) fail("NEXT_PUBLIC_SUPABASE_URL is required.");
if (!SERVICE_ROLE_KEY) fail("SUPABASE_SERVICE_ROLE_KEY is required.");
if (!MIGRATION_USER_ID) fail("MIGRATION_USER_ID is required.");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const tasks = {
  kanji: migrateKanjiItems,
  kanjiProgress: migrateKanjiProgress,
  jlptGrammar: migrateJlptGrammarItems,
  vocabularyNotes: migrateVocabularyNotes,
  vocabularyWordbooks: migrateVocabularyWordbooks,
  grammarWordbooks: migrateGrammarWordbooks,
  jlptWordbooks: migrateJlptWordbooks,
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  console.log(EXECUTE ? "Running migration with --execute" : "Dry run. Add --execute to write to Supabase.");
  console.log(`Target user: ${MIGRATION_USER_ID}`);

  const entries = Object.entries(tasks).filter(([name]) => !ONLY || name === ONLY);
  if (ONLY && entries.length === 0) {
    fail(`Unknown --only value: ${ONLY}. Available: ${Object.keys(tasks).join(", ")}`);
  }

  for (const [name, task] of entries) {
    console.log(`\n== ${name} ==`);
    await task();
  }

  console.log("\nDone.");
}

async function migrateKanjiItems() {
  const rowsByKanji = new Map();
  for (const level of ["n5", "n4", "n3", "n2", "n1"]) {
    const file = path.join(PUBLIC_DIR, `${level.toUpperCase()}.csv`);
    for (const row of readCsvIfExists(file)) {
      const kanji = str(row.kanji);
      if (!kanji || rowsByKanji.has(kanji)) continue;
      rowsByKanji.set(kanji, {
        no: toInt(row.no),
        kanji,
        meaning_quoted: str(row.meaning_quoted),
        meaning: str(row.meaning),
        onyomi: str(row.onyomi),
        kunyomi: str(row.kunyomi),
        shape_explanation: str(row.shape_explanation),
        onyomi_detail: str(row.onyomi_detail),
        kunyomi_detail: str(row.kunyomi_detail),
        level,
        image_path: null,
      });
    }
  }

  const rows = [...rowsByKanji.values()].filter((row) => row.no !== null);
  await upsert("kanji_items", rows, "kanji");
}

async function migrateKanjiProgress() {
  const records = readCsvIfExists(path.join(PUBLIC_DIR, "memorized.csv"));
  if (records.length === 0) return logPlan("user_kanji_progress", 0);

  const words = records.map((row) => str(row.word)).filter(Boolean);
  const kanjiIdByChar = await getKanjiIdMap(words);
  const rows = records
    .map((row) => {
      const word = str(row.word);
      const kanjiId = kanjiIdByChar.get(word);
      if (!kanjiId) return null;
      return {
        user_id: MIGRATION_USER_ID,
        kanji_id: kanjiId,
        memorized: yn(row.memorized),
        memorized_at: toDate(row.memorized_at),
        reviewed_at: toDate(row.reviewed_at),
      };
    })
    .filter(Boolean);

  await upsert("user_kanji_progress", rows, "user_id,kanji_id");
}

async function migrateJlptGrammarItems() {
  const rows = [];
  for (const level of ["n3", "n2", "n1"]) {
    const file = path.join(PUBLIC_DIR, "grammar_json", `${level}_detail.json`);
    const items = readJsonArrayIfExists(file);
    for (const item of items) {
      const no = toInt(item.no);
      const grammar = str(item.title);
      if (!no || !grammar) continue;
      rows.push({
        level,
        no,
        grammar,
        shape: str(item.connection),
        meaning: str(item.meaning),
        interpretation: str(item.description),
        example: buildGrammarExampleText(item),
      });
    }
  }

  await upsert("jlpt_grammar_items", rows, "level,no");
}

async function migrateVocabularyNotes() {
  const noteRows = readCsvIfExists(path.join(PUBLIC_DIR, "note.csv"));
  const memorizedMap = new Map(
    readCsvIfExists(path.join(PUBLIC_DIR, "memorized.csv")).map((row) => [str(row.word), row])
  );

  const rows = noteRows
    .map((row) => {
      const word = str(row.word);
      if (!word) return null;
      const memo = memorizedMap.get(word);
      return {
        user_id: MIGRATION_USER_ID,
        no: toInt(row.no),
        word,
        reading: str(row.reading),
        meaning: str(row.meaning),
        level: str(row.level) || "N5",
        memorized: yn(memo?.memorized),
        memorized_at: toDate(memo?.memorized_at),
        reviewed_at: toDate(memo?.reviewed_at),
        created_at: toDate(row.created_at) ?? new Date().toISOString(),
      };
    })
    .filter(Boolean);

  await upsert("vocabulary_notes", rows, "user_id,word");
}

async function migrateVocabularyWordbooks() {
  const manifest = readJsonArrayIfExists(path.join(PUBLIC_DIR, "vocabulary_words", "wordbooks.json"));
  const wordbooks = manifest
    .map((book, index) => ({
      id: str(book.id),
      user_id: MIGRATION_USER_ID,
      name: str(book.name),
      sort_order: index + 1,
    }))
    .filter((book) => book.id && book.name);

  await upsert("vocabulary_wordbooks", wordbooks, "id");

  const words = [];
  for (const book of manifest) {
    const wordbookId = str(book.id);
    const file = str(book.file);
    if (!wordbookId || !file) continue;
    const records = readCsvIfExists(path.join(PUBLIC_DIR, "vocabulary_words", file));
    for (const [index, row] of records.entries()) {
      const word = str(row.word);
      if (!word) continue;
      words.push({
        wordbook_id: wordbookId,
        sort_order: toInt(row.no) ?? index + 1,
        word,
        reading: str(row.reading),
        meaning: str(row.meaning),
        level: str(row.level),
        created_at: toDate(row.created_at) ?? new Date().toISOString(),
      });
    }
  }

  await upsert("vocabulary_words", words, "wordbook_id,word");
}

async function migrateGrammarWordbooks() {
  const manifest = readJsonArrayIfExists(
    path.join(PUBLIC_DIR, "grammar_wordbooks", "grammar_wordbooks.json")
  );
  const wordbooks = manifest
    .map((book, index) => ({
      id: str(book.id),
      user_id: MIGRATION_USER_ID,
      name: str(book.name),
      sort_order: index + 1,
    }))
    .filter((book) => book.id && book.name);

  await upsert("grammar_wordbooks", wordbooks, "id");

  const items = [];
  for (const book of manifest) {
    const wordbookId = str(book.id);
    const file = str(book.file);
    if (!wordbookId || !file) continue;
    const records = readCsvIfExists(path.join(PUBLIC_DIR, "grammar_wordbooks", file));
    for (const [index, row] of records.entries()) {
      const grammar = str(row.grammar);
      if (!grammar) continue;
      items.push({
        wordbook_id: wordbookId,
        sort_order: toInt(row.no) ?? index + 1,
        grammar,
        shape: str(row.shape ?? row["형태"]),
        meaning: str(row.meaning ?? row["뜻"]),
        interpretation: str(row.interpretation ?? row["해석"] ?? row.translation),
        example: str(row.example ?? row["예문"]),
        created_at: toDate(row.created_at) ?? new Date().toISOString(),
      });
    }
  }

  await upsert("grammar_wordbook_items", items, "wordbook_id,grammar");
}

async function migrateJlptWordbooks() {
  const manifest = readJsonArrayIfExists(path.join(PUBLIC_DIR, "jlpt_wordbooks", "jlpt_wordbooks.json"));
  const wordbooks = manifest
    .map((book) => ({
      id: str(book.id),
      user_id: MIGRATION_USER_ID,
      level: str(book.level).toLowerCase() || "n5",
      name: str(book.name),
    }))
    .filter((book) => book.id && book.name);

  await upsert("jlpt_wordbooks", wordbooks, "id");

  const words = [];
  for (const book of manifest) {
    const wordbookId = str(book.id);
    const file = str(book.file);
    if (!wordbookId || !file) continue;
    const records = readCsvIfExists(path.join(PUBLIC_DIR, "jlpt_wordbooks", file));
    for (const [index, row] of records.entries()) {
      const word = str(row.word ?? row.japanese);
      const meaning = str(row.meaning ?? row["뜻"]);
      if (!word || !meaning) continue;

      const memorizedWord = yn(row.memorized_word ?? row.memorized);
      const memorizedMeaning = yn(row.memorized_meaning ?? row.memorized);
      const memorizedHiragana = yn(row.memorized_hiragana ?? row.memorized);

      words.push({
        wordbook_id: wordbookId,
        sort_order: toInt(row.no) ?? index + 1,
        word,
        meaning,
        hiragana: str(row.hiragana ?? row.reading ?? row["히라가나"]),
        memorized_word: memorizedWord,
        memorized_word_at: toDate(row.memorized_word_at ?? row.memorized_at),
        memorized_meaning: memorizedMeaning,
        memorized_meaning_at: toDate(row.memorized_meaning_at ?? row.memorized_at),
        memorized_hiragana: memorizedHiragana,
        memorized_hiragana_at: toDate(row.memorized_hiragana_at ?? row.memorized_at),
        memorized: memorizedWord && memorizedMeaning && memorizedHiragana,
        memorized_at: toDate(row.memorized_at),
        created_at: toDate(row.created_at) ?? new Date().toISOString(),
      });
    }
  }

  await upsert("jlpt_words", words, "wordbook_id,word");
}

async function getKanjiIdMap(chars) {
  const unique = [...new Set(chars)].filter(Boolean);
  const map = new Map();
  for (const chunk of chunks(unique, BATCH_SIZE)) {
    const { data, error } = await supabase.from("kanji_items").select("id,kanji").in("kanji", chunk);
    if (error) throw error;
    for (const row of data ?? []) map.set(row.kanji, row.id);
  }
  return map;
}

async function upsert(table, rows, onConflict) {
  logPlan(table, rows.length);
  if (!EXECUTE || rows.length === 0) return;

  let done = 0;
  for (const chunk of chunks(rows, BATCH_SIZE)) {
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    done += chunk.length;
    console.log(`  ${table}: ${done}/${rows.length}`);
  }
}

function logPlan(table, count) {
  console.log(`  ${table}: ${count} rows${EXECUTE ? "" : " (dry-run)"}`);
}

function readCsvIfExists(filePath) {
  if (!fs.existsSync(filePath)) return [];
  let raw = fs.readFileSync(filePath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
}

function readJsonArrayIfExists(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Array.isArray(parsed) ? parsed : [];
}

function buildGrammarExampleText(item) {
  if (str(item.examples)) return str(item.examples);
  const examples = Array.isArray(item.examples_items) ? item.examples_items : [];
  return examples.map((example) => str(example?.text)).filter(Boolean).join("\n\n");
}

function str(value) {
  return String(value ?? "").trim();
}

function toInt(value) {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function yn(value) {
  return str(value).toLowerCase() === "yes";
}

function toDate(value) {
  const s = str(value);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00+09:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return `${s.replace(" ", "T")}+09:00`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function getArgValue(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/g);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
