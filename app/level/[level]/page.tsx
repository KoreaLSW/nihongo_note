import Link from "next/link";
import { getKanjiByLevel } from "@/lib/kanji";
import { getNoteWords } from "@/lib/note";
import { getWordbookList, getWordToWordbookIdsMap } from "@/lib/wordbook";
import { KanjiTableRow } from "./components/KanjiTableRow";

const PER_PAGE = 10;

type Props = {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function LevelPage({ params, searchParams }: Props) {
  const { level } = await params;
  const { page: pageParam, q: searchQuery } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const levelUpper = level.toUpperCase();

  const [
    { rows, total, totalPages, page: currentPage },
    noteWords,
    wordbooks,
    wordToWordbookIds,
  ] = await Promise.all([
    getKanjiByLevel(level, page, searchQuery),
    getNoteWords(),
    getWordbookList(),
    getWordToWordbookIdsMap(),
  ]);

  const queryString = searchQuery
    ? `q=${encodeURIComponent(searchQuery)}`
    : "";
  const pageUrl = (p: number) =>
    `/level/${level}?page=${p}${queryString ? `&${queryString}` : ""}`;

  const PAGE_GROUP = 10;
  const startPage = Math.floor((currentPage - 1) / PAGE_GROUP) * PAGE_GROUP + 1;
  const endPage = Math.min(startPage + PAGE_GROUP - 1, totalPages);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
          {levelUpper === "ALL" ? "All" : levelUpper} 한자 ({total}개)
        </h1>
        {searchQuery && (
          <span className="inline-flex items-center gap-2 rounded-lg bg-zinc-200/80 px-3 py-1.5 text-sm text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
            검색: &quot;{searchQuery}&quot;
            <Link
              href={`/level/${level}`}
              className="font-medium underline-offset-2 hover:underline"
            >
              초기화
            </Link>
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <table className="w-full min-w-[320px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-100/80 dark:border-zinc-700 dark:bg-zinc-800/80">
              <th className="w-16 px-4 py-3 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                no
              </th>
              <th className="w-24 px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                kanji
              </th>
              <th className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                meaning_quoted
              </th>
              <th className="w-24 px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                암기여부
              </th>
              <th className="w-20 px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                단어장
              </th>
              <th className="w-24 px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                한자단어장
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
                >
                  해당 레벨의 한자가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const includedIds = wordToWordbookIds.get(row.kanji);
                const includedWordbookIds = includedIds
                  ? Array.from(includedIds)
                  : [];
                return (
                  <KanjiTableRow
                    key={row.no}
                    row={row}
                    level={level}
                    isInVocabulary={noteWords.has(row.kanji)}
                    isMemorized={row.memorized === "yes"}
                    wordbooks={wordbooks}
                    includedWordbookIds={includedWordbookIds}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
          aria-label="페이지 이동"
        >
          {currentPage > 1 && (
            <Link
              href={pageUrl(currentPage - 1)}
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
                  href={pageUrl(p)}
                  className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-zinc-300 text-sm font-semibold tabular-nums text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {p}
                </Link>
              )
            )}
          </span>
          {currentPage < totalPages && (
            <Link
              href={pageUrl(Math.min(currentPage + 10, totalPages))}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              다음
            </Link>
          )}
        </nav>
      )}

      <p className="mt-4 text-center text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
        {total > 0 &&
          `${(currentPage - 1) * PER_PAGE + 1}-${Math.min(currentPage * PER_PAGE, total)} / ${total}`}
      </p>
    </div>
  );
}
