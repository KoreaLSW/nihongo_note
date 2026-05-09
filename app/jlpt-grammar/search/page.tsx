import Link from "next/link";
import fs from "fs/promises";
import path from "path";

const LEVELS = ["n3", "n2", "n1"] as const;

type Props = {
  searchParams?: Promise<{ q?: string; page?: string }>;
};

type GrammarDetailItem = {
  no: number;
  title?: string;
  meaning?: string;
  connection?: string;
};

type SearchHit = GrammarDetailItem & { level: (typeof LEVELS)[number] };

async function loadGrammarDetail(level: (typeof LEVELS)[number]): Promise<GrammarDetailItem[]> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "grammar_json",
    `${level}_detail.json`
  );
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as GrammarDetailItem[]) : [];
}

function clampPage(p: number, totalPages: number): number {
  if (!Number.isFinite(p) || p < 1) return 1;
  if (totalPages < 1) return 1;
  return p > totalPages ? totalPages : p;
}

function buildSearchUrl(opts: { q: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (opts.q) sp.set("q", opts.q);
  if (opts.page && opts.page > 1) sp.set("page", String(opts.page));
  const qs = sp.toString();
  return qs ? `/jlpt-grammar/search?${qs}` : "/jlpt-grammar/search";
}

export default async function JlptGrammarSearchPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = String(sp.q ?? "").trim();
  const pageRaw = String(sp.page ?? "").trim();

  const query = q.toLowerCase();

  const lists = await Promise.all(
    LEVELS.map(async (lv) => {
      const items = await loadGrammarDetail(lv);
      return items.map((x) => ({ ...x, level: lv }) satisfies SearchHit);
    })
  );
  const all = lists.flat();

  const filtered = query
    ? all.filter((x) => {
        const hay = `${x.title ?? ""}\n${x.meaning ?? ""}\n${x.connection ?? ""}`.toLowerCase();
        return hay.includes(query);
      })
    : [];

  const PAGE_SIZE = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  const page = clampPage(requestedPage, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              JLPT 문법 검색
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {q ? (
                <>
                  검색어: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{q}</span>
                </>
              ) : (
                "검색어를 입력해 주세요."
              )}
            </p>
          </div>
          <Link
            href="/jlpt-grammar"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
          >
            홈으로
          </Link>
        </div>
      </div>

      {!q ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          `/jlpt-grammar`에서 검색어를 입력해 주세요.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          검색 결과가 없습니다.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {filtered.length}개 결과 · {page}/{totalPages} 페이지
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((item) => (
              <Link
                key={`${item.level}-${item.no}`}
                href={`/jlpt-grammar/${item.level}/${item.no}`}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-zinc-700 dark:bg-zinc-900/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-wide text-sky-700 dark:text-sky-300">
                      {item.level.toUpperCase()} · NO {item.no}
                    </div>
                    <div className="mt-1 line-clamp-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.title ?? "(제목 없음)"}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm text-zinc-400 transition group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-200">
                    →
                  </div>
                </div>

                {item.meaning ? (
                  <div className="mt-3 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="font-semibold">의미</span>: {item.meaning}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <Link
                aria-disabled={page <= 1}
                href={buildSearchUrl({ q, page: Math.max(1, page - 1) })}
                className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                  page <= 1
                    ? "pointer-events-none border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-600"
                    : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
                }`}
              >
                이전
              </Link>

              {Array.from({ length: totalPages }).slice(0, 50).map((_, i) => {
                const p = i + 1;
                const active = p === page;
                return (
                  <Link
                    key={p}
                    href={buildSearchUrl({ q, page: p })}
                    className={`min-w-10 rounded-xl border px-3 py-2 text-center text-sm font-semibold ${
                      active
                        ? "border-sky-500 bg-sky-100 text-sky-900 dark:border-sky-500 dark:bg-sky-900/40 dark:text-sky-100"
                        : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}

              <Link
                aria-disabled={page >= totalPages}
                href={buildSearchUrl({ q, page: Math.min(totalPages, page + 1) })}
                className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                  page >= totalPages
                    ? "pointer-events-none border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-600"
                    : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
                }`}
              >
                다음
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

