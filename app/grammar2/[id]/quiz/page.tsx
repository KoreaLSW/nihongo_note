import Link from "next/link";
import { notFound } from "next/navigation";
import { getGrammarWordbookMeta, getGrammarWordbookWords } from "@/lib/grammarWordbook";
import { GrammarQuizCard } from "./components/GrammarQuizCard";
import { QuizSeedSync } from "@/app/quiz/components/QuizSeedSync";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ memorized?: string; seed?: string }>;
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
  return copy.sort((a, b) => hash(`${seed}:${keyFn(a)}`) - hash(`${seed}:${keyFn(b)}`));
}

function generateSeed(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default async function GrammarWordbookQuizPage({ params, searchParams }: Props) {
  const { id } = await params;
  const qp = searchParams ? await searchParams : undefined;
  const memorizedFilter = qp?.memorized ?? "all";
  const seed = qp?.seed ?? generateSeed();

  const meta = await getGrammarWordbookMeta(id);
  if (!meta) notFound();

  const allRows = (await getGrammarWordbookWords(id)).map((row) => {
    return {
      ...row,
      memorized: row.memorized === "yes" ? "yes" : "no",
    } as const;
  });
  const filtered =
    memorizedFilter === "all"
      ? allRows
      : allRows.filter((r) => r.memorized === memorizedFilter);
  const rows = seededStableSort(filtered, seed, (r) => `${r.no}:${r.grammar}`);

  const makeHref = (mode: "all" | "yes" | "no") => {
    const params = new URLSearchParams();
    params.set("seed", seed);
    if (mode !== "all") params.set("memorized", mode);
    return `/grammar2/${id}/quiz?${params.toString()}`;
  };

  return (
    <div className="p-8">
      <QuizSeedSync seed={seed} />
      <Link
        href={`/grammar2/${id}`}
        className="mb-4 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← {meta.name}
      </Link>

      <h1 className="mb-3 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        문법단어장 퀴즈
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        {meta.name} · {rows.length}개
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">퀴즈 모드:</span>
        {(["all", "yes", "no"] as const).map((mode) => {
          const label = mode === "all" ? "전체" : mode === "yes" ? "암기 문법" : "미암기 문법";
          const isActive = memorizedFilter === mode;
          return (
            <Link
              key={mode}
              href={makeHref(mode)}
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
          해당 조건의 문법이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {rows.map((row) => (
            <GrammarQuizCard
              key={`${row.no}-${row.grammar}`}
              wordbookId={id}
              row={row}
              memorized={row.memorized}
            />
          ))}
        </div>
      )}
    </div>
  );
}
