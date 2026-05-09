"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFromJlptWordbookAction,
  updateJlptWordbookWordAction,
} from "@/app/actions/jlptWordbook";

type Props = {
  wordbookId: string;
  row: {
    no: string;
    word: string;
    meaning: string;
    hiragana: string;
  };
};

export function JlptWordRowActions({ wordbookId, row }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [word, setWord] = useState(row.word);
  const [meaning, setMeaning] = useState(row.meaning);
  const [hiragana, setHiragana] = useState(row.hiragana);
  const [error, setError] = useState("");

  const onDelete = async () => {
    const ok = window.confirm("이 단어를 삭제할까요?");
    if (!ok) return;
    setError("");
    setPending(true);
    const fd = new FormData();
    fd.set("wordbookId", wordbookId);
    fd.set("no", row.no);
    const res = await deleteFromJlptWordbookAction(fd);
    setPending(false);
    if (res?.ok) {
      router.refresh();
    } else {
      setError(res?.error ?? "삭제 실패");
    }
  };

  const onSave = async () => {
    setError("");
    setPending(true);
    const fd = new FormData();
    fd.set("wordbookId", wordbookId);
    fd.set("no", row.no);
    fd.set("word", word);
    fd.set("meaning", meaning);
    fd.set("hiragana", hiragana);
    const res = await updateJlptWordbookWordAction(fd);
    setPending(false);
    if (res?.ok) {
      setEditing(false);
      router.refresh();
    } else {
      setError(res?.error ?? "수정 실패");
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError("");
            setEditing(true);
          }}
          className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          수정
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="rounded-lg bg-red-500 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500"
        >
          삭제
        </button>
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 md:grid-cols-3">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="단어"
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder="뜻"
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <input
          value={hiragana}
          onChange={(e) => setHiragana(e.target.value)}
          placeholder="히라가나"
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !word.trim() || !meaning.trim()}
          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          저장
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setWord(row.word);
            setMeaning(row.meaning);
            setHiragana(row.hiragana);
            setError("");
          }}
          className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          취소
        </button>
      </div>
      {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}
    </div>
  );
}
