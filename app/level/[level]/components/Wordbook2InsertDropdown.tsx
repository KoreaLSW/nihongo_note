"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { insertToWordbook } from "@/app/actions/wordbook";
import type { WordbookMeta } from "@/lib/wordbook";

type Props = {
  wordbooks: WordbookMeta[];
  includedWordbookIds: string[];
  word: string;
  meaning: string;
  level: string;
};

export function Wordbook2InsertDropdown({
  wordbooks,
  includedWordbookIds,
  word,
  meaning,
  level,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const includedSet = new Set(includedWordbookIds ?? []);
  const isInAny = includedSet.size > 0;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const handleInsert = async (wordbookId: string) => {
    setPending(true);
    const fd = new FormData();
    fd.set("wordbookId", wordbookId);
    fd.set("word", word);
    fd.set("meaning", meaning);
    fd.set("level", level);
    fd.set("reading", "");
    const res = await insertToWordbook(fd);
    setPending(false);
    if (res?.ok) {
      setOpen(false);
      router.refresh();
    }
  };

  if (wordbooks.length === 0) {
    return (
      <span className="text-xs text-zinc-400 dark:text-zinc-500">
        (단어장 없음)
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={pending}
          className={`rounded px-2 py-1 text-xs font-medium text-white transition disabled:opacity-50 ${
            isInAny
              ? "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
              : "bg-violet-600 hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600"
          }`}
        >
          {isInAny
            ? `한자단어장 (${includedSet.size})`
            : "한자단어장"}
        </button>

        <Link
          href="/grammar2"
          className="w-fit rounded px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          aria-label="문법단어장 목록으로 이동"
        >
          문법단어장
        </Link>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wordbook-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
              <h2
                id="wordbook-modal-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                저장할 단어장 선택
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                aria-label="닫기"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                &quot;{word}&quot; ({meaning}) 를 추가할 단어장을 선택하세요.
              </p>
              <ul className="space-y-1">
                {wordbooks.map((wb) => (
                  <li key={wb.id}>
                    {(() => {
                      const alreadyIn = includedSet.has(wb.id);
                      return (
                    <button
                      type="button"
                      onClick={() => handleInsert(wb.id)}
                      disabled={pending || alreadyIn}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition disabled:opacity-50 ${
                        alreadyIn
                          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-100"
                          : "border-zinc-200 text-zinc-800 hover:bg-violet-50 hover:border-violet-200 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-violet-900/20 dark:hover:border-violet-800"
                      }`}
                    >
                      <span className="min-w-0 truncate">{wb.name}</span>
                      {alreadyIn && (
                        <span className="shrink-0 rounded-md bg-amber-200/70 px-2 py-0.5 text-xs font-semibold text-amber-950 dark:bg-amber-800/60 dark:text-amber-100">
                          포함됨
                        </span>
                      )}
                    </button>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
