"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { JlptMemorizedListMode } from "@/lib/jlptWordbookShared";
import { DeleteJlptWordbookButton } from "./DeleteJlptWordbookButton";

export type JlptWordbookCardItem = {
  id: string;
  name: string;
  file: string;
  count: number;
};

type Props = {
  level: string;
  wordbooks: JlptWordbookCardItem[];
};

function selectionToSearchParams(
  level: string,
  selected: Set<string>,
  allIds: string[],
  memorized?: Exclude<JlptMemorizedListMode, "all">
): URLSearchParams | null {
  if (selected.size === 0) return null;
  const params = new URLSearchParams();
  params.set("level", level);
  if (memorized) params.set("memorized", memorized);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  if (!allSelected) {
    for (const id of allIds) {
      if (selected.has(id)) params.append("wb", id);
    }
  }
  return params;
}

export function JlptWordbookHomeSelection({ level, wordbooks }: Props) {
  const allIds = useMemo(() => wordbooks.map((w) => w.id), [wordbooks]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [level]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allIds));
  const selectNone = () => setSelected(new Set());

  const disabled = selected.size === 0;

  const wordsHref = (memorized?: Exclude<JlptMemorizedListMode, "all">) => {
    const p = selectionToSearchParams(level, selected, allIds, memorized);
    if (!p) return "#";
    return `/jlpt-wordbook/all-words?${p.toString()}`;
  };

  const quizHref = (memorized?: Exclude<JlptMemorizedListMode, "all">) => {
    const p = selectionToSearchParams(level, selected, allIds, memorized);
    if (!p) return "#";
    return `/jlpt-wordbook/all-words/quiz?${p.toString()}`;
  };

  const disabledTitle = "단어장을 하나 이상 선택하세요";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-medium">단어장 선택:</span>
        <button
          type="button"
          onClick={selectAll}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          전체 선택
        </button>
        <button
          type="button"
          onClick={selectNone}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          전체 해제
        </button>
        <span className="text-xs text-zinc-500 dark:text-zinc-500">
          체크된 단어장만 레벨 전체 단어·퀴즈에 포함됩니다.
        </span>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          레벨 전체 단어:
        </span>
        {disabled ? (
          <span
            title={disabledTitle}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-zinc-800/40 px-4 py-2.5 text-sm font-semibold text-white/70 dark:bg-zinc-200/40 dark:text-zinc-900/60"
          >
            전체
          </span>
        ) : (
          <Link
            href={wordsHref()}
            className="inline-flex items-center justify-center rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            전체
          </Link>
        )}
        {disabled ? (
          <span
            title={disabledTitle}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 px-4 py-2.5 text-sm font-semibold text-emerald-900/50 dark:border-emerald-600/40 dark:bg-emerald-900/20 dark:text-emerald-100/50"
          >
            암기 단어
          </span>
        ) : (
          <Link
            href={wordsHref("yes")}
            className="inline-flex items-center justify-center rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
          >
            암기 단어
          </Link>
        )}
        {disabled ? (
          <span
            title={disabledTitle}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border-2 border-zinc-300/50 bg-white/50 px-4 py-2.5 text-sm font-semibold text-zinc-800/50 dark:border-zinc-600/50 dark:bg-zinc-800/50 dark:text-zinc-100/50"
          >
            미완전 단어
          </span>
        ) : (
          <Link
            href={wordsHref("no")}
            className="inline-flex items-center justify-center rounded-xl border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            미완전 단어
          </Link>
        )}
        {disabled ? (
          <span
            title={disabledTitle}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border-2 border-sky-500/40 bg-sky-50/50 px-4 py-2.5 text-sm font-semibold text-sky-900/50 dark:border-sky-600/40 dark:bg-sky-900/20 dark:text-sky-100/50"
          >
            단어만 암기
          </span>
        ) : (
          <Link
            href={wordsHref("word")}
            className="inline-flex items-center justify-center rounded-xl border-2 border-sky-500 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-950 transition hover:bg-sky-100 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-100 dark:hover:bg-sky-900/50"
          >
            단어만 암기
          </Link>
        )}
        {disabled ? (
          <span
            title={disabledTitle}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border-2 border-violet-500/40 bg-violet-50/50 px-4 py-2.5 text-sm font-semibold text-violet-900/50 dark:border-violet-600/40 dark:bg-violet-900/20 dark:text-violet-100/50"
          >
            뜻만 암기
          </span>
        ) : (
          <Link
            href={wordsHref("meaning")}
            className="inline-flex items-center justify-center rounded-xl border-2 border-violet-500 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-950 transition hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-900/30 dark:text-violet-100 dark:hover:bg-violet-900/50"
          >
            뜻만 암기
          </Link>
        )}
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          레벨 전체 퀴즈:
        </span>
        {disabled ? (
          <span
            title={disabledTitle}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-amber-500/40 px-4 py-2.5 text-sm font-semibold text-white/70"
          >
            전체
          </span>
        ) : (
          <Link
            href={quizHref()}
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
          >
            전체
          </Link>
        )}
        {disabled ? (
          <span
            title={disabledTitle}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 px-4 py-2.5 text-sm font-semibold text-emerald-900/50 dark:border-emerald-600/40 dark:bg-emerald-900/20 dark:text-emerald-100/50"
          >
            암기 단어 퀴즈
          </span>
        ) : (
          <Link
            href={quizHref("yes")}
            className="inline-flex items-center justify-center rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
          >
            암기 단어 퀴즈
          </Link>
        )}
        {disabled ? (
          <span
            title={disabledTitle}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border-2 border-zinc-300/50 bg-white/50 px-4 py-2.5 text-sm font-semibold text-zinc-800/50 dark:border-zinc-600/50 dark:bg-zinc-800/50 dark:text-zinc-100/50"
          >
            미완전 퀴즈
          </span>
        ) : (
          <Link
            href={quizHref("no")}
            className="inline-flex items-center justify-center rounded-xl border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            미완전 퀴즈
          </Link>
        )}
        {disabled ? (
          <span
            title={disabledTitle}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border-2 border-sky-500/40 bg-sky-50/50 px-4 py-2.5 text-sm font-semibold text-sky-900/50 dark:border-sky-600/40 dark:bg-sky-900/20 dark:text-sky-100/50"
          >
            단어만 암기 퀴즈
          </span>
        ) : (
          <Link
            href={quizHref("word")}
            className="inline-flex items-center justify-center rounded-xl border-2 border-sky-500 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-950 transition hover:bg-sky-100 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-100 dark:hover:bg-sky-900/50"
          >
            단어만 암기 퀴즈
          </Link>
        )}
        {disabled ? (
          <span
            title={disabledTitle}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border-2 border-violet-500/40 bg-violet-50/50 px-4 py-2.5 text-sm font-semibold text-violet-900/50 dark:border-violet-600/40 dark:bg-violet-900/20 dark:text-violet-100/50"
          >
            뜻만 암기 퀴즈
          </span>
        ) : (
          <Link
            href={quizHref("meaning")}
            className="inline-flex items-center justify-center rounded-xl border-2 border-violet-500 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-950 transition hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-900/30 dark:text-violet-100 dark:hover:bg-violet-900/50"
          >
            뜻만 암기 퀴즈
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {wordbooks.length === 0 ? (
          <div className="col-span-full rounded-xl border-2 border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
            {level.toUpperCase()} 단어장이 없습니다. 위에서 새 단어장을 만들어 보세요.
          </div>
        ) : (
          wordbooks.map((wb) => (
            <div
              key={wb.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(wb.id)}
                  onChange={() => toggle(wb.id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
                <span className="min-w-0 font-medium text-zinc-900 dark:text-zinc-100">
                  {wb.name}
                </span>
              </label>
              <span className="mt-1 pl-7 text-xs text-zinc-500 dark:text-zinc-400">
                {wb.count}개 단어
              </span>
              <span className="mt-0.5 pl-7 text-xs text-zinc-400 dark:text-zinc-500">
                {wb.file}
              </span>
              <div className="mt-3 flex flex-wrap gap-2 pl-7">
                <Link
                  href={`/jlpt-wordbook/${wb.id}`}
                  className="inline-flex w-fit items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                >
                  열기
                </Link>
                <Link
                  href={`/jlpt-wordbook/${wb.id}/quiz`}
                  className="inline-flex w-fit items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
                >
                  퀴즈
                </Link>
                <DeleteJlptWordbookButton wordbookId={wb.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
