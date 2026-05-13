"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  patchJlptRowForQuizView,
  getJlptMemorizedForQuizView,
  type JlptWordbookRow,
} from "@/lib/jlptWordbookShared";
import { setJlptWordMemorizedAction } from "@/app/actions/jlptWordbook";
import type { JlptWordKanjiLine } from "@/lib/kanji";

type Props = {
  row: JlptWordbookRow;
  wordbookId: string;
  quizView: "word" | "meaning" | "hiragana";
  /** 퀴즈에서 `view=full` 목록일 때 배지 문구만 구분 (미암기 목록은 fullIncomplete) */
  variant?: "full" | "fullIncomplete";
  /** 서버에서 `getJlptKanjiLinesForWord(row.word)`로 채움 */
  kanjiLines?: JlptWordKanjiLine[];
};

const MEMORIZED_CLASS =
  "inline-block w-fit rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
const NOT_MEMORIZED_CLASS =
  "inline-block w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";

export function JlptQuizCard({ row, wordbookId, quizView, variant, kanjiLines = [] }: Props) {
  const [localRow, setLocalRow] = useState<JlptWordbookRow>(() => ({ ...row }));
  const [memorizing, setMemorizing] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setLocalRow({ ...row });
  }, [
    wordbookId,
    row.no,
    row.word,
    row.meaning,
    row.hiragana,
    row.memorized_word,
    row.memorized_meaning,
    row.memorized_hiragana,
    row.memorized_word_at,
    row.memorized_meaning_at,
    row.memorized_hiragana_at,
    row.memorized,
    row.memorized_at,
    row.created_at,
  ]);

  const setMemorized = async (value: "yes" | "no") => {
    if (memorizing) return;

    const prior = localRow;
    const optimistic = patchJlptRowForQuizView(localRow, quizView, value);
    setLocalRow(optimistic);
    setMemorizing(true);

    try {
      const fd = new FormData();
      fd.set("wordbookId", wordbookId);
      fd.set("no", prior.no);
      fd.set("value", value);
      fd.set("quizView", quizView);
      const res = await setJlptWordMemorizedAction(fd);
      if (!res?.ok) {
        setLocalRow(prior);
      }
    } catch {
      setLocalRow(prior);
    } finally {
      setMemorizing(false);
    }
  };

  const modeMemorized = getJlptMemorizedForQuizView(localRow, quizView);

  const promptText =
    quizView === "meaning"
      ? localRow.meaning || "-"
      : quizView === "hiragana"
        ? localRow.hiragana || "-"
        : localRow.word;

  return (
    <div className="flex min-h-[190px] flex-col items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex w-full flex-col items-center gap-2">
        <span className={modeMemorized === "yes" ? MEMORIZED_CLASS : NOT_MEMORIZED_CLASS}>
          {variant === "full"
            ? `전체 암기 · 단어 축 · ${modeMemorized === "yes" ? "암기" : "미암기"}`
            : variant === "fullIncomplete"
              ? `전체 미암기 · 단어 축 · ${modeMemorized === "yes" ? "암기" : "미암기"}`
              : `${quizView === "word" ? "단어보기" : quizView === "meaning" ? "뜻보기" : "히라가나"} · ${
                  modeMemorized === "yes" ? "암기" : "미암기"
                }`}
        </span>
        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{promptText}</p>
      </div>
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-2 rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
        >
          정답확인
        </button>
      ) : (
        <>
          <div className="mt-2 w-full space-y-1 text-center text-sm text-zinc-600 dark:text-zinc-400">
            <p>단어: {localRow.word || "-"}</p>
            <p>뜻: {localRow.meaning || "-"}</p>
            <p>히라가나: {localRow.hiragana || "-"}</p>
            {kanjiLines.length > 0 && (
              <div className="mx-auto mt-2 flex max-w-[min(100%,18rem)] gap-2 border-t border-zinc-200 pt-2 text-left text-zinc-700 dark:border-zinc-600 dark:text-zinc-300">
                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">한자:</span>
                <div className="min-w-0 space-y-0.5">
                  {kanjiLines.map((k) => {
                    const lineText =
                      k.found && k.level
                        ? k.meaningShort
                          ? `${k.char} ${k.meaningShort}(${k.level})`
                          : `${k.char}(${k.level})`
                        : `${k.char} 조회 X`;
                    const lineClass =
                      "break-words rounded px-1.5 py-0.5 leading-snug transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/60";
                    return k.detailHref ? (
                      <Link
                        key={k.char}
                        href={k.detailHref}
                        className={`block cursor-pointer ${lineClass}`}
                      >
                        {lineText}
                      </Link>
                    ) : (
                      <p key={k.char} className={`cursor-default ${lineClass}`}>
                        {lineText}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={memorizing}
              onClick={() => setMemorized("yes")}
              className="rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
            >
              정답
            </button>
            <button
              type="button"
              disabled={memorizing}
              onClick={() => setMemorized("no")}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 transition hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70"
            >
              틀림
            </button>
          </div>
        </>
      )}
    </div>
  );
}
