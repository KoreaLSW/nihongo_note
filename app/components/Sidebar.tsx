"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

const levelLinkBase = (level: string) =>
  level === "all" ? "/level/all" : `/level/${level.toLowerCase()}`;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const match = pathname.match(/^\/level\/(all|n[1-5])/i);
  const currentLevel = match ? match[1] : "all";

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(
      `/level/${currentLevel}?q=${encodeURIComponent(q)}&page=1`
    );
  };

  const isLevelActive = (level: string) => {
    const base = levelLinkBase(level);
    return pathname === base || pathname.startsWith(base + "/");
  };
  const isQuizActive = pathname.startsWith("/quiz");
  const isVocabActive = pathname.startsWith("/vocabulary");
  const isVocab2Active = pathname.startsWith("/vocabulary2");
  const isGrammar2Active = pathname.startsWith("/grammar2");
  const isJlptGrammarActive = pathname.startsWith("/jlpt-grammar");
  const isJlptWordbookActive = pathname.startsWith("/jlpt-wordbook");

  const levelLinkClass = (active: boolean) =>
    active
      ? "block rounded-lg px-3 py-2.5 text-sm font-medium bg-zinc-200/80 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
      : "block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200/80 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

  return (
    <aside className="flex h-full w-56 flex-col border-r border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/80">
      {/* 헤더 */}
      <div className="border-b border-zinc-200 px-4 py-5 dark:border-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          나만의 단어장
        </h2>
      </div>

      {/* 검색 */}
      <form
        onSubmit={handleSearch}
        className="border-b border-zinc-200 px-3 py-4 dark:border-zinc-800"
      >
        <label htmlFor="sidebar-search" className="sr-only">
          meaning_quoted 검색
        </label>
        <div className="flex gap-1">
          <input
            id="sidebar-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="meaning_quoted 검색"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500"
          >
            검색
          </button>
        </div>
      </form>

      {/* 레벨 선택 */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          레벨
        </p>
        <ul className="space-y-0.5">
          <li>
            <Link
              href="/level/all"
              className={levelLinkClass(isLevelActive("all"))}
            >
              All
            </Link>
          </li>
          {LEVELS.map((level) => (
            <li key={level}>
              <Link
                href={levelLinkBase(level)}
                className={levelLinkClass(isLevelActive(level.toLowerCase()))}
              >
                {level}
              </Link>
            </li>
          ))}
        </ul>

        {/* 퀴즈 / 단어장 버튼 */}
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/jlpt-grammar"
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
              isJlptGrammarActive
                ? "border-sky-500 bg-sky-100 text-sky-900 dark:border-sky-500 dark:bg-sky-900/50 dark:text-sky-100"
                : "border-sky-300 text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-900/30"
            }`}
          >
            JLPT문법
          </Link>
          <Link
            href="/quiz"
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              isQuizActive
                ? "bg-amber-600 text-white dark:bg-amber-600"
                : "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
            }`}
          >
            퀴즈
          </Link>
          <Link
            href="/vocabulary"
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
              isVocabActive
                ? "border-zinc-500 bg-zinc-200/80 text-zinc-900 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-200/80 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            단어장
          </Link>
          <Link
            href="/vocabulary2"
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
              isVocab2Active
                ? "border-violet-500 bg-violet-100 text-violet-900 dark:border-violet-500 dark:bg-violet-900/50 dark:text-violet-100"
                : "border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30"
            }`}
          >
            한자단어장
          </Link>

          <Link
            href="/grammar2"
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
              isGrammar2Active
                ? "border-amber-500 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-900/50 dark:text-amber-100"
                : "border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
            }`}
          >
            문법단어장
          </Link>
          <Link
            href="/jlpt-wordbook"
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
              isJlptWordbookActive
                ? "border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/50 dark:text-emerald-100"
                : "border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            }`}
          >
            JLPT단어장
          </Link>
        </div>
      </nav>
    </aside>
  );
}
