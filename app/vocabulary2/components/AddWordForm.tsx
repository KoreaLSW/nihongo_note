"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { insertToWordbook } from "@/app/actions/wordbook";

type Props = { wordbookId: string };

export function AddWordForm({ wordbookId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [reading, setReading] = useState("");
  const [level, setLevel] = useState("N5");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("wordbookId", wordbookId);
    const res = await insertToWordbook(fd);
    setPending(false);
    if (res?.ok) {
      setWord("");
      setMeaning("");
      setReading("");
      router.refresh();
    } else {
      setError(res?.error ?? "추가 실패");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
    >
      <input type="hidden" name="wordbookId" value={wordbookId} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          한자/단어
        </span>
        <input
          type="text"
          name="word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          required
          className="w-24 rounded border border-zinc-300 bg-white px-2 py-1.5 text-lg dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          뜻
        </span>
        <input
          type="text"
          name="meaning"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          required
          className="w-40 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          읽기
        </span>
        <input
          type="text"
          name="reading"
          value={reading}
          onChange={(e) => setReading(e.target.value)}
          className="w-32 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          레벨
        </span>
        <select
          name="level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {["N5", "N4", "N3", "N2", "N1"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
      >
        추가
      </button>
      {error && (
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      )}
    </form>
  );
}
