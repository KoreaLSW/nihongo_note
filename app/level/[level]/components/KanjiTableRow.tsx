"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFromNote, insertToNote, setMemorized } from "@/app/actions/note";
import type { KanjiRow } from "@/lib/kanji";
import type { WordbookMeta } from "@/lib/wordbook";
import { Wordbook2InsertDropdown } from "./Wordbook2InsertDropdown";

type Props = {
  row: KanjiRow;
  level: string;
  isInVocabulary: boolean;
  isMemorized: boolean;
  wordbooks: WordbookMeta[];
  includedWordbookIds: string[];
};

export function KanjiTableRow({
  row,
  level,
  isInVocabulary,
  isMemorized,
  wordbooks,
  includedWordbookIds,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const kanjiLevel = row.level || level.toUpperCase();

  const handleInsert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await insertToNote(fd);
    setPending(false);
    if (res?.ok) router.refresh();
  };

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await deleteFromNote(fd);
    setPending(false);
    if (res?.ok) router.refresh();
  };

  const handleMemorizedToggle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await setMemorized(fd);
    setPending(false);
    if (res?.ok) router.refresh();
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/level/${level}/kanji/${row.no}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/level/${level}/kanji/${row.no}`);
        }
      }}
      className="cursor-pointer border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
    >
      <td className="px-4 py-3 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {row.no}
      </td>
      <td className="px-4 py-3 text-xl font-medium text-zinc-900 dark:text-zinc-100">
        {row.kanji}
      </td>
      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
        {row.meaning_quoted}
      </td>
      <td
        className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleMemorizedToggle} className="inline">
          <input type="hidden" name="word" value={row.kanji} />
          <input
            type="hidden"
            name="value"
            value={isMemorized ? "no" : "yes"}
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded px-2 py-1 text-left text-sm font-medium transition hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            {isMemorized ? "암기" : "미암기"}
          </button>
        </form>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {isInVocabulary ? (
          <form onSubmit={handleDelete} className="inline">
            <input type="hidden" name="word" value={row.kanji} />
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
            >
              Delete
            </button>
          </form>
        ) : (
          <form onSubmit={handleInsert} className="inline">
            <input type="hidden" name="word" value={row.kanji} />
            <input type="hidden" name="meaning" value={row.meaning_quoted} />
            <input type="hidden" name="level" value={kanjiLevel} />
            <input type="hidden" name="reading" value="" />
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              Insert
            </button>
          </form>
        )}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Wordbook2InsertDropdown
          wordbooks={wordbooks}
          includedWordbookIds={includedWordbookIds}
          word={row.kanji}
          meaning={row.meaning_quoted}
          level={kanjiLevel}
        />
      </td>
    </tr>
  );
}
