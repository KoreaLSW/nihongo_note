import Link from 'next/link';
import { getKanjiReadingsMapForWords } from '@/lib/kanji';
import { getNotes } from '@/lib/note';
import { VocabularyCard } from './components/VocabularyCard';
import { VocabularyDateFilter } from './components/VocabularyDateFilter';

const PER_PAGE = 10;

type Props = {
    searchParams: Promise<{ page?: string; level?: string; q?: string; memorized?: string; date?: string }>;
};

export default async function VocabularyPage({ searchParams }: Props) {
    const {
        page: pageParam,
        level: levelParam,
        q: searchQuery,
        memorized: memorizedParam,
        date: dateParam,
    } = await searchParams;
    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const level = levelParam ?? 'all';
    const memorized = memorizedParam ?? 'all';
    const date = dateParam ?? '';

    const {
        rows,
        total,
        totalPages,
        page: currentPage,
    } = await getNotes(
        page,
        level === 'all' ? undefined : level,
        searchQuery,
        memorized === 'all' ? undefined : memorized,
        date || undefined
    );
    const kanjiReadings = await getKanjiReadingsMapForWords(
        rows.map((r) => r.word),
    );

    const PAGE_GROUP = 10;
    const startPage =
        Math.floor((currentPage - 1) / PAGE_GROUP) * PAGE_GROUP + 1;
    const endPage = Math.min(startPage + PAGE_GROUP - 1, totalPages);
    const pageNumbers = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i,
    );

    const buildUrl = (p: number, l?: string, q?: string, m?: string, d?: string) => {
        const params = new URLSearchParams();
        if (p > 1) params.set('page', String(p));
        if (l && l !== 'all') params.set('level', l);
        if (q?.trim()) params.set('q', q.trim());
        if (m && m !== 'all') params.set('memorized', m);
        if (d?.trim()) params.set('date', d.trim());
        const s = params.toString();
        return s ? `/vocabulary?${s}` : '/vocabulary';
    };
    const pageUrl = (p: number) => buildUrl(p, level, searchQuery ?? '', memorized, date);

    return (
        <div className='p-8'>
            <h1 className='mb-6 text-2xl font-semibold text-zinc-800 dark:text-zinc-200'>
                단어장
            </h1>

            <div className='mb-6 flex flex-wrap items-center gap-4'>
                <div className='flex gap-2'>
                    {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map((l) => (
                        <Link
                            key={l}
                            href={buildUrl(
                                1,
                                l === 'all' ? undefined : l.toLowerCase(),
                                searchQuery ?? '',
                                memorized,
                                date,
                            )}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                (level === 'all' && l === 'all') ||
                                level.toUpperCase() === l.toUpperCase()
                                    ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                            }`}
                        >
                            {l}
                        </Link>
                    ))}
                </div>
                <div className='flex gap-2'>
                    {(['all', 'yes', 'no'] as const).map((m) => {
                        const labels = { all: '전체', yes: '암기', no: '미암기' };
                        return (
                            <Link
                                key={m}
                                href={buildUrl(1, level, searchQuery ?? '', m, date)}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    memorized === m
                                        ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                                }`}
                            >
                                {labels[m]}
                            </Link>
                        );
                    })}
                </div>
                <VocabularyDateFilter
                    currentDate={date}
                    level={level}
                    searchQuery={searchQuery ?? ''}
                    memorized={memorized}
                />
                {searchQuery && (
                    <span className='text-sm text-zinc-500 dark:text-zinc-400'>
                        검색: &quot;{searchQuery}&quot;
                    </span>
                )}
            </div>

            <div className='grid grid-cols-5 grid-rows-2 gap-4'>
                {rows.length === 0 ? (
                    <div className='col-span-5 row-span-2 flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 py-16 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400'>
                        단어가 없습니다. 단어장에 데이터를 추가해 보세요.
                    </div>
                ) : (
                    rows.map((row) => (
                        <VocabularyCard
                            key={row.no}
                            row={row}
                            onyomi={kanjiReadings.get(row.word)?.onyomi}
                            kunyomi={kanjiReadings.get(row.word)?.kunyomi}
                            shapeExplanation={kanjiReadings.get(row.word)?.shape_explanation}
                        />
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <nav
                    className='mt-6 flex flex-wrap items-center justify-center gap-2'
                    aria-label='페이지 이동'
                >
                    {currentPage > 1 && (
                        <Link
                            href={pageUrl(currentPage - 1)}
                            className='rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        >
                            이전
                        </Link>
                    )}
                    <span className='flex items-center gap-2 px-2'>
                        {pageNumbers.map((p) =>
                            p === currentPage ? (
                                <span
                                    key={p}
                                    className='flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg bg-zinc-800 font-semibold tabular-nums text-white dark:bg-zinc-200 dark:text-zinc-900'
                                >
                                    {p}
                                </span>
                            ) : (
                                <Link
                                    key={p}
                                    href={pageUrl(p)}
                                    className='flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-zinc-300 text-sm font-semibold tabular-nums text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800'
                                >
                                    {p}
                                </Link>
                            ),
                        )}
                    </span>
                    {currentPage < totalPages && (
                        <Link
                            href={pageUrl(
                                Math.min(currentPage + 10, totalPages),
                            )}
                            className='rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        >
                            다음
                        </Link>
                    )}
                </nav>
            )}

            <p className='mt-4 text-center text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200'>
                {total > 0 &&
                    `${(currentPage - 1) * PER_PAGE + 1}-${Math.min(currentPage * PER_PAGE, total)} / ${total}`}
            </p>
        </div>
    );
}
