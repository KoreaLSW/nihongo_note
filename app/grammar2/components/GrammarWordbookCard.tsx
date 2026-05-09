"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteFromGrammarWordbook } from "@/app/actions/grammarWordbook";

type Props = {
  wordbookId: string;
  row: {
    no: string;
    grammar: string;
    shape?: string;
    meaning: string;
    interpretation?: string;
    example?: string;
    created_at: string;
  };
  memorized?: string;
  memorized_at?: string;
};

export function GrammarWordbookCard({
  wordbookId,
  row,
  memorized = "no",
  memorized_at = "",
}: Props) {
  const router = useRouter();

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const fd = new FormData(e.currentTarget);
    const res = await deleteFromGrammarWordbook(fd);
    if (res?.ok) router.refresh();
  };

  return (
    <Link
      href={`/grammar2/${wordbookId}/${row.no}`}
      className="relative flex min-h-[150px] flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
    >
      <form
        onSubmit={handleDelete}
        className="absolute right-3 top-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <input type="hidden" name="wordbookId" value={wordbookId} />
        <input type="hidden" name="grammar" value={row.grammar} />
        <button
          type="submit"
          title="문법 단어장에서 삭제"
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
        >
          ×
        </button>
      </form>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
          {row.no}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
            memorized === "yes"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
          }`}
        >
          {memorized === "yes" ? "암기" : "미암기"}
        </span>
      </div>

      <div className="mt-2 flex flex-1 flex-col">
        <div className="truncate text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {row.grammar}
        </div>

        <div className="line-clamp-2 text-lg text-zinc-700 dark:text-zinc-300">
          뜻: {row.meaning?.trim() ? row.meaning : "—"}
        </div>

        <div className="mt-2 space-y-2">
          <div className="grid min-h-[2.75rem] grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="shrink-0">형태:</span>
            <span className="line-clamp-2 whitespace-pre-line">
              {row.shape?.trim() ? row.shape : "—"}
            </span>
          </div>

          <div className="grid min-h-[2.75rem] grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="shrink-0">해석:</span>
            <span className="line-clamp-2 whitespace-pre-line">
              {row.interpretation?.trim() ? row.interpretation : "—"}
            </span>
          </div>

          <div className="grid min-h-[2.75rem] grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="shrink-0">예문:</span>
            <span className="line-clamp-2 whitespace-pre-line">
              {row.example?.trim() ? row.example : "—"}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-1.5">
          {row.created_at && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              추가: {row.created_at}
            </div>
          )}
          {memorized_at && memorized === "yes" && (
            <div className="text-xs text-amber-700 dark:text-amber-300">
              암기일시: {memorized_at}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

