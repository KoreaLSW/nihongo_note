"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setJlptGrammarMemorizedAction } from "@/app/actions/jlptGrammar";

type Props = {
  level: string;
  no: number;
  memorized: boolean;
};

export function JlptGrammarMemorizedButton({ level, no, memorized }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const res = await setJlptGrammarMemorizedAction(fd);

    setPending(false);
    if (res?.ok) {
      router.refresh();
    } else {
      setError(res?.error ?? "상태 변경에 실패했습니다.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-start gap-1">
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="no" value={no} />
      <input type="hidden" name="value" value={memorized ? "no" : "yes"} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          memorized
            ? "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            : "bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-700"
        }`}
      >
        {pending ? "저장 중..." : memorized ? "미암기로 변경" : "암기로 변경"}
      </button>
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </form>
  );
}
