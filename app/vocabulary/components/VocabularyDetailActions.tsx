"use client";

import { useRouter } from "next/navigation";
import { setMemorized, setReviewed } from "@/app/actions/note";
import type { NoteRow } from "@/lib/note";

type Props = { row: NoteRow };

export function VocabularyDetailActions({ row }: Props) {
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

  return (
    <div className="flex flex-wrap gap-2">
      <form onSubmit={handleMemorized} className="inline">
        <input type="hidden" name="word" value={row.word} />
        <input
          type="hidden"
          name="value"
          value={row.memorized === "yes" ? "no" : "yes"}
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
        >
          {row.memorized === "yes" ? "미암기로 변경" : "암기로 변경"}
        </button>
      </form>
      <form onSubmit={handleReviewed} className="inline">
        <input type="hidden" name="word" value={row.word} />
        <button
          type="submit"
          className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900/70"
        >
          복습함
        </button>
      </form>
    </div>
  );
}
