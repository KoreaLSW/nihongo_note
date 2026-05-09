import Link from "next/link";

const LEVELS = ["N3", "N2", "N1"] as const;

export default function JlptGrammarPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          JLPT 문법
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          레벨을 선택해서 JLPT 문법을 학습/정리하세요.
        </p>
      </div>

      <form action="/jlpt-grammar/search" className="mb-6">
        <label
          htmlFor="jlpt-grammar-search"
          className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-200"
        >
          문법 검색
        </label>
        <div className="flex gap-2">
          <input
            id="jlpt-grammar-search"
            name="q"
            type="search"
            placeholder="예) あいだ / ～てしまう / ように"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-700"
          >
            검색
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((lv) => (
          <Link
            key={lv}
            href={`/jlpt-grammar/${lv.toLowerCase()}`}
            className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {lv}
              </span>
              <span className="text-sm text-zinc-500 transition group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200">
                열기 →
              </span>
            </div>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              {lv} 문법 목록을 확인하고 검색할 수 있어요.
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-300">
        현재 화면은 <span className="font-semibold">JLPT 문법 전용</span>{" "}
        페이지예요. 기존 <Link className="underline" href="/grammar2">문법단어장</Link>{" "}
        과는 별개로 확장할 수 있게 분리해두었습니다.
      </div>
    </div>
  );
}

