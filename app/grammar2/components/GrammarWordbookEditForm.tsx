"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateGrammarWordbookWordAction } from "@/app/actions/grammarWordbook";

type Props = {
  wordbookId: string;
  no: string;
  initialGrammar: string;
  initialShape?: string;
  initialMeaning?: string;
  initialInterpretation?: string;
  initialExample?: string;
};

export function GrammarWordbookEditForm({
  wordbookId,
  no,
  initialGrammar,
  initialShape,
  initialMeaning,
  initialInterpretation,
  initialExample,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [grammar, setGrammar] = useState(initialGrammar);
  const [shape, setShape] = useState(initialShape ?? "");
  const [meaning, setMeaning] = useState(initialMeaning ?? "");
  const [interpretation, setInterpretation] = useState(
    initialInterpretation ?? ""
  );
  const [example, setExample] = useState(initialExample ?? "");

  const [oldGrammar] = useState(initialGrammar);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const fd = new FormData();
    fd.set("wordbookId", wordbookId);
    fd.set("no", no);
    fd.set("oldGrammar", oldGrammar);
    fd.set("grammar", grammar);
    fd.set("shape", shape);
    fd.set("meaning", meaning);
    fd.set("interpretation", interpretation);
    fd.set("example", example);

    const res = await updateGrammarWordbookWordAction(fd);
    setPending(false);

    if (res?.ok) {
      setEditing(false);
      router.refresh();
    } else {
      setError(res?.error ?? "수정에 실패했습니다.");
    }
  };

  if (!editing) {
    return (
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/20 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          수정
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            문법(키)
          </span>
          <input
            type="text"
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
            value={example}
            onChange={(e) => setExample(e.target.value)}
            rows={3}
            className="w-96 resize-y rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="선택"
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            {pending ? "저장 중…" : "저장"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={pending}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900/20 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            취소
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </form>
  );
}

