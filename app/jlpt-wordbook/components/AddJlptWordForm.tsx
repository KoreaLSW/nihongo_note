"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { insertToJlptWordbookAction } from "@/app/actions/jlptWordbook";

type Props = {
  wordbookId: string;
};

export function AddJlptWordForm({ wordbookId }: Props) {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [hiragana, setHiragana] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const res = await insertToJlptWordbookAction(new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setWord("");
      setMeaning("");
      setHiragana("");
      router.refresh();
    } else {
      setError(res?.error ?? "추가 실패");
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="wordbookId" value={wordbookId} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">단어</span>
        <input
          type="text"
          name="word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="예: 勉強"
          className="w-40 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">뜻</span>
        <input
          type="text"
          name="meaning"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder="예: 공부"
          className="w-52 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">히라가나</span>
        <input
          type="text"
          name="hiragana"
          value={hiragana}
          onChange={(e) => setHiragana(e.target.value)}
          placeholder="예: べんきょう"
          className="w-52 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !word.trim()}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
      >
        단어 추가
      </button>
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </form>
  );
}
