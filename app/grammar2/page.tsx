import Link from "next/link";
import { getGrammarWordbookList, getGrammarWordbookWords } from "@/lib/grammarWordbook";
import { CreateGrammarWordbookForm } from "./components/CreateGrammarWordbookForm";
import { WordbooksReorderPanel } from "./components/WordbooksReorderPanel";

export default async function Grammar2Page() {
  const wordbooks = await getGrammarWordbookList();
  const wordCounts = new Map<string, number>();
  for (const wb of wordbooks) {
    wordCounts.set(wb.id, (await getGrammarWordbookWords(wb.id)).length);
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        문법단어장
      </h1>

      <div className="mb-8">
        <CreateGrammarWordbookForm />
      </div>

      {wordbooks.length > 1 && <WordbooksReorderPanel wordbooks={wordbooks} />}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {wordbooks.length === 0 ? (
          <div className="col-span-full rounded-xl border-2 border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
            문법 단어장이 없습니다. 위에서 새 문법 단어장을 만들어 보세요.
          </div>
        ) : (
          wordbooks.map((wb) => (
            <div
              key={wb.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
            >
              <Link href={`/grammar2/${wb.id}`} className="flex flex-col">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {wb.name}
                </span>
                <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {wordCounts.get(wb.id) ?? 0}개 문법
                </span>
                <span className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                  {wb.file}
                </span>
              </Link>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/grammar2/${wb.id}`}
                  className="inline-flex w-fit items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
                >
                  열기
                </Link>
                <Link
                  href={`/grammar2/${wb.id}/quiz`}
                  className="inline-flex w-fit items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
                >
                  퀴즈
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

