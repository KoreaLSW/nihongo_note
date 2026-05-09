const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

const kanjiPath = path.join(process.cwd(), "public", "kanji.csv");
let raw = fs.readFileSync(kanjiPath, "utf-8");
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

const records = parse(raw, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
});

const HEADERS = [
  "no",
  "level",
  "kanji",
  "meaning_quoted",
  "meaning",
  "onyomi",
  "kunyomi",
  "shape_explanation",
  "onyomi_detail",
  "kunyomi_detail",
  "memorized",
];

const byLevel = { N1: [], N2: [], N3: [], N4: [], N5: [] };
for (const row of records) {
  const level = (row.level || "").trim().toUpperCase();
  if (byLevel[level]) byLevel[level].push({ ...row });
}

for (const level of ["N1", "N2", "N3", "N4", "N5"]) {
  const rows = byLevel[level];
  if (!rows.length) continue;
  const renumbered = rows.map((r, i) => ({
    ...r,
    no: String(i + 1),
  }));
  const csv = stringify(renumbered, { header: true, columns: HEADERS });
  const outPath = path.join(process.cwd(), "public", `${level}.csv`);
  fs.writeFileSync(outPath, csv, "utf-8");
  console.log(`${level}.csv: ${renumbered.length} rows (no 1–${renumbered.length})`);
}

console.log("Done.");
