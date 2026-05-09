"use server";

import fs from "fs";
import path from "path";
import { appendGrammarToWordbook } from "@/lib/grammarWordbook";

type GrammarDetailItem = {
  no: number;
  title?: string;
  meaning?: string;
  connection?: string;
  description?: string;
  examples_items?: Array<{
    text?: string;
    audio?: Record<string, string>;
  }>;
};

const LEVELS = ["n3", "n2", "n1"] as const;
type Level = (typeof LEVELS)[number];

function normalizeAudioUrl(u: string): string {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://nihongo.co.kr${s.startsWith("/") ? "" : "/"}${s}`;
}

function removeSpacesInJapaneseLine(text: string): string {
  const t = String(text ?? "");
  if (!t.trim()) return "";
  const [first, ...rest] = t.split("\n");
  const ja = String(first ?? "")
    .replace(/[ \t\u3000]+/g, "")
    .trimEnd();
  return [ja, ...rest].join("\n").trim();
}

function loadDetailList(level: Level): GrammarDetailItem[] {
  const filePath = path.join(
    process.cwd(),
    "public",
    "grammar_json",
    `${level}_detail.json`
  );
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as GrammarDetailItem[]) : [];
}

type AudioIndex = Record<
  string,
  {
    // 예문별 오디오 (있을 때만 저장)
    examples?: Array<{ male?: string; female?: string }>;
    level?: Level;
    no?: number;
  }
>;

function getAudioIndexPath(): string {
  return path.join(process.cwd(), "public", "grammar_json", "jlpt_audio_index.json");
}

function loadAudioIndex(): AudioIndex {
  const p = getAudioIndexPath();
  try {
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as AudioIndex) : {};
  } catch {
    return {};
  }
}

function saveAudioIndex(idx: AudioIndex): void {
  const p = getAudioIndexPath();
  fs.writeFileSync(p, JSON.stringify(idx, null, 2), "utf-8");
}

function buildAllExampleText(item: GrammarDetailItem): string {
  const items = item.examples_items ?? [];
  const examplesWithAudio: string[] = [];

  for (const ex of items) {
    const text = String(ex?.text ?? "").trim();
    if (!text) continue;
    if (text.startsWith("【")) continue;
    if (!text.includes("\n")) continue;

    const audio = ex?.audio ?? {};
    const male = normalizeAudioUrl(audio["남"] ?? "");
    const female = normalizeAudioUrl(audio["여"] ?? "");
    // 오디오가 없는 예문은 제외
    if (!male && !female) continue;

    examplesWithAudio.push(removeSpacesInJapaneseLine(text));
  }

  // 예문 1개마다 빈 줄 1개 추가(= 두 줄바꿈으로 구분)
  return examplesWithAudio.join("\n\n").trim();
}

function buildAllExampleAudios(
  item: GrammarDetailItem
): Array<{ male?: string; female?: string }> {
  const items = item.examples_items ?? [];
  const out: Array<{ male?: string; female?: string }> = [];

  for (const ex of items) {
    const text = String(ex?.text ?? "").trim();
    if (!text) continue;
    if (text.startsWith("【")) continue;
    if (!text.includes("\n")) continue;

    const audio = ex?.audio ?? {};
    const male = normalizeAudioUrl(audio["남"] ?? "");
    const female = normalizeAudioUrl(audio["여"] ?? "");
    if (!male && !female) continue;
    out.push({
      male: male || undefined,
      female: female || undefined,
    });
  }

  return out;
}

export async function importJlptGrammarToWordbook(formData: FormData) {
  const wordbookId = String(formData.get("wordbookId") ?? "").trim();
  const levelRaw = String(formData.get("level") ?? "").trim().toLowerCase();
  const noRaw = String(formData.get("no") ?? "").trim();

  if (!wordbookId) return { ok: false, error: "단어장을 선택하세요." };
  if (!LEVELS.includes(levelRaw as Level)) return { ok: false, error: "레벨이 올바르지 않습니다." };
  const level = levelRaw as Level;
  const no = Number.parseInt(noRaw, 10);
  if (!Number.isFinite(no) || no <= 0) return { ok: false, error: "번호가 올바르지 않습니다." };

  try {
    const list = loadDetailList(level);
    const item = list.find((x) => Number(x?.no) === no);
    if (!item) return { ok: false, error: "문법 데이터를 찾지 못했습니다." };

    const grammar = String(item.title ?? "").trim();
    if (!grammar) return { ok: false, error: "문법 제목이 비어 있습니다." };

    // 사용자 요청 매핑:
    // 접속 -> 형태, 의미 -> 뜻, 설명 -> 해석
    const shape = String(item.connection ?? "").trim();
    const meaning = String(item.meaning ?? "").trim();
    const interpretation = String(item.description ?? "").trim();
    const example = buildAllExampleText(item);

    appendGrammarToWordbook(wordbookId, {
      grammar,
      shape,
      meaning,
      interpretation,
      example,
    });

    // 오디오 인덱스: CSV 형식 유지하면서 음성만 별도 저장(예문 전체)
    const examplesAudios = buildAllExampleAudios(item);
    if (examplesAudios.some((a) => a.male || a.female)) {
      const idx = loadAudioIndex();
      idx[grammar] = { examples: examplesAudios, level, no };
      saveAudioIndex(idx);
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate")) {
      return { ok: false, error: "이미 이 문법 단어장에 있는 문법입니다." };
    }
    console.error("importJlptGrammarToWordbook error:", e);
    return { ok: false, error: msg };
  }
}

