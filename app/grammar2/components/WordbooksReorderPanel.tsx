"use client";

import { useId, useState } from "react";
import type { GrammarWordbookMeta } from "@/lib/grammarWordbook";
import { WordbooksReorderList } from "./WordbooksReorderList";

type Props = {
  wordbooks: GrammarWordbookMeta[];
};

export function WordbooksReorderPanel({ wordbooks }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            문법단어장 순서 변경
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            드래그 후 저장
          </p>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/20 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {open ? "숨기기" : "보기"}
        </button>
      </div>

      <div id={panelId} className={open ? "mt-4" : "mt-4 hidden"}>
        <WordbooksReorderList initialWordbooks={wordbooks} />
      </div>
    </div>
  );
}

