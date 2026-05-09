'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
    currentDate: string;
    level: string;
    searchQuery: string;
    memorized: string;
};

function buildDateUrl(date: string, level: string, searchQuery: string, memorized: string): string {
    const params = new URLSearchParams();
    if (level !== 'all') params.set('level', level);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (memorized !== 'all') params.set('memorized', memorized);
    if (date.trim()) params.set('date', date.trim());
    const s = params.toString();
    return s ? `/vocabulary?${s}` : '/vocabulary';
}

export function VocabularyDateFilter({
    currentDate,
    level,
    searchQuery,
    memorized,
}: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [open]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value) {
            router.push(buildDateUrl(value, level, searchQuery, memorized));
            setOpen(false);
        }
    };

    const handleClear = () => {
        router.push(buildDateUrl('', level, searchQuery, memorized));
        setOpen(false);
    };

    return (
        <div className='relative flex items-center' ref={ref}>
            <button
                type='button'
                onClick={() => setOpen((o) => !o)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    currentDate
                        ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
            >
                날짜 {currentDate ? `(${currentDate})` : ''}
            </button>
            {open && (
                <div className='absolute left-0 top-full z-20 mt-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800'>
                    <label className='mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400'>
                        추가일 선택
                    </label>
                    <input
                        type='date'
                        defaultValue={currentDate || undefined}
                        onChange={handleDateChange}
                        className='mb-3 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100'
                    />
                    {currentDate && (
                        <button
                            type='button'
                            onClick={handleClear}
                            className='w-full rounded-lg border border-zinc-200 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700'
                        >
                            날짜 해제
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
