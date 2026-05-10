import Link from "next/link";
import { notFound } from "next/navigation";
import { getGrammarWordbookList, getGrammarWordbookWords } from "@/lib/grammarWordbook";
import {
  getJlptGrammarItems,
  JLPT_GRAMMAR_LEVELS as LEVELS,
} from "@/lib/jlptGrammar";

type Props = {
  params: Promise<{ level: string }>;
  searchParams?: Promise<{ q?: string; page?: string }>;
};

function normalizeAudioUrl(u: string): string {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  // 일부 데이터가 "/wp-content/..." 형태로 들어옴
  return `https://nihongo.co.kr${s.startsWith("/") ? "" : "/"}${s}`;
}

function clampPage(p: number, totalPages: number): number {
  if (!Number.isFinite(p) || p < 1) return 1;
  if (totalPages < 1) return 1;
  return p > totalPages ? totalPages : p;
}

function buildLevelUrl(level: string, opts: { q?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (opts.q) sp.set("q", opts.q);
  if (opts.page && opts.page > 1) sp.set("page", String(opts.page));
  const qs = sp.toString();
  return qs ? `/jlpt-grammar/${level}?${qs}` : `/jlpt-grammar/${level}`;
}

export default async function JlptGrammarLevelPage({ params, searchParams }: Props) {
  const { level: rawLevel } = await params;
  const level = String(rawLevel ?? "").toLowerCase();
  if (!LEVELS.includes(level as (typeof LEVELS)[number])) notFound();

  const sp = (await searchParams) ?? {};
  const q = String(sp.q ?? "").trim();
  const pageRaw = String(sp.page ?? "").trim();

  const detailList = await getJlptGrammarItems(level as (typeof LEVELS)[number]);
  const query = q.toLowerCase();
  const filtered = query
    ? detailList.filter((x) => {
        const hay = `${x.title ?? ""}\n${x.meaning ?? ""}\n${x.connection ?? ""}`.toLowerCase();
        return hay.includes(query);
      })
    : detailList;

  const PAGE_SIZE = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  const page = clampPage(requestedPage, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const wordbooks = await getGrammarWordbookList();
  const inWordbookSet = new Set<string>();
  for (const wb of wordbooks) {
    for (const w of await getGrammarWordbookWords(wb.id)) {
      const g = String(w.grammar ?? "").trim();
      if (g) inWordbookSet.add(g);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              JLPT 문법 {level.toUpperCase()}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              이 레벨 전용 문법 페이지입니다.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/jlpt-grammar"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
            >
              레벨 선택으로
            </Link>
            <Link
              href="/grammar2"
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
            >
              문법단어장 열기
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            검색어:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {q ? q : "없음"}
            </span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {filtered.length}개 / 전체 {detailList.length}개 · {page}/{totalPages} 페이지
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            표시할 항목이 없습니다.
          </div>
        ) : (
          <div className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((item) => (
              <Link
                key={item.no}
                href={`/jlpt-grammar/${level}/${item.no}`}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-zinc-700 dark:bg-zinc-900/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-wide text-sky-700 dark:text-sky-300">
                      NO {item.no}
                    </div>
                    <div className="mt-1 line-clamp-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.title ?? "(제목 없음)"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.memorized === "yes" ? (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                        암기
                      </span>
                    ) : null}
                    {inWordbookSet.has(String(item.title ?? "").trim()) ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                        추가됨
                      </span>
                    ) : null}
                    <div className="text-sm text-zinc-400 transition group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-200">
                      →
                    </div>
                  </div>
                </div>

                {item.meaning ? (
                  <div className="mt-3 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="font-semibold">의미</span>: {item.meaning}
                  </div>
                ) : null}

                {item.connection ? (
                  <div className="mt-3 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {item.connection}
                  </div>
                ) : null}
              </Link>
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <Link
                  aria-disabled={page <= 1}
                  href={buildLevelUrl(level, { q, page: Math.max(1, page - 1) })}
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
                      href={buildLevelUrl(level, { q, page: p })}
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
                  href={buildLevelUrl(level, { q, page: Math.min(totalPages, page + 1) })}
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
    </div>
  );
}

