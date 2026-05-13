import Link from "next/link";
import { getNotesByLevel } from "@/lib/note";
import type { NoteRow } from "@/lib/note";
import {
  getWordbookList,
  getWordbookMeta,
  getWordbookWords,
} from "@/lib/wordbook";
import { QuizCard } from "./components/QuizCard";
import { QuizSeedSync } from "./components/QuizSeedSync";

const LEVELS = ["all", "N5", "N4", "N3", "N2", "N1"] as const;
const PER_PAGE = 10;
const PAGE_GROUP = 10;

/** 시드 기반 셔플 (같은 시드 → 같은 순서) */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return h >>> 0;
  };
  const mulberry32 = (a: number) => () => ((a = (a + 0x6d2b79f5) | 0), (a >>> 0) / 0x100000000);
  const rng = mulberry32(hash(seed));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateSeed(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{
    level?: string;
    memorized?: string;
    page?: string;
    seed?: string;
    wordbookId?: string;
    allVocabulary2?: string;
  }>;
}) {
  const {
    level: levelParam,
    memorized: memorizedParam,
    page: pageParam,
    seed: seedParam,
    wordbookId,
    allVocabulary2: allVocabulary2Param,
  } = await searchParams;
  const allVocabulary2 =
    allVocabulary2Param === "1" || allVocabulary2Param === "true";
  const currentLevel = (levelParam ?? "all").toLowerCase();
  const currentMemorized = memorizedParam ?? "all";
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const seed = seedParam ?? generateSeed();

  let allRows: NoteRow[];
  let wordbookMeta: Awaited<ReturnType<typeof getWordbookMeta>> = null;

  const mapWordbookRow = (
    r: {
      no: string;
      word: string;
      reading?: string;
      meaning?: string;
      level?: string;
      created_at?: string;
      memorized?: string;
      memorized_at?: string;
      reviewed_at?: string;
    },
    wbId?: string
  ): NoteRow => {
    const base: NoteRow = {
      no: r.no,
      word: r.word,
      reading: r.reading ?? "",
      meaning: r.meaning ?? "",
      level: r.level ?? "",
      created_at: r.created_at ?? "",
      memorized: r.memorized ?? "no",
      memorized_at: r.memorized_at ?? "",
      reviewed_at: r.reviewed_at ?? "",
    };
    return wbId ? { ...base, wordbookId: wbId } : base;
  };

  if (wordbookId) {
    const [meta, words] = await Promise.all([
      getWordbookMeta(wordbookId),
      getWordbookWords(wordbookId),
    ]);
    wordbookMeta = meta;
    allRows = meta ? words.map((r) => mapWordbookRow(r, wordbookId)) : [];
    const levelUpper = currentLevel === "all" ? "" : currentLevel.toUpperCase();
    if (levelUpper) {
      allRows = allRows.filter((r) => (r.level ?? "").toUpperCase() === levelUpper);
    }
  } else if (allVocabulary2) {
    const wbs = await getWordbookList();
    const batches = await Promise.all(wbs.map((wb) => getWordbookWords(wb.id)));
    allRows = [];
    for (let i = 0; i < wbs.length; i++) {
      const wbId = wbs[i].id;
      for (const r of batches[i]) {
        allRows.push(mapWordbookRow(r, wbId));
      }
    }
    const levelUpper = currentLevel === "all" ? "" : currentLevel.toUpperCase();
    if (levelUpper) {
      allRows = allRows.filter((r) => (r.level ?? "").toUpperCase() === levelUpper);
    }
  } else {
    allRows = await getNotesByLevel(
      currentLevel === "all" ? undefined : currentLevel.toUpperCase()
    );
  }

  const filtered =
    currentMemorized === "all"
      ? allRows
      : allRows.filter((r) => r.memorized === currentMemorized);
  const shuffled = seededShuffle(filtered, seed);

  const total = shuffled.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * PER_PAGE;
  const rows = shuffled.slice(start, start + PER_PAGE);

  const startPage =
    Math.floor((currentPage - 1) / PAGE_GROUP) * PAGE_GROUP + 1;
  const endPage = Math.min(startPage + PAGE_GROUP - 1, totalPages);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  const buildUrl = (
    p: number,
    opts?: { level?: string; memorized?: string; keepSeed?: boolean }
  ) => {
    const params = new URLSearchParams();
    if (wordbookId) params.set("wordbookId", wordbookId);
    if (allVocabulary2) params.set("allVocabulary2", "1");
    const lvl = opts?.level ?? currentLevel;
    const memo = opts?.memorized ?? currentMemorized;
    if (lvl !== "all") params.set("level", lvl);
    if (memo !== "all") params.set("memorized", memo);
    if (opts?.keepSeed !== false) params.set("seed", seed);
    if (p > 1) params.set("page", String(p));
    return `/quiz?${params}`;
  };

  return (
    <div className="p-8">
      <QuizSeedSync seed={seed} />
      {wordbookMeta && (
        <Link
          href={`/vocabulary2/${wordbookId}`}
          className="mb-4 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          ← {wordbookMeta.name} 단어장
        </Link>
      )}
      {allVocabulary2 && !wordbookId && (
        <Link
          href="/vocabulary2"
          className="mb-4 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          ← 한자단어장
        </Link>
      )}
      <h1 className="mb-6 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        퀴즈
        {wordbookMeta && (
          <span className="ml-2 text-lg font-normal text-zinc-500 dark:text-zinc-400">
            · 한자단어장: {wordbookMeta.name}
          </span>
        )}
        {allVocabulary2 && !wordbookId && (
          <span className="ml-2 text-lg font-normal text-zinc-500 dark:text-zinc-400">
            · 한자단어장 전체
          </span>
        )}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          레벨 선택:
        </span>
        {LEVELS.map((level) => {
          const isActive =
            (currentLevel === "all" && level === "all") ||
            currentLevel === level.toLowerCase();
          const href = buildUrl(1, { level: level.toLowerCase(), memorized: currentMemorized, keepSeed: false });
          return (
            <Link
              key={level}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {level === "all" ? "All" : level}
            </Link>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          퀴즈 모드:
        </span>
        {(["all", "yes", "no"] as const).map((mode) => {
          const labels = { all: "전체", yes: "암기 단어 퀴즈", no: "미암기 단어 퀴즈" };
          const isActive = currentMemorized === mode;
          const href = buildUrl(1, { level: currentLevel, memorized: mode, keepSeed: false });
          return (
            <Link
              key={mode}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {labels[mode]}
            </Link>
          );
        })}
      </div>

      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        {wordbookMeta || allVocabulary2 ? "한자단어장" : "단어장"} 기준 · 선택한 레벨:{" "}
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          {currentLevel === "all" ? "All" : currentLevel.toUpperCase()}
        </span>{" "}
        · {total}개
      </p>

      {rows.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 py-16 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
          해당 조건의 단어가 없습니다. 단어장에 단어를 추가해 보세요.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {rows.map((row, idx) => (
              <QuizCard
                key={`${seed}-${start + idx}-${row.word}-${row.no}-${row.created_at}-${row.memorized}`}
                row={row}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
              aria-label="페이지 이동"
            >
              {currentPage > 1 && (
                <Link
                  href={buildUrl(currentPage - 1)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  이전
                </Link>
              )}
              <span className="flex items-center gap-2 px-2">
                {pageNumbers.map((p) =>
                  p === currentPage ? (
                    <span
                      key={p}
                      className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg bg-zinc-800 font-semibold tabular-nums text-white dark:bg-zinc-200 dark:text-zinc-900"
                    >
                      {p}
                    </span>
                  ) : (
                    <Link
                      key={p}
                      href={buildUrl(p)}
                      className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-zinc-300 text-sm font-semibold tabular-nums text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {p}
                    </Link>
                  )
                )}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={buildUrl(Math.min(currentPage + PAGE_GROUP, totalPages))}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  다음
                </Link>
              )}
            </nav>
          )}

          <p className="mt-4 text-center text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
            {total > 0 &&
              `${(currentPage - 1) * PER_PAGE + 1}-${Math.min(currentPage * PER_PAGE, total)} / ${total}`}
          </p>
        </>
      )}
    </div>
  );
}
