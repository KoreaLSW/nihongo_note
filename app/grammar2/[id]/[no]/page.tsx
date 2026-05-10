import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import {
  getGrammarWordbookMeta,
  getGrammarWordbookWordByNo,
  getGrammarWordbookWords,
} from "@/lib/grammarWordbook";
import { GrammarDetailActions } from "../../components/GrammarDetailActions";
import { GrammarDetailDeleteButton } from "../../components/GrammarDetailDeleteButton";
import { GrammarWordbookEditForm } from "../../components/GrammarWordbookEditForm";

type Props = { params: Promise<{ id: string; no: string }> };

export default async function GrammarWordbookWordDetailPage({
  params,
}: Props) {
  const { id, no } = await params;

  const meta = await getGrammarWordbookMeta(id);
  if (!meta) notFound();

  const row = await getGrammarWordbookWordByNo(id, no);
  if (!row) notFound();

  const words = await getGrammarWordbookWords(id);
  const currentIndex = words.findIndex(
    (w) => String(w.no).trim() === String(row.no).trim()
  );
  const prevRow = currentIndex > 0 ? words[currentIndex - 1] : undefined;
  const nextRow =
    currentIndex >= 0 && currentIndex + 1 < words.length
      ? words[currentIndex + 1]
      : undefined;

  // JLPT 문법에서 가져온 항목의 대표 오디오(있을 때만 표시)
  const audioIndexPath = path.join(
    process.cwd(),
    "public",
    "grammar_json",
    "jlpt_audio_index.json"
  );
  const audioIndexRaw = fs.existsSync(audioIndexPath)
    ? fs.readFileSync(audioIndexPath, "utf-8")
    : "";
  const audioIndex = (() => {
    try {
      const parsed = JSON.parse(audioIndexRaw || "{}") as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as Record<
            string,
            { examples?: Array<{ male?: string; female?: string }> }
          >)
        : {};
    } catch {
      return {};
    }
  })();
  const audio = audioIndex[row.grammar] ?? {};
  const audioExamples = Array.isArray(audio.examples) ? audio.examples : [];
  const exampleBlocks = String(row.example ?? "")
    .split(/\r?\n\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const actionRow = {
    grammar: row.grammar,
    meaning: row.meaning ?? "",
    interpretation: row.interpretation ?? "",
    example: row.example ?? "",
    memorized: row.memorized ?? "no",
    memorized_at: row.memorized_at ?? "",
    created_at: row.created_at ?? "",
  };

  return (
    <div className="p-8">
      <Link
        href={`/grammar2/${id}`}
        className="mb-6 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← {meta.name} 문법단어장
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-start gap-2">
        {prevRow ? (
          <Link
            href={`/grammar2/${id}/${prevRow.no}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            ← 이전
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            ← 이전
          </span>
        )}

        {nextRow ? (
          <Link
            href={`/grammar2/${id}/${nextRow.no}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            다음 문법 →
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            다음 문법 →
          </span>
        )}
      </div>

      <GrammarWordbookEditForm
        wordbookId={id}
        no={row.no}
        initialGrammar={row.grammar}
        initialShape={row.shape}
        initialMeaning={row.meaning}
        initialInterpretation={row.interpretation}
        initialExample={row.example}
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
              No. {row.no}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {row.grammar}
            </h1>
          </div>

          <span
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
              actionRow.memorized === "yes"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            }`}
          >
            {actionRow.memorized === "yes" ? "암기" : "미암기"}
          </span>
        </div>

        <dl className="grid gap-4 sm:grid-cols-1">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              문법
            </dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-200">{row.grammar}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              형태
            </dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
              {row.shape?.trim() ? (
                <span className="whitespace-pre-wrap">{row.shape}</span>
              ) : (
                "—"
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              뜻
            </dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
              {row.meaning?.trim() ? (
                <span className="whitespace-pre-wrap">{row.meaning}</span>
              ) : (
                "—"
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              해석
            </dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
              {row.interpretation?.trim() ? (
                <span className="whitespace-pre-wrap">{row.interpretation}</span>
              ) : (
                "—"
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              예문
            </dt>
            {audioExamples.length > 0 ? null : (
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {row.example?.trim() ? (
                  <span className="whitespace-pre-wrap">{row.example}</span>
                ) : (
                  "—"
                )}
              </dd>
            )}
            {audioExamples.length > 0 ? (
              <div className="mt-3 space-y-3">
                {audioExamples.map((exAudio, idx) => {
                  const male = String(exAudio?.male ?? "").trim();
                  const female = String(exAudio?.female ?? "").trim();
                  if (!male && !female) return null;
                  return (
                    <div key={idx} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                      {exampleBlocks[idx] ? (
                        <div className="mb-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                          {exampleBlocks[idx]}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-4">
                        {male ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                              남
                            </span>
                            <audio
                              className="h-8 w-64 max-w-full"
                              controls
                              preload="none"
                              src={male}
                            />
                          </div>
                        ) : null}
                        {female ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                              여
                            </span>
                            <audio
                              className="h-8 w-64 max-w-full"
                              controls
                              preload="none"
                              src={female}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              추가일시
            </dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
              {actionRow.created_at || "—"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              암기일시
            </dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
              {actionRow.memorized_at || "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <GrammarDetailActions row={actionRow} />
        <GrammarDetailDeleteButton wordbookId={id} grammar={row.grammar} />
      </div>
    </div>
  );
}

