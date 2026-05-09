import Link from "next/link";
import { notFound } from "next/navigation";
import { getKanjiReadingsMap } from "@/lib/kanji";
import { getMemorizedMap } from "@/lib/memorized";
import { parseVocabulary2AllWordsMemorizedParam } from "@/lib/vocabulary2AllWordsNav";
import {
  getWordbookList,
  getWordbookMeta,
  getWordbookWords,
} from "@/lib/wordbook";
import { AddWordForm } from "../components/AddWordForm";
import { WordbookCard } from "../components/WordbookCard";
import { RenameWordbookForm } from "../components/RenameWordbookForm";

const PER_PAGE = 10;
const PAGE_GROUP = 10;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; memorized?: string }>;
};

export default async function WordbookDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const pageParam = sp.page ?? "1";
  const memorizedMode = parseVocabulary2AllWordsMemorizedParam(sp.memorized);
  const meta = getWordbookMeta(id);
  if (!meta) notFound();

  const memorizedMap = getMemorizedMap();
  const allWords = getWordbookWords(id);
  const filtered = allWords.filter((row) => {
    const memo = memorizedMap.get(row.word);
    const m = memo?.memorized ?? "no";
    if (memorizedMode === "yes") return m === "yes";
    if (memorizedMode === "no") return m !== "yes";
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PER_PAGE;
  const words = filtered.slice(start, start + PER_PAGE);

  const kanjiReadings = getKanjiReadingsMap();

  const startPage = Math.floor((currentPage - 1) / PAGE_GROUP) * PAGE_GROUP + 1;
  const endPage = Math.min(startPage + PAGE_GROUP - 1, totalPages);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  const buildListUrl = (
    wordbookId: string,
    p: number,
    mode: typeof memorizedMode
  ) => {
    const params = new URLSearchParams();
    if (mode !== "all") params.set("memorized", mode);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs
      ? `/vocabulary2/${wordbookId}?${qs}`
      : `/vocabulary2/${wordbookId}`;
  };

  const wordbooks = getWordbookList();
  const bookIndex = wordbooks.findIndex((w) => w.id === id);
  const prevBook = bookIndex > 0 ? wordbooks[bookIndex - 1] : undefined;
  const nextBook =
    bookIndex >= 0 && bookIndex < wordbooks.length - 1
      ? wordbooks[bookIndex + 1]
      : undefined;

  const tab = (mode: typeof memorizedMode, label: string) => {
    const active = memorizedMode === mode;
    return (
      <Link
        href={buildListUrl(id, 1, mode)}
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
        ← 단어장 목록
      </Link>

      <h1 className="mb-2 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        {meta.name}
      </h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {prevBook ? (
          <Link
            href={buildListUrl(prevBook.id, 1, memorizedMode)}
            title={prevBook.name}
            className="max-w-[min(100%,16rem)] truncate rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← 이전 단어장
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            ← 이전 단어장
          </span>
        )}
        {nextBook ? (
          <Link
            href={buildListUrl(nextBook.id, 1, memorizedMode)}
            title={nextBook.name}
            className="max-w-[min(100%,16rem)] truncate rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            다음 단어장 →
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            다음 단어장 →
          </span>
        )}
      </div>

      <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
        단어장에 {allWords.length}개
        {allWords.length > 0 && (
          <>
            {" · "}
            <Link
              href={`/vocabulary2/${id}/reorder`}
              className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              순서 변경
            </Link>
          </>
        )}
      </p>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        현재 조회 · {total}개
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {tab("all", "전체")}
        {tab("yes", "암기 단어")}
        {tab("no", "미암기 단어")}
      </div>

      <div className="mb-8">
        <RenameWordbookForm wordbookId={id} initialName={meta.name} />
      </div>

      <div className="mb-8">
        <AddWordForm wordbookId={id} />
      </div>

      <div className="grid grid-cols-5 grid-rows-2 gap-4">
        {allWords.length === 0 ? (
          <div className="col-span-5 row-span-2 flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 py-16 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
            아직 단어가 없습니다. 위 폼에서 단어를 추가해 보세요.
          </div>
        ) : words.length === 0 ? (
          <div className="col-span-5 row-span-2 flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 py-16 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
            해당 조건의 단어가 없습니다.
          </div>
        ) : (
          words.map((row) => {
            const memo = memorizedMap.get(row.word);
            const readings = kanjiReadings.get(row.word);
            return (
              <WordbookCard
                key={row.no}
                wordbookId={id}
                row={row}
                onyomi={readings?.onyomi}
                kunyomi={readings?.kunyomi}
                shapeExplanation={readings?.shape_explanation}
                memorized={memo?.memorized}
                memorized_at={memo?.memorized_at}
                reviewed_at={memo?.reviewed_at}
              />
            );
          })
        )}
      </div>

      {totalPages > 1 && total > 0 && (
        <nav
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
          aria-label="페이지 이동"
        >
          {currentPage > 1 && (
            <Link
              href={buildListUrl(id, currentPage - 1, memorizedMode)}
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
                  href={buildListUrl(id, p, memorizedMode)}
                  className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-zinc-300 text-sm font-semibold tabular-nums text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {p}
                </Link>
              )
            )}
          </span>
          {currentPage < totalPages && (
            <Link
              href={buildListUrl(
                id,
                Math.min(currentPage + PAGE_GROUP, totalPages),
                memorizedMode
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
          `${(currentPage - 1) * PER_PAGE + 1}-${Math.min(currentPage * PER_PAGE, total)} / ${total}`}
      </p>
    </div>
  );
}
