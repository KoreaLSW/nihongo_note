import Link from "next/link";
import { getKanjiReadingsMapForWords } from "@/lib/kanji";
import {
  filterVocabulary2AllWordsFlat,
  getVocabulary2AllWordsFlatRows,
} from "@/lib/vocabulary2AllWords";
import { parseVocabulary2AllWordsMemorizedParam } from "@/lib/vocabulary2AllWordsNav";
import { WordbookCard } from "../components/WordbookCard";

const PER_PAGE = 10;
const PAGE_GROUP = 10;

type Props = {
  searchParams: Promise<{ memorized?: string; page?: string }>;
};

export default async function AllVocabulary2WordsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const memorizedModeParam = parseVocabulary2AllWordsMemorizedParam(sp.memorized);
  const pageParam = sp.page ?? "1";
  const page = Math.max(1, parseInt(pageParam, 10) || 1);

  const flat = await getVocabulary2AllWordsFlatRows();
  const filtered = filterVocabulary2AllWordsFlat(flat, memorizedModeParam);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PER_PAGE;
  const rows = filtered.slice(start, start + PER_PAGE);

  const kanjiReadings = await getKanjiReadingsMapForWords(
    rows.map((r) => r.word)
  );

  const startPage =
    Math.floor((currentPage - 1) / PAGE_GROUP) * PAGE_GROUP + 1;
  const endPage = Math.min(startPage + PAGE_GROUP - 1, totalPages);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  const buildUrl = (p: number, mode: typeof memorizedModeParam) => {
    const params = new URLSearchParams();
    if (mode !== "all") params.set("memorized", mode);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/vocabulary2/all-words?${qs}` : "/vocabulary2/all-words";
  };

  const tab = (mode: typeof memorizedModeParam, label: string) => {
    const active = memorizedModeParam === mode;
    return (
      <Link
        href={buildUrl(1, mode)}
        className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
          active
            ? "bg-violet-600 text-white dark:bg-violet-600"
            : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="p-8">
      <Link
        href="/vocabulary2"
        className="mb-6 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← 한자단어장
      </Link>

      <h1 className="mb-2 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        전체 단어 목록
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        모든 한자단어장의 단어를 한 화면에서 확인합니다. · {total}개
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {tab("all", "전체")}
        {tab("yes", "암기 단어")}
        {tab("no", "미암기 단어")}
      </div>

      {rows.length === 0 ? (
        <div className="col-span-5 flex min-h-[200px] items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 py-16 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
          해당 조건의 단어가 없습니다.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4">
            {rows.map((r) => {
              const readings = kanjiReadings.get(r.word);
              return (
                <WordbookCard
                  key={`${r.wordbookId}-${r.no}-${r.word}`}
                  wordbookId={r.wordbookId}
                  wordbookName={r.wordbookName}
                  allWordsMemorizedMode={memorizedModeParam}
                  row={{
                    no: r.no,
                    word: r.word,
                    reading: r.reading,
                    meaning: r.meaning,
                    level: r.level,
                    created_at: r.created_at,
                  }}
                  onyomi={readings?.onyomi}
                  kunyomi={readings?.kunyomi}
                  shapeExplanation={readings?.shape_explanation}
                  memorized={r.memorized}
                  memorized_at={r.memorized_at}
                  reviewed_at={r.reviewed_at}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
              aria-label="페이지 이동"
            >
              {currentPage > 1 && (
                <Link
                  href={buildUrl(currentPage - 1, memorizedModeParam)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  이전
                </Link>
              )}
              <span className="flex items-center gap-2 px-2">
                {pageNumbers.map((p) =>
                  p === currentPage ? (
                    <span
                      key={p}
                      className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg bg-zinc-800 font-semibold tabular-nums text-white dark:bg-zinc-200 dark:text-zinc-900"
                    >
                      {p}
                    </span>
                  ) : (
                    <Link
                      key={p}
                      href={buildUrl(p, memorizedModeParam)}
                      className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-zinc-300 text-sm font-semibold tabular-nums text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {p}
                    </Link>
                  )
                )}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={buildUrl(
                    Math.min(currentPage + PAGE_GROUP, totalPages),
                    memorizedModeParam
                  )}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  다음
                </Link>
              )}
            </nav>
          )}

          <p className="mt-4 text-center text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
            {total > 0 &&
              `${start + 1}-${Math.min(start + PER_PAGE, total)} / ${total}`}
          </p>
        </>
      )}
    </div>
  );
}
