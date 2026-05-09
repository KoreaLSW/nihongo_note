"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setMemorized, setReviewed } from "@/app/actions/note";
import type { NoteRow } from "@/lib/note";

type Props = { row: NoteRow };

const MEMORIZED_CLASS =
  "inline-block w-fit rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
const NOT_MEMORIZED_CLASS =
  "inline-block w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";

export function QuizCard({ row }: Props) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);

  const handleCorrect = async () => {
    const fd = new FormData();
    fd.set("word", row.word);
    let ok = false;
    if (row.memorized === "yes") {
      const res = await setReviewed(fd);
      ok = res?.ok === true;
    } else {
      fd.set("value", "yes");
      const res = await setMemorized(fd);
      ok = res?.ok === true;
    }
    if (ok) setRevealed(false);
    router.refresh();
  };

  const handleWrong = async () => {
    const fd = new FormData();
    fd.set("word", row.word);
    fd.set("value", "no");
    const res = await setMemorized(fd);
    if (res?.ok) setRevealed(false);
    router.refresh();
  };

  return (
    <div className="flex min-h-[180px] flex-col items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex w-full flex-col items-center gap-2">
        <span
          className={
            row.memorized === "yes" ? MEMORIZED_CLASS : NOT_MEMORIZED_CLASS
          }
        >
          {row.memorized === "yes" ? "암기" : "미암기"}
        </span>
        <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          {row.word}
        </p>
      </div>
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-2 rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
        >
          정답확인
        </button>
      ) : (
        <>
          <p className="mt-2 w-full text-center text-sm text-zinc-600 dark:text-zinc-400">
            {row.meaning}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleCorrect}
              className="rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
            >
              정답
            </button>
            <button
              type="button"
              onClick={handleWrong}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 transition hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70"
            >
              틀림
            </button>
          </div>
        </>
      )}
    </div>
  );
}
