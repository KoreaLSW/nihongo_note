"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setGrammarMemorizedAction } from "@/app/actions/grammarWordbook";

type Props = {
  row: {
    grammar: string;
    meaning: string;
    shape?: string;
    interpretation?: string;
    example?: string;
  };
  memorized: "yes" | "no";
};

const MEMORIZED_CLASS =
  "inline-block w-fit rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
const NOT_MEMORIZED_CLASS =
  "inline-block w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";

export function GrammarQuizCard({ row, memorized }: Props) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);

  const setMemorized = async (value: "yes" | "no") => {
    const fd = new FormData();
    fd.set("grammar", row.grammar);
    fd.set("value", value);
    await setGrammarMemorizedAction(fd);
    router.refresh();
  };

  return (
    <div className="flex min-h-[220px] flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex w-full flex-col items-start gap-2">
        <span className={memorized === "yes" ? MEMORIZED_CLASS : NOT_MEMORIZED_CLASS}>
          {memorized === "yes" ? "암기" : "미암기"}
        </span>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{row.grammar}</p>
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-3 w-fit rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
        >
          정답확인
        </button>
      ) : (
        <div className="mt-3 w-full">
          <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-1">
              <span className="shrink-0">뜻:</span>
              <span className="whitespace-pre-line">{row.meaning || "-"}</span>
            </div>
            <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-1">
              <span className="shrink-0">형태:</span>
              <span className="whitespace-pre-line">{row.shape || "-"}</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMemorized("yes")}
              className="rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
            >
              정답
            </button>
            <button
              type="button"
              onClick={() => setMemorized("no")}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 transition hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70"
            >
              틀림
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
