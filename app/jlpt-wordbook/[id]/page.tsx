import Link from 'next/link';
import { AddJlptWordForm } from '../components/AddJlptWordForm';
import { UploadJlptCsvForm } from '../components/UploadJlptCsvForm';
import { DeleteJlptWordbookButton } from '../components/DeleteJlptWordbookButton';
import { RenameJlptWordbookForm } from '../components/RenameJlptWordbookForm';
import { JlptWordRowActions } from '../components/JlptWordRowActions';
import {
    filterJlptWordbookRowsForQuiz,
    parseJlptMemorizedListParam,
    parseJlptWordbookListAxisParam,
    type JlptQuizDisplayView,
    type JlptWordbookRow,
} from '@/lib/jlptWordbookShared';
import {
    getJlptKanjiCardInfoMap,
    getJlptKanjiLinesForWordFromMap,
    type JlptWordKanjiLine,
} from '@/lib/kanji';
import { getJlptWordbookMeta, getJlptWordbookWords } from '@/lib/jlptWordbook';

type Props = {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{
        page?: string;
        memorized?: string;
        q?: string;
        axis?: string;
    }>;
};

type MainMemorizedTab = 'all' | 'yes' | 'no';

const PER_PAGE = 12;
const PAGE_GROUP = 10;

export default async function JlptWordbookDetailPage({
    params,
    searchParams,
}: Props) {
    const { id } = await params;
    const qp = searchParams ? await searchParams : undefined;
    const page = Math.max(1, parseInt(qp?.page ?? '1', 10) || 1);
    const memorizedFilter = parseJlptMemorizedListParam(qp?.memorized);
    const axisDisplay = parseJlptWordbookListAxisParam(qp?.axis);
    const query = String(qp?.q ?? '').trim();

    const mainMemorizedTab: MainMemorizedTab =
        memorizedFilter === 'all'
            ? 'all'
            : memorizedFilter === 'no'
              ? 'no'
              : 'yes';

    const axisTabHighlight: JlptQuizDisplayView =
        memorizedFilter === 'word'
            ? 'word'
            : memorizedFilter === 'meaning'
              ? 'meaning'
              : axisDisplay;
    const meta = await getJlptWordbookMeta(id);
    if (!meta) {
        return (
            <div className='p-8'>
                <p className='text-zinc-600 dark:text-zinc-400'>
                    단어장을 찾을 수 없습니다.
                </p>
            </div>
        );
    }

    const allWords: JlptWordbookRow[] = await getJlptWordbookWords(id);
    const words =
        memorizedFilter === 'all'
            ? allWords
            : filterJlptWordbookRowsForQuiz(
                  allWords,
                  memorizedFilter,
                  axisDisplay,
              );
    const searchedWords = query
        ? words.filter((w) => {
              const q = query.toLowerCase();
              return (
                  w.word.toLowerCase().includes(q) ||
                  w.meaning.toLowerCase().includes(q) ||
                  w.hiragana.toLowerCase().includes(q)
              );
          })
        : words;
    const total = searchedWords.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const start = (currentPage - 1) * PER_PAGE;
    const pageWords = searchedWords.slice(start, start + PER_PAGE);

    let pageCards: { row: JlptWordbookRow; kanjiLines: JlptWordKanjiLine[] }[] =
        [];
    if (words.length > 0) {
        const jlptKanjiCardMap = await getJlptKanjiCardInfoMap();
        pageCards = pageWords.map((row) => ({
            row,
            kanjiLines: getJlptKanjiLinesForWordFromMap(row.word, jlptKanjiCardMap),
        }));
    }
    const startPage =
        Math.floor((currentPage - 1) / PAGE_GROUP) * PAGE_GROUP + 1;
    const endPage = Math.min(startPage + PAGE_GROUP - 1, totalPages);
    const pageNumbers = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i,
    );
    const appendMemorizedAndAxis = (params: URLSearchParams) => {
        if (memorizedFilter !== 'all') params.set('memorized', memorizedFilter);
        if (
            (memorizedFilter === 'yes' || memorizedFilter === 'no') &&
            axisDisplay !== 'full'
        ) {
            params.set('axis', axisDisplay);
        }
        if (query) params.set('q', query);
    };

    const buildPageHref = (p: number) => {
        const params = new URLSearchParams();
        if (p > 1) params.set('page', String(p));
        appendMemorizedAndAxis(params);
        const qs = params.toString();
        return qs ? `/jlpt-wordbook/${id}?${qs}` : `/jlpt-wordbook/${id}`;
    };

    const buildMainTabHref = (tab: MainMemorizedTab) => {
        const params = new URLSearchParams();
        if (tab === 'yes') params.set('memorized', 'yes');
        else if (tab === 'no') params.set('memorized', 'no');
        if (query) params.set('q', query);
        const qs = params.toString();
        return qs ? `/jlpt-wordbook/${id}?${qs}` : `/jlpt-wordbook/${id}`;
    };

    const buildAxisHref = (axis: JlptQuizDisplayView) => {
        const params = new URLSearchParams();
        if (mainMemorizedTab === 'yes') params.set('memorized', 'yes');
        else params.set('memorized', 'no');
        if (axis !== 'full') params.set('axis', axis);
        if (query) params.set('q', query);
        const qs = params.toString();
        return qs ? `/jlpt-wordbook/${id}?${qs}` : `/jlpt-wordbook/${id}`;
    };

    const hrefSearchResetBase = () => {
        const params = new URLSearchParams();
        appendMemorizedAndAxis(params);
        const qs = params.toString();
        return qs ? `/jlpt-wordbook/${id}?${qs}` : `/jlpt-wordbook/${id}`;
    };

    return (
        <div className='p-8'>
            <Link
                href={`/jlpt-wordbook?level=${meta.level}`}
                className='inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            >
                ← {meta.level.toUpperCase()} 단어장 목록
            </Link>

            <h1 className='mt-4 text-2xl font-semibold text-zinc-800 dark:text-zinc-200'>
                {meta.name}
            </h1>
            <div className='mt-3'>
                <DeleteJlptWordbookButton
                    wordbookId={id}
                    redirectLevel={meta.level}
                />
            </div>
            <div className='mt-4'>
                <RenameJlptWordbookForm
                    wordbookId={id}
                    initialName={meta.name}
                />
            </div>

            <div className='mt-6'>
                <AddJlptWordForm wordbookId={id} />
            </div>

            <div className='mt-4'>
                <UploadJlptCsvForm wordbookId={id} />
            </div>

            <div className='mt-6 flex flex-wrap items-center gap-2'>
                <span className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                    조회:
                </span>
                {(
                    [
                        ['all', '전체'],
                        ['yes', '암기 단어'],
                        ['no', '미암기 단어'],
                    ] as const
                ).map(([mode, label]) => {
                    const tab = mode as MainMemorizedTab;
                    const isActive = mainMemorizedTab === tab;
                    return (
                        <Link
                            key={mode}
                            href={buildMainTabHref(tab)}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                isActive
                                    ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                            }`}
                        >
                            {label}
                        </Link>
                    );
                })}
            </div>

            {(mainMemorizedTab === 'yes' || mainMemorizedTab === 'no') && (
                <div className='mt-3 flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                        {mainMemorizedTab === 'yes'
                            ? '암기 축별:'
                            : '미암기 축별:'}
                    </span>
                    {(mainMemorizedTab === 'yes'
                        ? ([
                              ['full', '전체 암기'],
                              ['word', '단어만 암기'],
                              ['meaning', '뜻만 암기'],
                              ['hiragana', '히라가나만 암기'],
                          ] as const)
                        : ([
                              ['full', '전체 미암기'],
                              ['word', '단어만 미암기'],
                              ['meaning', '뜻만 미암기'],
                              ['hiragana', '히라가나만 미암기'],
                          ] as const)
                    ).map(([axis, label]) => {
                        const axisId = axis as JlptQuizDisplayView;
                        const isActive = axisTabHighlight === axisId;
                        return (
                            <Link
                                key={axis}
                                href={buildAxisHref(axisId)}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-100'
                                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                                }`}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </div>
            )}
            <p className='mt-2 max-w-xl text-xs text-zinc-500 dark:text-zinc-400'>
                암기·미암기 단어를 고른 뒤 위에서 축을 골라 주세요. 전체
                암기·전체 미암기는 세 축 집계 기준, 그 외는 해당 축만(암기는
                순수 한 축, 미암기는 그 축이 미암기인 단어)입니다.
            </p>

            <form
                className='mt-4 flex flex-wrap items-end gap-2'
                method='get'
                action={`/jlpt-wordbook/${id}`}
            >
                {memorizedFilter !== 'all' && (
                    <input
                        type='hidden'
                        name='memorized'
                        value={memorizedFilter}
                    />
                )}
                {(memorizedFilter === 'yes' || memorizedFilter === 'no') &&
                    axisDisplay !== 'full' && (
                        <input type='hidden' name='axis' value={axisDisplay} />
                    )}
                <label className='flex flex-col gap-1'>
                    <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>
                        검색
                    </span>
                    <input
                        type='search'
                        name='q'
                        defaultValue={query}
                        placeholder='단어, 뜻, 히라가나 검색'
                        className='w-72 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
                    />
                </label>
                <button
                    type='submit'
                    className='rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500'
                >
                    검색
                </button>
                {query && (
                    <Link
                        href={hrefSearchResetBase()}
                        className='rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    >
                        초기화
                    </Link>
                )}
            </form>

            {words.length === 0 ? (
                <div className='mt-6 rounded-xl border-2 border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-600 dark:text-zinc-400'>
                    아직 단어가 없습니다. 위에서 단어를 추가해 보세요.
                </div>
            ) : (
                <>
                    <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                        {pageCards.map(({ row, kanjiLines }) => (
                            <div
                                key={`${row.no}-${row.word}`}
                                className='rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50'
                            >
                                <div className='flex items-start justify-between gap-3'>
                                    <div>
                                        <p className='text-2xl font-bold text-zinc-900 dark:text-zinc-100'>
                                            {row.word}
                                        </p>
                                        <p className='mt-1 text-base text-zinc-700 dark:text-zinc-200'>
                                            뜻: {row.meaning}
                                        </p>
                                        <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-300'>
                                            히라가나: {row.hiragana || '-'}
                                        </p>
                                        {kanjiLines.length > 0 && (
                                            <div className='mt-1 flex gap-2 text-sm text-zinc-800 dark:text-zinc-200'>
                                                <span className='shrink-0 text-zinc-500 dark:text-zinc-400'>
                                                    한자:
                                                </span>
                                                <div className='min-w-0 space-y-0.5'>
                                                    {kanjiLines.map((k: JlptWordKanjiLine) => {
                                                        const lineText =
                                                            k.found && k.level
                                                                ? k.meaningShort
                                                                    ? `${k.char} ${k.meaningShort}(${k.level})`
                                                                    : `${k.char}(${k.level})`
                                                                : `${k.char} 조회 X`;
                                                        const lineClass =
                                                            'break-words rounded px-1.5 py-0.5 leading-snug transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/60';
                                                        return k.detailHref ? (
                                                            <Link
                                                                key={k.char}
                                                                href={k.detailHref}
                                                                className={`block cursor-pointer ${lineClass}`}
                                                            >
                                                                {lineText}
                                                            </Link>
                                                        ) : (
                                                            <p
                                                                key={k.char}
                                                                className={`cursor-default ${lineClass}`}
                                                            >
                                                                {lineText}
                                                            </p>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className='flex shrink-0 flex-col items-end gap-1 text-right'>
                                        {row.memorized === 'yes' && (
                                            <span className='rounded bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'>
                                                세 모드 완전 암기
                                            </span>
                                        )}
                                        <span
                                            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                                row.memorized_word === 'yes'
                                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                                            }`}
                                        >
                                            단어보기{' '}
                                            {row.memorized_word === 'yes'
                                                ? '암기'
                                                : '미암기'}
                                        </span>
                                        <span
                                            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                                row.memorized_meaning === 'yes'
                                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                                            }`}
                                        >
                                            뜻보기{' '}
                                            {row.memorized_meaning === 'yes'
                                                ? '암기'
                                                : '미암기'}
                                        </span>
                                        <span
                                            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                                row.memorized_hiragana === 'yes'
                                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                                            }`}
                                        >
                                            히라가나{' '}
                                            {row.memorized_hiragana === 'yes'
                                                ? '암기'
                                                : '미암기'}
                                        </span>
                                    </div>
                                </div>

                                <div className='mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                    <p>
                                        단어보기 암기일:{' '}
                                        {row.memorized_word_at || '-'} · 뜻보기:{' '}
                                        {row.memorized_meaning_at || '-'} ·
                                        히라가나:{' '}
                                        {row.memorized_hiragana_at || '-'}
                                    </p>
                                    <p>
                                        완전 암기일(세 모드 충족 시):{' '}
                                        {row.memorized_at || '-'}
                                    </p>
                                    <p>추가한 날짜: {row.created_at || '-'}</p>
                                </div>

                                <div className='mt-3'>
                                    <JlptWordRowActions
                                        wordbookId={id}
                                        row={row}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <nav
                            className='mt-6 flex flex-wrap items-center justify-center gap-2'
                            aria-label='페이지 이동'
                        >
                            {currentPage > 1 && (
                                <Link
                                    href={buildPageHref(currentPage - 1)}
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
                                            href={buildPageHref(p)}
                                            className='flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-zinc-300 text-sm font-semibold tabular-nums text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800'
                                        >
                                            {p}
                                        </Link>
                                    ),
                                )}
                            </span>
                            {currentPage < totalPages && (
                                <Link
                                    href={buildPageHref(
                                        Math.min(
                                            currentPage + PAGE_GROUP,
                                            totalPages,
                                        ),
                                    )}
                                    className='rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                >
                                    다음
                                </Link>
                            )}
                        </nav>
                    )}
                </>
            )}
        </div>
    );
}
