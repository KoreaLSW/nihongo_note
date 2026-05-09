import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getKanjiDetail } from "@/lib/kanji";

type Props = {
  params: Promise<{ level: string; no: string }>;
};

export default async function KanjiDetailPage({ params }: Props) {
  const { level, no } = await params;
  const detail = getKanjiDetail(no, level);
  if (!detail) notFound();

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href={`/level/${level}`}
          className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          ← 목록으로
        </Link>
        <span className="text-zinc-400 dark:text-zinc-500">|</span>
        {detail.prevNo ? (
          <Link
            href={`/level/${level}/kanji/${detail.prevNo}`}
            className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            ← 이전 한자
          </Link>
        ) : (
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            ← 이전 한자
          </span>
        )}
        {detail.nextNo ? (
          <Link
            href={`/level/${level}/kanji/${detail.nextNo}`}
            className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            다음 한자 →
          </Link>
        ) : (
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            다음 한자 →
          </span>
        )}
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        {detail.imageUrl && (
          <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <Image
              src={detail.imageUrl}
              alt={detail.kanji}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}
        {!detail.imageUrl && (
          <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-6xl text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-500">
            {detail.kanji}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {detail.kanji}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              No. {detail.no} · {detail.level}
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-1">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                meaning_quoted
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {detail.meaning_quoted}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                meaning
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {detail.meaning}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                음독 (onyomi)
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {detail.onyomi}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                훈독 (kunyomi)
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {detail.kunyomi}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                암기여부
              </dt>
              <dd className="mt-1 font-medium text-zinc-800 dark:text-zinc-200">
                {detail.memorized === "yes" ? "암기" : "미암기"}
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
            {detail.shape_explanation}
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            음독 상세 (onyomi_detail)
          </h2>
          <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {detail.onyomi_detail}
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            훈독 상세 (kunyomi_detail)
          </h2>
          <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {detail.kunyomi_detail}
          </p>
        </section>
      </div>
    </div>
  );
}
