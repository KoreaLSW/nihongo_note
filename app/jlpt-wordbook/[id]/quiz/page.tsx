import Link from "next/link";
import {
  filterJlptWordbookRowsForQuiz,
  jlptQuizCardVariantForFullRow,
  jlptQuizDisplayViewToCardView,
  parseJlptMemorizedListParam,
  parseJlptQuizDisplayViewParam,
  type JlptMemorizedListMode,
  type JlptQuizDisplayView,
} from "@/lib/jlptWordbookShared";
import { getJlptKanjiLinesForWord } from "@/lib/kanji";
import { getJlptWordbookMeta, getJlptWordbookWords } from "@/lib/jlptWordbook";
import { JlptQuizCard } from "./components/JlptQuizCard";
import { QuizSeedSync } from "@/app/quiz/components/QuizSeedSync";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ memorized?: string; view?: string; seed?: string }>;
};

function seededStableSort<T>(
  arr: T[],
  seed: string,
  keyFn: (item: T) => string
): T[] {
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

export default async function JlptWordbookQuizPage({ params, searchParams }: Props) {
  const { id } = await params;
  const qp = searchParams ? await searchParams : undefined;
  const memorizedFilter = parseJlptMemorizedListParam(qp?.memorized);
  const quizDisplayView = parseJlptQuizDisplayViewParam(qp?.view);
  const seed = qp?.seed ?? generateSeed();

  const meta = await getJlptWordbookMeta(id);
  if (!meta) {
    return (
      <div className="p-8">
        <p className="text-zinc-600 dark:text-zinc-400">단어장을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const allWords = await getJlptWordbookWords(id);
  const words = filterJlptWordbookRowsForQuiz(allWords, memorizedFilter, quizDisplayView);
  const rows = seededStableSort(words, seed, (w) => `${w.no}:${w.word}`);

  const cardQuizView = jlptQuizDisplayViewToCardView(quizDisplayView);

  const makeHref = (opts: {
    memorized?: JlptMemorizedListMode;
    view?: JlptQuizDisplayView;
  }) => {
    const params = new URLSearchParams();
    const m = opts.memorized ?? memorizedFilter;
    const v = opts.view ?? quizDisplayView;
    params.set("seed", seed);
    if (m !== "all") params.set("memorized", m);
    if (v !== "word") params.set("view", v);
    const qs = params.toString();
    return qs ? `/jlpt-wordbook/${id}/quiz?${qs}` : `/jlpt-wordbook/${id}/quiz`;
  };

  return (
    <div className="p-8">
      <QuizSeedSync seed={seed} />
      <Link
        href={`/jlpt-wordbook/${id}`}
        className="mb-4 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← {meta.name}
      </Link>

      <h1 className="mb-3 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        JLPT 단어장 퀴즈
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        {meta.level.toUpperCase()} · {meta.name} · {words.length}개
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">퀴즈 모드:</span>
        {(
          [
            ["all", "전체"],
            ["yes", "암기 단어"],
            ["no", "미암기 단어"],
          ] as const
        ).map(([mode, label]) => {
          const isActive = memorizedFilter === mode;
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
        암기 단어: 해당 축만 순수 암기한 단어 또는 전체 암기. 미암기 단어: 해당 축이 미암기인 단어 또는 세 축을 아직 다
        못 외운 단어(전체 미암기). 정답/틀림은 카드에 표시된 축만 갱신합니다.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">표시 모드:</span>
        {(
          memorizedFilter === "yes"
            ? ([
                ["word", "단어만보기"],
                ["meaning", "뜻만보기"],
                ["hiragana", "히라가나만보기"],
                ["full", "전체 암기"],
              ] as const)
            : memorizedFilter === "no"
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
              key={`${row.no}-${row.word}`}
              row={row}
              wordbookId={id}
              quizView={cardQuizView}
              variant={jlptQuizCardVariantForFullRow(memorizedFilter, quizDisplayView)}
              kanjiLines={getJlptKanjiLinesForWord(row.word)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
