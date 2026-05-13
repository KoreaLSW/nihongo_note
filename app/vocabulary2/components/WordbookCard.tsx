"use client";

import { useRouter } from "next/navigation";
import { deleteFromWordbook } from "@/app/actions/wordbook";
import { setMemorized, setReviewed } from "@/app/actions/note";
import type { WordbookRow } from "@/lib/wordbook";
import type { Vocabulary2AllWordsMemorizedMode } from "@/lib/vocabulary2AllWordsNav";
import { vocabulary2AllWordsDetailQuery } from "@/lib/vocabulary2AllWordsNav";

type Props = {
  wordbookId: string;
  row: WordbookRow;
  /** 전체 목록 등에서 어떤 단어장에 속하는지 카드 오른쪽 위에 표시 */
  wordbookName?: string;
  /** 설정 시 상세·이전/다음이 전체 목록(all-words) 순서와 동일하게 동작 */
  allWordsMemorizedMode?: Vocabulary2AllWordsMemorizedMode;
  onyomi?: string;
  kunyomi?: string;
  shapeExplanation?: string;
  memorized?: string;
  memorized_at?: string;
  reviewed_at?: string;
};

export function WordbookCard({
  wordbookId,
  row,
  wordbookName,
  allWordsMemorizedMode,
  onyomi,
  kunyomi,
  shapeExplanation,
  memorized = "no",
  memorized_at = "",
  reviewed_at = "",
}: Props) {
  const router = useRouter();

  const handleMemorized = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await setMemorized(fd);
    if (res?.ok) router.refresh();
  };

  const handleReviewed = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await setReviewed(fd);
    if (res?.ok) router.refresh();
  };

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await deleteFromWordbook(fd);
    if (res?.ok) router.refresh();
  };

  const levelClass: Record<string, string> = {
    N5: "inline-block w-fit rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    N4: "inline-block w-fit rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
    N3: "inline-block w-fit rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    N2: "inline-block w-fit rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
    N1: "inline-block w-fit rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
  };
  const levelStyle =
    levelClass[row.level?.toUpperCase() ?? ""] ??
    "inline-block w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";

  const detailSuffix =
    allWordsMemorizedMode != null
      ? vocabulary2AllWordsDetailQuery(allWordsMemorizedMode)
      : "";
  const detailHref = `/vocabulary2/${wordbookId}/${row.no}${detailSuffix}`;

  return (
    <div
      role="link"
      tabIndex={0}
      className="relative flex min-h-[160px] cursor-pointer flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
      onClick={() => router.push(detailHref)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(detailHref);
        }
      }}
    >
      <form
        onSubmit={handleDelete}
        className="absolute right-3 top-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <input type="hidden" name="wordbookId" value={wordbookId} />
        <input type="hidden" name="word" value={row.word} />
        <button
          type="submit"
          title="단어장에서 삭제"
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-100 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-900/40 dark:hover:text-red-400"
        >
          ×
        </button>
      </form>
      <div>
        {wordbookName ? (
          <div className="mb-2 flex min-h-6 items-start justify-end pr-10">
            <button
              type="button"
              title={wordbookName}
              className="max-w-[75%] cursor-pointer truncate border-0 bg-transparent p-0 text-right text-xs font-semibold text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/vocabulary2/${wordbookId}`);
              }}
            >
              {wordbookName}
            </button>
          </div>
        ) : null}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
            {row.no}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              memorized === "yes"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
            }`}
          >
            {memorized === "yes" ? "암기" : "미암기"}
          </span>
        </div>
        <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          {row.word}
        </p>
        <p className="mt-1 line-clamp-2 text-xl text-zinc-700 dark:text-zinc-300">
          {row.meaning}
        </p>
        {(onyomi || kunyomi) && (
          <div className="mt-1 space-y-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            {onyomi && <p>음독: {onyomi}</p>}
            {kunyomi && <p>훈독: {kunyomi}</p>}
          </div>
        )}
        {shapeExplanation && (
          <p className="mt-3 line-clamp-3 text-xs text-zinc-500 dark:text-zinc-400">
            {shapeExplanation}
          </p>
        )}
        {row.reading && (
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            {row.reading}
          </p>
        )}
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span className={levelStyle}>{row.level}</span>
          {row.created_at && <span>추가: {row.created_at}</span>}
          {memorized_at && (
            <span className="text-emerald-600 dark:text-emerald-400">
              암기: {memorized_at}
            </span>
          )}
          {reviewed_at && (
            <span className="text-amber-600 dark:text-amber-400">
              복습: {reviewed_at}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleMemorized} className="inline">
            <input type="hidden" name="wordbookId" value={wordbookId} />
            <input type="hidden" name="no" value={row.no} />
            <input type="hidden" name="word" value={row.word} />
            <input
              type="hidden"
              name="value"
              value={memorized === "yes" ? "no" : "yes"}
            />
            <button
              type="submit"
              className="rounded bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              {memorized === "yes" ? "미암기" : "암기"}
            </button>
          </form>
          <form onSubmit={handleReviewed} className="inline">
            <input type="hidden" name="wordbookId" value={wordbookId} />
            <input type="hidden" name="no" value={row.no} />
            <input type="hidden" name="word" value={row.word} />
            <button
              type="submit"
              className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900/70"
            >
              복습함
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
