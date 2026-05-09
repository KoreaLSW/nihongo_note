"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { renameWordbookAction } from "@/app/actions/wordbook";

type Props = {
  wordbookId: string;
  initialName: string;
};

export function RenameWordbookForm({ wordbookId, initialName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(initialName ?? "");
  }, [initialName]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const res = await renameWordbookAction(new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      router.refresh();
    } else {
      setError(res?.error ?? "이름 변경 실패");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="wordbookId" value={wordbookId} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          단어장 이름 변경
        </span>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 이름"
          className="w-56 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !name.trim() || name.trim() === (initialName ?? "").trim()}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900/20 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        저장
      </button>
      {error && (
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      )}
    </form>
  );
}

