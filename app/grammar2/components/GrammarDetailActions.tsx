"use client";

import { useRouter } from "next/navigation";
import { setGrammarMemorizedAction } from "@/app/actions/grammarWordbook";

type Props = {
  row: {
    grammar: string;
    meaning: string;
    memorized: string;
    memorized_at: string;
  };
};

export function GrammarDetailActions({ row }: Props) {
  const router = useRouter();

  const handleMemorizedToggle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await setGrammarMemorizedAction(fd);
    if (res?.ok) router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <form onSubmit={handleMemorizedToggle} className="inline">
        <input type="hidden" name="grammar" value={row.grammar} />
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
    </div>
  );
}

