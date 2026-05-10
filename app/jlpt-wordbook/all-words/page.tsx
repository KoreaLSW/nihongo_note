import Link from "next/link";
import { JlptWordRowActions } from "../components/JlptWordRowActions";
import {
  appendJlptWordbookFilterToSearchParams,
  canonicalizeWordbookIdsForUrl,
  filterJlptLevelAllWordsFlat,
  getJlptLevelAllWordsFlatRows,
  resolveJlptLevelWordbookIdsForAllWords,
} from "@/lib/jlptWordbookAllWords";
import {
  parseJlptWordbookAllWordsMemorizedParam,
  type JlptWordbookAllWordsMemorizedMode,
} from "@/lib/jlptWordbookAllWordsNav";
import { getJlptWordbookList, JLPT_LEVELS, normalizeJlptLevel } from "@/lib/jlptWordbook";

const PER_PAGE = 12;
const PAGE_GROUP = 10;

type Props = {
  searchParams?: Promise<{
    level?: string;
    memorized?: string;
    page?: string;
    q?: string;
    wb?: string | string[];
    nowb?: string | string[];
  }>;
};

function pickNowb(raw: string | string[] | undefined): "1" | undefined {
  if (raw === undefined) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === "1" ? "1" : undefined;
}

function buildUrl(
  level: string,
  opts: {
    page?: number;
    memorized?: JlptWordbookAllWordsMemorizedMode;
    q?: string;
    wordbookIds?: string[] | undefined;
  }
) {
  const params = new URLSearchParams();
  params.set("level", level);
  const mem = opts.memorized ?? "all";
  if (mem !== "all") params.set("memorized", mem);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const q = String(opts.q ?? "").trim();
  if (q) params.set("q", q);
  appendJlptWordbookFilterToSearchParams(params, opts.wordbookIds);
  return `/jlpt-wordbook/all-words?${params.toString()}`;
}

function buildQuizUrl(
  level: string,
  memorized: JlptWordbookAllWordsMemorizedMode,
  wordbookIds: string[] | undefined
) {
  const params = new URLSearchParams();
  params.set("level", level);
  if (memorized !== "all") params.set("memorized", memorized);
  appendJlptWordbookFilterToSearchParams(params, wordbookIds);
  const qs = params.toString();
  return qs ? `/jlpt-wordbook/all-words/quiz?${qs}` : "/jlpt-wordbook/all-words/quiz";
}

export default async function JlptWordbookAllWordsPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : undefined;
  const selectedLevel = normalizeJlptLevel(sp?.level || "n5");
  const memorizedMode = parseJlptWordbookAllWordsMemorizedParam(sp?.memorized);
  const page = Math.max(1, parseInt(sp?.page ?? "1", 10) || 1);
  const query = String(sp?.q ?? "").trim();

  const { wordbookIds: resolvedWordbookIds } = await resolveJlptLevelWordbookIdsForAllWords(
    selectedLevel,
    {
      wb: sp?.wb,
      nowb: pickNowb(sp?.nowb),
    }
  );
  const wordbookIdsForUrl = await canonicalizeWordbookIdsForUrl(
    selectedLevel,
    resolvedWordbookIds
  );

  const flat = await getJlptLevelAllWordsFlatRows(selectedLevel, {
    wordbookIds: resolvedWordbookIds,
  });
  const filteredByMemo = filterJlptLevelAllWordsFlat(flat, memorizedMode);
  const searched = query
    ? filteredByMemo.filter((w) => {
        const qv = query.toLowerCase();
        return (
          w.word.toLowerCase().includes(qv) ||
          w.meaning.toLowerCase().includes(qv) ||
          w.hiragana.toLowerCase().includes(qv) ||
          w.wordbookName.toLowerCase().includes(qv)
        );
      })
    : filteredByMemo;

  const total = searched.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PER_PAGE;
  const pageWords = searched.slice(start, start + PER_PAGE);

  const startPage = Math.floor((currentPage - 1) / PAGE_GROUP) * PAGE_GROUP + 1;
  const endPage = Math.min(startPage + PAGE_GROUP - 1, totalPages);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  const levelWordbookCount = (await getJlptWordbookList(selectedLevel)).length;
  const levelWordbookIdsForUrl = new Map<string, string[] | undefined>();
  for (const level of JLPT_LEVELS) {
    const resolved = await resolveJlptLevelWordbookIdsForAllWords(level, {
      wb: sp?.wb,
      nowb: pickNowb(sp?.nowb),
    });
    levelWordbookIdsForUrl.set(
      level,
      await canonicalizeWordbookIdsForUrl(level, resolved.wordbookIds)
    );
  }
  const scopeNote =
    resolvedWordbookIds === undefined
      ? "이 레벨의 모든 단어장"
      : resolvedWordbookIds.length === 0
        ? "선택된 단어장 없음"
        : `선택된 단어장 ${resolvedWordbookIds.length}개`;

  const tab = (mode: JlptWordbookAllWordsMemorizedMode, label: string) => {
    const active = memorizedMode === mode;
    return (
      <Link
        href={buildUrl(selectedLevel, {
          memorized: mode,
          page: 1,
          q: query,
          wordbookIds: wordbookIdsForUrl,
        })}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="p-8">
      <Link
        href={`/jlpt-wordbook?level=${selectedLevel}`}
        className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← {selectedLevel.toUpperCase()} 단어장 목록
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        {selectedLevel.toUpperCase()} 레벨 전체 단어
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {scopeNote} · {total}개
      </p>

      <div className="mb-4 mt-6 flex flex-wrap gap-2">
        {JLPT_LEVELS.map((level) => {
          const isActive = selectedLevel === level;
          return (
            <Link
              key={level}
              href={buildUrl(level, {
                memorized: memorizedMode,
                page: 1,
                q: query,
                wordbookIds: levelWordbookIdsForUrl.get(level),
              })}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/50 dark:text-emerald-100"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {level.toUpperCase()}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">조회:</span>
        {tab("all", "전체")}
        {tab("yes", "암기 단어")}
        {tab("no", "미완전")}
        {tab("word", "단어만 암기")}
        {tab("meaning", "뜻만 암기")}
      </div>
      <p className="mt-2 max-w-xl text-xs text-zinc-500 dark:text-zinc-400">
        암기 단어: 세 표시 모드 모두 암기. 단어만/뜻만 암기: 해당 퀴즈에서만 암기 처리된 단어(다른 조건과 겹칠 수 있음).
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">퀴즈:</span>
        <Link
          href={buildQuizUrl(selectedLevel, memorizedMode, wordbookIdsForUrl)}
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
        >
          현재 조건으로 퀴즈
        </Link>
      </div>

      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        method="get"
        action="/jlpt-wordbook/all-words"
      >
        <input type="hidden" name="level" value={selectedLevel} />
        {memorizedMode !== "all" && (
          <input type="hidden" name="memorized" value={memorizedMode} />
        )}
        {wordbookIdsForUrl === undefined ? null : wordbookIdsForUrl.length === 0 ? (
          <input type="hidden" name="nowb" value="1" />
        ) : (
          wordbookIdsForUrl.map((id) => <input key={id} type="hidden" name="wb" value={id} />)
        )}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">검색</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="단어, 뜻, 히라가나, 단어장 이름"
            className="w-72 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500"
        >
          검색
        </button>
        {query && (
          <Link
            href={buildUrl(selectedLevel, {
              memorized: memorizedMode,
              page: 1,
              wordbookIds: wordbookIdsForUrl,
            })}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            초기화
          </Link>
        )}
      </form>

      {levelWordbookCount === 0 ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
          {selectedLevel.toUpperCase()} 단어장이 없습니다.
        </div>
      ) : resolvedWordbookIds !== undefined && resolvedWordbookIds.length === 0 ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
          포함된 단어장이 없습니다. 단어장 목록에서 단어장을 선택한 뒤 다시 들어오세요.
        </div>
      ) : flat.length === 0 ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
          단어장에 아직 단어가 없습니다.
        </div>
      ) : searched.length === 0 ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
          해당 조건의 단어가 없습니다.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageWords.map((row) => (
              <div
                key={`${row.wordbookId}-${row.no}-${row.word}`}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {row.word}
                    </p>
                    <p className="mt-1 text-base text-zinc-700 dark:text-zinc-200">
                      뜻: {row.meaning}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      히라가나: {row.hiragana || "-"}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      단어장:{" "}
                      <Link
                        href={`/jlpt-wordbook/${row.wordbookId}`}
                        className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                      >
                        {row.wordbookName}
                      </Link>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    {row.memorized === "yes" && (
                      <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-900 dark:bg-violet-900/40 dark:text-violet-100">
                        세 모드 완전 암기
                      </span>
                    )}
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                        row.memorized_word === "yes"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      단어 {row.memorized_word === "yes" ? "✓" : "○"}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                        row.memorized_meaning === "yes"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      뜻 {row.memorized_meaning === "yes" ? "✓" : "○"}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                        row.memorized_hiragana === "yes"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      히라 {row.memorized_hiragana === "yes" ? "✓" : "○"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <p>
                    모드별 암기일: 단어 {row.memorized_word_at || "-"} · 뜻{" "}
                    {row.memorized_meaning_at || "-"} · 히라 {row.memorized_hiragana_at || "-"}
                  </p>
                  <p>완전 암기일: {row.memorized_at || "-"}</p>
                  <p>추가한 날짜: {row.created_at || "-"}</p>
                </div>

                <div className="mt-3">
                  <JlptWordRowActions wordbookId={row.wordbookId} row={row} />
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
              aria-label="페이지 이동"
            >
              {currentPage > 1 && (
                <Link
                  href={buildUrl(selectedLevel, {
                    page: currentPage - 1,
                    memorized: memorizedMode,
                    q: query,
                    wordbookIds: wordbookIdsForUrl,
                  })}
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
                      href={buildUrl(selectedLevel, {
                        page: p,
                        memorized: memorizedMode,
                        q: query,
                        wordbookIds: wordbookIdsForUrl,
                      })}
                      className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-zinc-300 text-sm font-semibold tabular-nums text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {p}
                    </Link>
                  )
                )}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={buildUrl(selectedLevel, {
                    page: Math.min(currentPage + PAGE_GROUP, totalPages),
                    memorized: memorizedMode,
                    q: query,
                    wordbookIds: wordbookIdsForUrl,
                  })}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  다음
                </Link>
              )}
            </nav>
          )}

          <p className="mt-4 text-center text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
            {total > 0 && `${start + 1}-${Math.min(start + PER_PAGE, total)} / ${total}`}
          </p>
        </>
      )}
    </div>
  );
}
