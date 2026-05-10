import Link from "next/link";
import {
  getVocabularyWordCountsByWordbookId,
  getWordbookList,
} from "@/lib/wordbook";
import { CreateWordbookForm } from "./components/CreateWordbookForm";
import { WordbooksReorderPanel } from "./components/WordbooksReorderPanel";

export default async function Vocabulary2Page() {
  const [wordbooks, wordCounts] = await Promise.all([
    getWordbookList(),
    getVocabularyWordCountsByWordbookId(),
  ]);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        한자단어장
      </h1>

      <div className="mb-8">
        <CreateWordbookForm />
      </div>

      {wordbooks.length > 0 ? (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            전체 단어장 퀴즈:
          </span>
          <Link
            href="/quiz?allVocabulary2=1"
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700"
          >
            전체
          </Link>
          <Link
            href="/quiz?allVocabulary2=1&memorized=yes"
            className="inline-flex items-center justify-center rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
          >
            암기 단어 퀴즈
          </Link>
          <Link
            href="/quiz?allVocabulary2=1&memorized=no"
            className="inline-flex items-center justify-center rounded-xl border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            미암기 단어 퀴즈
          </Link>
        </div>
      ) : null}

      {wordbooks.length > 0 ? (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            전체 단어 목록:
          </span>
          <Link
            href="/vocabulary2/all-words"
            className="inline-flex items-center justify-center rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            전체
          </Link>
          <Link
            href="/vocabulary2/all-words?memorized=yes"
            className="inline-flex items-center justify-center rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
          >
            암기 단어
          </Link>
          <Link
            href="/vocabulary2/all-words?memorized=no"
            className="inline-flex items-center justify-center rounded-xl border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            미암기 단어
          </Link>
        </div>
      ) : null}

      <WordbooksReorderPanel wordbooks={wordbooks} />

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {wordbooks.length === 0 ? (
          <div className="col-span-full rounded-xl border-2 border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
            단어장이 없습니다. 위에서 새 단어장을 만들어 보세요.
          </div>
        ) : (
          wordbooks.map((wb) => (
            <div
              key={wb.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
            >
              <Link
                href={`/vocabulary2/${wb.id}`}
                className="flex flex-col"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {wb.name}
                </span>
                <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {wordCounts.get(wb.id) ?? 0}개 단어
                </span>
                <span className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                  {wb.file}
                </span>
              </Link>
              <Link
                href={`/quiz?wordbookId=${wb.id}`}
                className="mt-3 inline-flex w-fit items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                퀴즈풀기
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
