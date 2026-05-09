"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGrammarWordbook } from "@/app/actions/grammarWordbook";

export function CreateGrammarWordbookForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const res = await createGrammarWordbook(new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setName("");
      router.refresh();
    } else {
      setError(res?.error ?? "생성 실패");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          새 문법 단어장 이름
        </span>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 연결어"
          className="w-56 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
      >
        문법 단어장 만들기
      </button>
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </form>
  );
}

