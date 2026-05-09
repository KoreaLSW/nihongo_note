import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGrammarWordbookMeta,
  getGrammarWordbookWords,
  getGrammarWordbookList,
} from "@/lib/grammarWordbook";
import { getGrammarMemorizedMap } from "@/lib/grammarMemorized";
import { AddGrammarForm } from "../components/AddGrammarForm";
import { GrammarWordbookCard } from "../components/GrammarWordbookCard";
import { RenameGrammarWordbookForm } from "../components/RenameGrammarWordbookForm";

const PER_PAGE = 10;
const PAGE_GROUP = 10;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function GrammarWordbookDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const meta = getGrammarWordbookMeta(id);
  if (!meta) notFound();

  const allWords = getGrammarWordbookWords(id);
  const total = allWords.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PER_PAGE;
  const words = allWords.slice(start, start + PER_PAGE);

  const memorizedMap = getGrammarMemorizedMap();

  const startPage = Math.floor((currentPage - 1) / PAGE_GROUP) * PAGE_GROUP + 1;
  const endPage = Math.min(startPage + PAGE_GROUP - 1, totalPages);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  const pageUrl = (p: number) =>
    p <= 1 ? `/grammar2/${id}` : `/grammar2/${id}?page=${p}`;

  return (
    <div className="p-8">
      <Link
        href="/grammar2"
        className="mb-6 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← 문법단어장 목록
      </Link>

      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
            {meta.name}
          </h1>
          <p className="mb-0 text-sm text-zinc-500 dark:text-zinc-400">
            {total}개 문법
          </p>
        </div>

        {total > 0 && (
          <Link
            href={`/grammar2/${id}/reorder`}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            순서 변경
          </Link>
        )}
      </div>

      <div className="mb-6">
        <RenameGrammarWordbookForm wordbookId={id} initialName={meta.name} />
      </div>

      <div className="mb-8">
        <AddGrammarForm wordbookId={id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {words.length === 0 ? (
          <div className="col-span-full rounded-xl border-2 border-dashed border-zinc-300 py-16 text-center text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
            아직 문법이 없습니다. 위 폼에서 문법을 추가해 보세요.
          </div>
        ) : (
          words.map((row) => {
            const memo = memorizedMap.get(row.grammar);
            return (
              <GrammarWordbookCard
                key={row.no}
                wordbookId={id}
                row={row}
                memorized={memo?.memorized}
                memorized_at={memo?.memorized_at}
              />
            );
          })
        )}
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
              href={pageUrl(Math.min(currentPage + PAGE_GROUP, totalPages))}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              다음
            </Link>
          )}
        </nav>
      )}

      <p className="mt-4 text-center text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
        {total > 0 &&
          `${(currentPage - 1) * PER_PAGE + 1}-${Math.min(
            currentPage * PER_PAGE,
            total
          )} / ${total}`}
      </p>
    </div>
  );
}

