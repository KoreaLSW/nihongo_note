import Link from "next/link";
import { QuizSeedSync } from "@/app/quiz/components/QuizSeedSync";
import { JlptQuizCard } from "../../[id]/quiz/components/JlptQuizCard";
import {
  appendJlptWordbookFilterToSearchParams,
  canonicalizeWordbookIdsForUrl,
  getJlptLevelAllWordsFlatRows,
  resolveJlptLevelWordbookIdsForAllWords,
} from "@/lib/jlptWordbookAllWords";
import { parseJlptWordbookAllWordsMemorizedParam } from "@/lib/jlptWordbookAllWordsNav";
import { getJlptKanjiLinesForWord } from "@/lib/kanji";
import { JLPT_LEVELS, normalizeJlptLevel } from "@/lib/jlptWordbook";
import {
  filterJlptWordbookRowsForQuiz,
  jlptQuizCardVariantForFullRow,
  jlptQuizDisplayViewToCardView,
  parseJlptQuizDisplayViewParam,
  type JlptMemorizedListMode,
  type JlptQuizDisplayView,
} from "@/lib/jlptWordbookShared";

type Props = {
  searchParams?: Promise<{
    level?: string;
    memorized?: string;
    view?: string;
    seed?: string;
    wb?: string | string[];
    nowb?: string | string[];
  }>;
};

function pickNowb(raw: string | string[] | undefined): "1" | undefined {
  if (raw === undefined) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === "1" ? "1" : undefined;
}

function seededStableSort<T>(arr: T[], seed: string, keyFn: (item: T) => string): T[] {
  const copy = [...arr];
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return h >>> 0;
  };

  return copy.sort((a, b) => {
    const ha = hash(`${seed}:${keyFn(a)}`);
    const hb = hash(`${seed}:${keyFn(b)}`);
    return ha - hb;
  });
}

function generateSeed(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function buildQuizHref(
  level: string,
  seed: string,
  opts: {
    memorized?: JlptMemorizedListMode;
    view?: JlptQuizDisplayView;
    wordbookIds?: string[] | undefined;
  }
) {
  const params = new URLSearchParams();
  params.set("level", level);
  params.set("seed", seed);
  const m = opts.memorized ?? "all";
  if (m !== "all") params.set("memorized", m);
  const v = opts.view ?? "word";
  if (v !== "word") params.set("view", v);
  appendJlptWordbookFilterToSearchParams(params, opts.wordbookIds);
  return `/jlpt-wordbook/all-words/quiz?${params.toString()}`;
}

export default async function JlptWordbookAllWordsQuizPage({ searchParams }: Props) {
  const qp = searchParams ? await searchParams : undefined;
  const selectedLevel = normalizeJlptLevel(qp?.level || "n5");
  const memorizedMode = parseJlptWordbookAllWordsMemorizedParam(qp?.memorized);
  const quizDisplayView = parseJlptQuizDisplayViewParam(qp?.view);
  const seed = qp?.seed ?? generateSeed();

  const { wordbookIds: resolvedWordbookIds } = resolveJlptLevelWordbookIdsForAllWords(
    selectedLevel,
    { wb: qp?.wb, nowb: pickNowb(qp?.nowb) }
  );
  const wordbookIdsForUrl = canonicalizeWordbookIdsForUrl(
    selectedLevel,
    resolvedWordbookIds
  );

  const flat = getJlptLevelAllWordsFlatRows(selectedLevel, {
    wordbookIds: resolvedWordbookIds,
  });
  const words = filterJlptWordbookRowsForQuiz(flat, memorizedMode, quizDisplayView);
  const rows = seededStableSort(words, seed, (w) => `${w.wordbookId}:${w.no}:${w.word}`);

  const cardQuizView = jlptQuizDisplayViewToCardView(quizDisplayView);

  const makeHref = (opts: {
    memorized?: JlptMemorizedListMode;
    view?: JlptQuizDisplayView;
  }) =>
    buildQuizHref(selectedLevel, seed, {
      memorized: opts.memorized ?? memorizedMode,
      view: opts.view ?? quizDisplayView,
      wordbookIds: wordbookIdsForUrl,
    });

  const backParams = new URLSearchParams();
  backParams.set("level", selectedLevel);
  if (memorizedMode !== "all") backParams.set("memorized", memorizedMode);
  appendJlptWordbookFilterToSearchParams(backParams, wordbookIdsForUrl);
  const backToAllWordsHref = `/jlpt-wordbook/all-words?${backParams.toString()}`;

  const scopeNote =
    resolvedWordbookIds === undefined
      ? "모든 단어장"
      : resolvedWordbookIds.length === 0
        ? "선택된 단어장 없음"
        : `선택된 단어장 ${resolvedWordbookIds.length}개`;

  return (
    <div className="p-8">
      <QuizSeedSync seed={seed} />
      <Link
        href={backToAllWordsHref}
        className="mb-4 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← {selectedLevel.toUpperCase()} 레벨 전체 단어
      </Link>

      <h1 className="mb-3 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        JLPT 레벨 전체 퀴즈
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        {selectedLevel.toUpperCase()} · {scopeNote} · {words.length}개
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {JLPT_LEVELS.map((level) => {
          const isActive = selectedLevel === level;
          const idsForLevel = canonicalizeWordbookIdsForUrl(
            level,
            resolveJlptLevelWordbookIdsForAllWords(level, {
              wb: qp?.wb,
              nowb: pickNowb(qp?.nowb),
            }).wordbookIds
          );
          return (
            <Link
              key={level}
              href={buildQuizHref(level, seed, {
                memorized: memorizedMode,
                view: quizDisplayView,
                wordbookIds: idsForLevel,
              })}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/50 dark:text-emerald-100"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {level.toUpperCase()}
            </Link>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">퀴즈 모드:</span>
        {(
          [
            ["all", "전체"],
            ["yes", "암기 단어"],
            ["no", "미암기 단어"],
          ] as const
        ).map(([mode, label]) => {
          const isActive = memorizedMode === mode;
          return (
            <Link
              key={mode}
              href={makeHref({ memorized: mode })}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <p className="mb-6 max-w-xl text-xs text-zinc-500 dark:text-zinc-400">
        암기 단어: 순수 한 축 암기 또는 전체 암기. 미암기 단어: 해당 축 미암기 또는 세 축 미완(전체 미암기). 정답/틀림은 카드
        축만 갱신합니다.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">표시 모드:</span>
        {(
          memorizedMode === "yes"
            ? ([
                ["word", "단어만보기"],
                ["meaning", "뜻만보기"],
                ["hiragana", "히라가나만보기"],
                ["full", "전체 암기"],
              ] as const)
            : memorizedMode === "no"
              ? ([
                  ["word", "단어만보기"],
                  ["meaning", "뜻만보기"],
                  ["hiragana", "히라가나만보기"],
                  ["full", "전체 미암기"],
                ] as const)
              : ([
                  ["word", "단어만보기"],
                  ["meaning", "뜻만보기"],
                  ["hiragana", "히라가나만보기"],
                ] as const)
        ).map(([id, label]) => {
          const viewId = id as JlptQuizDisplayView;
          const isActive = quizDisplayView === viewId;
          return (
            <Link
              key={id}
              href={makeHref({ view: viewId })}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 py-16 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
          해당 조건의 단어가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {rows.map((row) => (
            <JlptQuizCard
              key={`${row.wordbookId}-${row.no}-${row.word}`}
              row={row}
              wordbookId={row.wordbookId}
              quizView={cardQuizView}
              variant={jlptQuizCardVariantForFullRow(memorizedMode, quizDisplayView)}
              kanjiLines={getJlptKanjiLinesForWord(row.word)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
