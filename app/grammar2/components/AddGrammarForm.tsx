"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { insertToGrammarWordbook } from "@/app/actions/grammarWordbook";

type Props = { wordbookId: string };

export function AddGrammarForm({ wordbookId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [grammar, setGrammar] = useState("");
  const [shape, setShape] = useState("");
  const [meaning, setMeaning] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [example, setExample] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await insertToGrammarWordbook(fd);
    setPending(false);
    if (res?.ok) {
      setGrammar("");
      setShape("");
      setMeaning("");
      setInterpretation("");
      setExample("");
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
          문법
        </span>
        <input
          type="text"
          name="grammar"
          value={grammar}
          onChange={(e) => setGrammar(e.target.value)}
          required
          className="w-64 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
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
          className="w-80 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="선택"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          형태
        </span>
        <textarea
          name="shape"
          value={shape}
          onChange={(e) => setShape(e.target.value)}
          rows={2}
          className="w-64 resize-y rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="선택"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          해석
        </span>
        <textarea
          name="interpretation"
          value={interpretation}
          onChange={(e) => setInterpretation(e.target.value)}
          rows={3}
          className="w-80 resize-y rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="선택"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          예문
        </span>
        <textarea
          name="example"
          value={example}
          onChange={(e) => setExample(e.target.value)}
          rows={3}
          className="w-96 resize-y rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="선택"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
      >
        추가
      </button>

      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </form>
  );
}

