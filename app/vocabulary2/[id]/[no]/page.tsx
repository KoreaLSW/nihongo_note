import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getKanjiDetailByWord } from "@/lib/kanji";
import {
  filterVocabulary2AllWordsFlat,
  getVocabulary2AllWordsFlatRows,
} from "@/lib/vocabulary2AllWords";
import {
  parseVocabulary2AllWordsMemorizedParam,
  vocabulary2AllWordsDetailQuery,
} from "@/lib/vocabulary2AllWordsNav";
import {
  getWordbookMeta,
  getWordbookWordByNo,
  getWordbookPrevNextNos,
} from "@/lib/wordbook";
import { VocabularyDetailActions } from "@/app/vocabulary/components/VocabularyDetailActions";
import { WordbookDetailDeleteButton } from "@/app/vocabulary2/components/WordbookDetailDeleteButton";

type Props = {
  params: Promise<{ id: string; no: string }>;
  searchParams: Promise<{ from?: string; memorized?: string }>;
};

export default async function WordbookWordDetailPage({
  params,
  searchParams,
}: Props) {
  const { id, no } = await params;
  const sp = await searchParams;
  const meta = await getWordbookMeta(id);
  if (!meta) notFound();

  const [row, wbNeighbors] = await Promise.all([
    getWordbookWordByNo(id, no),
    getWordbookPrevNextNos(id, String(no ?? "").trim()),
  ]);
  if (!row) notFound();

  const fromAllWords = (sp.from ?? "").toLowerCase() === "all-words";
  const allWordsMode = parseVocabulary2AllWordsMemorizedParam(sp.memorized);

  /** 평탄 목록에서 위치를 찾았을 때만 이전/다음에 `from=all-words` 컨텍스트 유지 */
  let prevNextQuery = "";

  let prevNo: string | undefined;
  let prevWordbookId: string | undefined;
  let nextNo: string | undefined;
  let nextWordbookId: string | undefined;

  const applyWithinWordbook = () => {
    if (wbNeighbors.prevNo) {
      prevWordbookId = id;
      prevNo = wbNeighbors.prevNo;
    }
    if (wbNeighbors.nextNo) {
      nextWordbookId = id;
      nextNo = wbNeighbors.nextNo;
    }
  };

  if (fromAllWords) {
    const filtered = filterVocabulary2AllWordsFlat(
      await getVocabulary2AllWordsFlatRows(),
      allWordsMode
    );
    const flatIdx = filtered.findIndex(
      (r) =>
        r.wordbookId === id &&
        String(r.no).trim() === String(row.no).trim()
    );
    if (flatIdx >= 0) {
      prevNextQuery = vocabulary2AllWordsDetailQuery(allWordsMode);
      const p = filtered[flatIdx - 1];
      const n = filtered[flatIdx + 1];
      if (p) {
        prevWordbookId = p.wordbookId;
        prevNo = p.no;
      }
      if (n) {
        nextWordbookId = n.wordbookId;
        nextNo = n.no;
      }
    } else {
      applyWithinWordbook();
    }
  } else {
    applyWithinWordbook();
  }

  const kanjiDetail = await getKanjiDetailByWord(row.word);

  const actionRow = {
    no: row.no,
    word: row.word,
    reading: row.reading ?? "",
    meaning: row.meaning ?? "",
    level: row.level ?? "",
    created_at: row.created_at ?? "",
    memorized: row.memorized ?? "no",
    memorized_at: row.memorized_at ?? "",
    reviewed_at: row.reviewed_at ?? "",
  };

  return (
    <div className="p-8">
      <Link
        href={`/vocabulary2/${id}`}
        className="mb-6 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← {meta.name} 단어장
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {prevNo && prevWordbookId ? (
          <Link
            href={`/vocabulary2/${prevWordbookId}/${prevNo}${prevNextQuery}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← 이전 단어
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            ← 이전 단어
          </span>
        )}

        {nextNo && nextWordbookId ? (
          <Link
            href={`/vocabulary2/${nextWordbookId}/${nextNo}${prevNextQuery}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            다음 단어 →
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            다음 단어 →
          </span>
        )}
      </div>

      {kanjiDetail ? (
        <>
          <div className="flex flex-col gap-8 md:flex-row md:items-start">
            {kanjiDetail.imageUrl && (
              <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                <Image
                  src={kanjiDetail.imageUrl}
                  alt={kanjiDetail.kanji}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            {!kanjiDetail.imageUrl && (
              <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-6xl text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-500">
                {kanjiDetail.kanji}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {kanjiDetail.kanji}
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  No. {kanjiDetail.no} · {kanjiDetail.level}
                </p>
              </div>

              <dl className="grid gap-4 sm:grid-cols-1">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    meaning_quoted
                  </dt>
                  <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                    {kanjiDetail.meaning_quoted}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    meaning
                  </dt>
                  <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                    {kanjiDetail.meaning}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    음독 (onyomi)
                  </dt>
                  <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                    {kanjiDetail.onyomi}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    훈독 (kunyomi)
                  </dt>
                  <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                    {kanjiDetail.kunyomi}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    암기여부
                  </dt>
                  <dd className="mt-1 font-medium text-zinc-800 dark:text-zinc-200">
                    {actionRow.memorized === "yes" ? "암기" : "미암기"}
                  </dd>
                </div>
                {row.reading && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      읽기 (note)
                    </dt>
                    <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                      {row.reading}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    추가일시
                  </dt>
                  <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                    {row.created_at || "—"}
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
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    복습일시
                  </dt>
                  <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                    {actionRow.reviewed_at || "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-8 space-y-6 border-t border-zinc-200 pt-8 dark:border-zinc-700">
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                글자 설명 (shape_explanation)
              </h2>
              <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                {kanjiDetail.shape_explanation}
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                음독 상세 (onyomi_detail)
              </h2>
              <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                {kanjiDetail.onyomi_detail}
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                훈독 상세 (kunyomi_detail)
              </h2>
              <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                {kanjiDetail.kunyomi_detail}
              </p>
            </section>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                No. {row.no}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {row.word}
              </h1>
              {row.reading && (
                <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
                  {row.reading}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                actionRow.memorized === "yes"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
              }`}
            >
              {actionRow.memorized === "yes" ? "암기" : "미암기"}
            </span>
          </div>

          <dl className="grid gap-4 sm:grid-cols-1">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                뜻 (meaning)
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {row.meaning}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                레벨 (level)
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {row.level}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                추가일시
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {row.created_at || "—"}
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
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                복습일시
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {actionRow.reviewed_at || "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <VocabularyDetailActions row={actionRow} />
        <WordbookDetailDeleteButton wordbookId={id} word={row.word} />
      </div>
    </div>
  );
}
