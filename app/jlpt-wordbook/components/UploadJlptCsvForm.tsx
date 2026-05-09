"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importJlptWordbookCsvAction } from "@/app/actions/jlptWordbook";

type Props = {
  wordbookId: string;
};

type ImportResult = {
  total: number;
  inserted: number;
  failed: number;
  fails: Array<{ row: number; reason: string }>;
};

export function UploadJlptCsvForm({ wordbookId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setPending(true);
    const res = await importJlptWordbookCsvAction(new FormData(e.currentTarget));
    setPending(false);

    if (!res?.ok) {
      setError(res?.error ?? "업로드 실패");
      return;
    }

    setResult({
      total: res.total ?? 0,
      inserted: res.inserted ?? 0,
      failed: res.failed ?? 0,
      fails: Array.isArray(res.fails) ? res.fails : [],
    });
    router.refresh();
  };

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          CSV로 단어 대량 업로드
        </p>
      </div>

      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        필수 컬럼: 단어, 뜻 / 선택 컬럼: 히라가나
      </p>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="wordbookId" value={wordbookId} />
        <label className="flex flex-col gap-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">CSV 파일</span>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            className="block w-72 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-xs file:font-medium dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:file:bg-zinc-700"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          {pending ? "업로드 중..." : "업로드"}
        </button>
        <a
          href="/jlpt_wordbooks/jlpt_wordbook_template.csv"
          download
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          CSV 양식 다운로드
        </a>
      </form>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <div className="mt-3 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <p>
            총 {result.total}건 중 {result.inserted}건 추가, {result.failed}건 실패
          </p>
          {result.fails.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {result.fails.slice(0, 10).map((f, i) => (
                <li key={`${f.row}-${i}`}>
                  {f.row}행: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
