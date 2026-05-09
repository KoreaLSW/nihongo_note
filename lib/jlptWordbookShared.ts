/**
 * Node `fs` 없음 — 클라이언트 컴포넌트에서 안전하게 import 가능
 */

/** 퀴즈 표시 모드별 암기. 집계 필드 `memorized`는 세 모드 모두 yes일 때만 yes */
export type JlptWordbookRow = {
  no: string;
  word: string;
  meaning: string;
  hiragana: string;
  memorized_word: "yes" | "no";
  memorized_word_at: string;
  memorized_meaning: "yes" | "no";
  memorized_meaning_at: string;
  memorized_hiragana: "yes" | "no";
  memorized_hiragana_at: string;
  /** 세 모드 모두 암기 시 yes (목록 필터·호환용) */
  memorized: "yes" | "no";
  memorized_at: string;
  created_at: string;
};

export type JlptQuizMemorizedView = "word" | "meaning" | "hiragana";

export const JLPT_WORDBOOK_CSV_COLUMNS = [
  "no",
  "word",
  "meaning",
  "hiragana",
  "memorized_word",
  "memorized_word_at",
  "memorized_meaning",
  "memorized_meaning_at",
  "memorized_hiragana",
  "memorized_hiragana_at",
  "memorized",
  "memorized_at",
  "created_at",
] as const;

export function recomputeJlptAggregateFields(row: JlptWordbookRow): void {
  const allYes =
    row.memorized_word === "yes" &&
    row.memorized_meaning === "yes" &&
    row.memorized_hiragana === "yes";
  row.memorized = allYes ? "yes" : "no";
  if (allYes) {
    const dates = [
      row.memorized_word_at,
      row.memorized_meaning_at,
      row.memorized_hiragana_at,
    ].filter(Boolean);
    row.memorized_at = dates.length ? dates.sort().slice(-1)[0]! : "";
  } else {
    row.memorized_at = "";
  }
}

export function getJlptMemorizedForQuizView(
  row: JlptWordbookRow,
  view: JlptQuizMemorizedView
): "yes" | "no" {
  if (view === "word") return row.memorized_word;
  if (view === "meaning") return row.memorized_meaning;
  return row.memorized_hiragana;
}

export function getJlptMemorizedAtForQuizView(
  row: JlptWordbookRow,
  view: JlptQuizMemorizedView
): string {
  if (view === "word") return row.memorized_word_at;
  if (view === "meaning") return row.memorized_meaning_at;
  return row.memorized_hiragana_at;
}

/** 목록·퀴즈 필터: 전체 / 완전 암기(yes) / 미완전(no) / 단어보기만 암기(word) / 뜻보기만 암기(meaning) */
export type JlptMemorizedListMode = "all" | "yes" | "no" | "word" | "meaning";

export function parseJlptMemorizedListParam(raw: string | undefined): JlptMemorizedListMode {
  const m = (raw ?? "all").toLowerCase();
  if (m === "yes") return "yes";
  if (m === "no") return "no";
  if (m === "word") return "word";
  if (m === "meaning") return "meaning";
  return "all";
}

export function filterJlptWordbookRowsByMemorizedMode<
  T extends Pick<JlptWordbookRow, "memorized" | "memorized_word" | "memorized_meaning">,
>(rows: T[], mode: JlptMemorizedListMode): T[] {
  if (mode === "all") return rows;
  if (mode === "yes") return rows.filter((r) => r.memorized === "yes");
  if (mode === "no") return rows.filter((r) => r.memorized === "no");
  if (mode === "word") return rows.filter((r) => r.memorized_word === "yes");
  if (mode === "meaning") return rows.filter((r) => r.memorized_meaning === "yes");
  return rows;
}

/** 퀴즈 표시 탭 URL(`view`). `full` = 세 축 모두 암기된 단어만 (암기 단어 모드에서 사용) */
export type JlptQuizDisplayView = "word" | "meaning" | "hiragana" | "full";

export function parseJlptQuizDisplayViewParam(raw: string | undefined): JlptQuizDisplayView {
  const v = String(raw ?? "word").toLowerCase();
  if (v === "meaning") return "meaning";
  if (v === "hiragana") return "hiragana";
  if (v === "full") return "full";
  return "word";
}

/** 단어장 상세 URL `axis` — 기본 `full`(집계). 퀴즈 `view`와 동일. */
export function parseJlptWordbookListAxisParam(raw: string | undefined): JlptQuizDisplayView {
  const v = String(raw ?? "full").toLowerCase();
  if (v === "word") return "word";
  if (v === "meaning") return "meaning";
  if (v === "hiragana") return "hiragana";
  if (v === "full") return "full";
  return "full";
}

type QuizRowPick = Pick<
  JlptWordbookRow,
  "memorized" | "memorized_word" | "memorized_meaning" | "memorized_hiragana"
>;

/**
 * JLPT 퀴즈 목록 필터.
 * - `yes` / `no`: 표시 모드별로 해당 축의 암기 상태를 본다. `full`은 집계(`memorized`) 기준.
 * - `yes`: 순수 한 축만 암기 또는 전체 암기(`full`).
 * - `no`: 해당 축만 미암기 또는 전체 미완료(`full` = 세 축 모두 암기 아님).
 * - 예전 URL `memorized=word|meaning`(목록용)은 퀴즈에서 yes + 해당 표시로 해석합니다.
 */
export function filterJlptWordbookRowsForQuiz<T extends QuizRowPick>(
  rows: T[],
  listMode: JlptMemorizedListMode,
  display: JlptQuizDisplayView
): T[] {
  let mode = listMode;
  let disp: JlptQuizDisplayView = display;
  if (mode === "word") {
    mode = "yes";
    disp = "word";
  } else if (mode === "meaning") {
    mode = "yes";
    disp = "meaning";
  }

  if (mode === "all") return rows;
  if (mode === "no") {
    if (disp === "full") return rows.filter((r) => r.memorized === "no");
    if (disp === "word") return rows.filter((r) => r.memorized_word === "no");
    if (disp === "meaning") return rows.filter((r) => r.memorized_meaning === "no");
    return rows.filter((r) => r.memorized_hiragana === "no");
  }
  if (mode === "yes") {
    if (disp === "full") return rows.filter((r) => r.memorized === "yes");
    if (disp === "word") {
      return rows.filter(
        (r) =>
          r.memorized_word === "yes" &&
          r.memorized_meaning === "no" &&
          r.memorized_hiragana === "no"
      );
    }
    if (disp === "meaning") {
      return rows.filter(
        (r) =>
          r.memorized_meaning === "yes" &&
          r.memorized_word === "no" &&
          r.memorized_hiragana === "no"
      );
    }
    return rows.filter(
      (r) =>
        r.memorized_hiragana === "yes" &&
        r.memorized_word === "no" &&
        r.memorized_meaning === "no"
    );
  }
  return rows;
}

/** 카드 정답 처리용: `full` 목록에서는 단어 축으로 서버 액션 호출 */
export function jlptQuizDisplayViewToCardView(
  display: JlptQuizDisplayView
): JlptQuizMemorizedView {
  if (display === "full") return "word";
  return display;
}

/** 카드 배지용: 미암기 모드에서 `view=full`일 때만 사용 */
export function jlptQuizCardVariantForFullRow(
  listMode: JlptMemorizedListMode,
  display: JlptQuizDisplayView
): "full" | "fullIncomplete" | undefined {
  if (display !== "full") return undefined;
  if (listMode === "yes") return "full";
  if (listMode === "no") return "fullIncomplete";
  return undefined;
}
