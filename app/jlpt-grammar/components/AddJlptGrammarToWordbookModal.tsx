"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { importJlptGrammarToWordbook } from "@/app/actions/jlptGrammar";
import type { GrammarWordbookMeta } from "@/lib/grammarWordbook";

type Props = {
  wordbooks: GrammarWordbookMeta[];
  level: string;
  no: number;
  grammarTitle: string;
};

export function AddJlptGrammarToWordbookModal({
  wordbooks,
  level,
  no,
  grammarTitle,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const handleInsert = async (wordbookId: string) => {
    setError("");
    setPending(true);
    const fd = new FormData();
    fd.set("wordbookId", wordbookId);
    fd.set("level", level);
    fd.set("no", String(no));
    const res = await importJlptGrammarToWordbook(fd);
    setPending(false);
    if (res?.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res?.error ?? "추가 실패");
    }
  };

  if (wordbooks.length === 0) {
    return (
      <span className="text-sm text-zinc-400 dark:text-zinc-500">
        (문법단어장 없음)
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
      >
        문법단어장에 추가
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="jlpt-grammar-insert-title"
        >
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
              <h2
                id="jlpt-grammar-insert-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                문법단어장에 추가
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                aria-label="닫기"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                &quot;{grammarTitle}&quot; ({level.toUpperCase()} · No {no}) 를 추가할
                문법단어장을 선택하세요.
              </p>

              <ul className="space-y-1">
                {wordbooks.map((wb) => (
                  <li key={wb.id}>
                    <button
                      type="button"
                      onClick={() => handleInsert(wb.id)}
                      disabled={pending}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-left text-sm font-medium text-zinc-800 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/20"
                    >
                      <span className="min-w-0 truncate">{wb.name}</span>
                      <span className="shrink-0 text-zinc-400">→</span>
                    </button>
                  </li>
                ))}
              </ul>

              {error && (
                <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

